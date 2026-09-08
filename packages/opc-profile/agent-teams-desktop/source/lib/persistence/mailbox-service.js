/** Durable two-phase mailbox delivery built on an append-only journal. */
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sanitizeKey } from "../state.js";
const JOURNAL_FILE = 'mailbox-events.jsonl';
const DEFAULT_LEASE_MS = 60_000;
const locks = new Map();
function isMissing(error) {
    return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
function validTime(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
function validMessage(value) {
    if (value === null || typeof value !== 'object')
        return false;
    const message = value;
    return typeof message.id === 'string' && message.id.length > 0
        && typeof message.from === 'string' && typeof message.to === 'string'
        && typeof message.content === 'string' && message.content.length > 0
        && validTime(message.ts);
}
function assertMessage(message) {
    if (!validMessage(message))
        throw new Error('mailbox message is invalid');
}
function assertIdentity(teamId, agentKey) {
    if (teamId.trim() === '' || agentKey.trim() === '')
        throw new Error('mailbox teamId and agentKey are required');
}
async function appendAndSync(file, content) {
    const handle = await open(file, 'a');
    try {
        await handle.writeFile(content, 'utf8');
        await handle.sync();
    }
    finally {
        await handle.close();
    }
}
async function writeAtomic(file, content) {
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
    try {
        await rename(temporary, file);
    }
    catch (error) {
        await rm(temporary, { force: true }).catch(() => undefined);
        throw error;
    }
}
function eventError(teamId, line, detail) {
    return new Error(`Mailbox journal for "${teamId}" is invalid at line ${line}: ${detail}`);
}
function parseEvent(value, teamId, line) {
    if (value === null || typeof value !== 'object')
        throw eventError(teamId, line, 'event must be an object');
    const candidate = value;
    const types = ['message.queued', 'message.delivery.claimed', 'message.delivered', 'message.delivery.released'];
    if (candidate.schemaVersion !== 1 || candidate.teamId !== teamId
        || typeof candidate.eventId !== 'string' || candidate.eventId === ''
        || typeof candidate.agentKey !== 'string' || candidate.agentKey.trim() === ''
        || !Number.isSafeInteger(candidate.sequence) || candidate.sequence < 1
        || !types.includes(candidate.type)
        || typeof candidate.messageId !== 'string' || candidate.messageId === ''
        || !validTime(candidate.timestamp)) {
        throw eventError(teamId, line, 'event envelope is invalid');
    }
    if (candidate.type === 'message.queued')
        assertMessage(candidate.message);
    return Object.freeze({
        schemaVersion: 1,
        eventId: candidate.eventId,
        teamId,
        agentKey: candidate.agentKey,
        sequence: candidate.sequence,
        type: candidate.type,
        messageId: candidate.messageId,
        timestamp: candidate.timestamp,
        ...(candidate.message === undefined ? {} : { message: candidate.message }),
    });
}
/** Remove runtime delivery fields which only exist in the legacy inbox projection. */
function sourceMessage(message) {
    const { deliveryClaimedAt: _claimed, deliveredAt: _delivered, readAt: _read, ...source } = message;
    return source;
}
function sameSourceMessage(left, right) {
    const a = sourceMessage(left);
    const b = sourceMessage(right);
    return a.id === b.id
        && a.from === b.from
        && a.to === b.to
        && a.content === b.content
        && a.ts === b.ts;
}
async function readLegacyMailbox(stateRoot, teamId, agentKey, onMalformedLine) {
    const path = join(stateRoot, teamId, 'inbox', `${sanitizeKey(agentKey)}.jsonl`);
    let raw;
    try {
        raw = await readFile(path, 'utf8');
    }
    catch (error) {
        if (isMissing(error))
            return [];
        throw error;
    }
    const messages = new Map();
    for (const [index, rawLine] of raw.split('\n').entries()) {
        const line = rawLine.replace(/^\uFEFF/u, '');
        if (line.trim() === '')
            continue;
        let message;
        try {
            message = JSON.parse(line);
        }
        catch (error) {
            onMalformedLine?.(index + 1, error);
            continue;
        }
        if (!validMessage(message)) {
            onMalformedLine?.(index + 1, new Error('legacy inbox message is invalid'));
            continue;
        }
        const source = sourceMessage(message);
        const deliveredAt = message.deliveredAt ?? message.readAt;
        const claimedAt = deliveredAt === undefined ? message.deliveryClaimedAt : undefined;
        const existing = messages.get(source.id);
        if (existing !== undefined && !sameSourceMessage(existing.message, source)) {
            throw eventError(teamId, index + 1, 'legacy inbox messageId payload conflict');
        }
        messages.set(source.id, { message: source, ...(claimedAt === undefined ? {} : { claimedAt }), ...(deliveredAt === undefined ? {} : { deliveredAt }) });
    }
    return [...messages.values()];
}
async function readJournal(stateRoot, teamId, agentKey) {
    let raw;
    try {
        raw = await readFile(join(stateRoot, teamId, JOURNAL_FILE), 'utf8');
    }
    catch (error) {
        if (isMissing(error))
            return { allEvents: [], events: [], records: new Map() };
        throw error;
    }
    const allEvents = [];
    const events = [];
    const records = new Map();
    let expectedSequence = 1;
    for (const [index, rawLine] of raw.split('\n').entries()) {
        if (rawLine.trim() === '')
            continue;
        let event;
        try {
            event = parseEvent(JSON.parse(rawLine), teamId, index + 1);
        }
        catch (error) {
            throw error instanceof Error ? error : eventError(teamId, index + 1, String(error));
        }
        if (event.sequence !== expectedSequence)
            throw eventError(teamId, index + 1, `sequence must be ${expectedSequence}`);
        expectedSequence += 1;
        allEvents.push(event);
        if (event.agentKey !== agentKey)
            continue;
        const current = records.get(event.messageId);
        if (event.type === 'message.queued') {
            if (current !== undefined) {
                if (JSON.stringify(current.message) !== JSON.stringify(event.message))
                    throw eventError(teamId, index + 1, 'messageId payload conflict');
                continue;
            }
            records.set(event.messageId, { message: event.message, status: 'queued' });
        }
        else if (current === undefined) {
            throw eventError(teamId, index + 1, `${event.type} references unknown message`);
        }
        else if (event.type === 'message.delivery.claimed') {
            if (current.status === 'delivered')
                continue;
            records.set(event.messageId, { ...current, status: 'claimed', claimedAt: event.timestamp });
        }
        else if (event.type === 'message.delivered') {
            if (current.status === 'delivered')
                continue;
            if (current.status !== 'claimed')
                throw eventError(teamId, index + 1, 'message must be claimed before delivered');
            records.set(event.messageId, { ...current, status: 'delivered', deliveredAt: event.timestamp });
        }
        else if (event.type === 'message.delivery.released') {
            if (current.status === 'delivered')
                continue;
            records.set(event.messageId, { message: current.message, status: 'queued' });
        }
        events.push(event);
    }
    return { allEvents, events, records };
}
function messageForProjection(record) {
    const message = record.message;
    if (record.status === 'delivered') {
        const deliveredAt = record.deliveredAt ?? message.deliveredAt ?? Date.now();
        return { ...message, deliveredAt, readAt: message.readAt ?? deliveredAt };
    }
    if (record.status === 'claimed')
        return { ...message, deliveryClaimedAt: record.claimedAt };
    const { deliveryClaimedAt: _claimed, ...queued } = message;
    return queued;
}
export class MailboxService {
    stateRoot;
    options;
    #leaseMs;
    constructor(stateRoot, options = {}) {
        this.stateRoot = stateRoot;
        this.options = options;
        this.#leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
        if (!Number.isSafeInteger(this.#leaseMs) || this.#leaseMs < 0)
            throw new Error('mailbox leaseMs must be a non-negative safe integer');
    }
    async queue(teamId, agentKey, message) {
        assertIdentity(teamId, agentKey);
        assertMessage(message);
        return this.withLock(teamId, agentKey, async () => {
            const data = await this.load(teamId, agentKey);
            const existing = data.records.get(message.id);
            if (existing !== undefined) {
                if (!sameSourceMessage(existing.message, message))
                    throw new Error(`mailbox messageId "${message.id}" payload conflict`);
                await this.project(teamId, agentKey, data.events);
                return existing;
            }
            const event = this.event(data.allEvents.length + 1, teamId, agentKey, 'message.queued', message.id, message);
            await this.appendEvent(teamId, event);
            await this.project(teamId, agentKey, [...data.events, event]);
            return { message, status: 'queued' };
        });
    }
    async pending(teamId, agentKey, options = {}) {
        assertIdentity(teamId, agentKey);
        const now = options.now ?? Date.now();
        return this.withLock(teamId, agentKey, async () => {
            const data = await this.load(teamId, agentKey);
            await this.project(teamId, agentKey, data.events);
            return [...data.records.values()].filter(record => record.status === 'queued'
                || (record.status === 'claimed' && now - (record.claimedAt ?? now) >= this.#leaseMs));
        });
    }
    /** Return the complete durable mailbox in delivery order for legacy readers. */
    async all(teamId, agentKey) {
        assertIdentity(teamId, agentKey);
        return this.withLock(teamId, agentKey, async () => {
            const data = await this.load(teamId, agentKey);
            await this.project(teamId, agentKey, data.events);
            return [...data.records.values()];
        });
    }
    async claim(teamId, agentKey, messageIds, options = {}) {
        assertIdentity(teamId, agentKey);
        const now = options.now ?? Date.now();
        return this.withLock(teamId, agentKey, async () => {
            const data = await this.load(teamId, agentKey);
            const events = [...data.events];
            let sequence = data.allEvents.length + 1;
            const result = [];
            for (const messageId of new Set(messageIds)) {
                const current = data.records.get(messageId);
                if (current === undefined)
                    continue;
                if (current.status === 'delivered') {
                    result.push(current);
                    continue;
                }
                if (current.status === 'claimed' && now - (current.claimedAt ?? now) < this.#leaseMs) {
                    result.push(current);
                    continue;
                }
                const event = this.event(sequence++, teamId, agentKey, 'message.delivery.claimed', messageId, undefined, now);
                await this.appendEvent(teamId, event);
                events.push(event);
                result.push({ message: current.message, status: 'claimed', claimedAt: now });
            }
            if (events.length !== data.events.length)
                await this.project(teamId, agentKey, events);
            return result;
        });
    }
    async markDelivered(teamId, agentKey, messageIds, options = {}) {
        assertIdentity(teamId, agentKey);
        const now = options.now ?? Date.now();
        return this.withLock(teamId, agentKey, async () => {
            const data = await this.load(teamId, agentKey);
            const events = [...data.events];
            let sequence = data.allEvents.length + 1;
            const result = [];
            for (const messageId of new Set(messageIds)) {
                const current = data.records.get(messageId);
                if (current === undefined)
                    throw new Error(`mailbox message "${messageId}" not found or queued`);
                if (current.status === 'delivered') {
                    result.push(current);
                    continue;
                }
                if (current.status !== 'claimed')
                    throw new Error(`mailbox message "${messageId}" must be claimed before delivered`);
                const event = this.event(sequence++, teamId, agentKey, 'message.delivered', messageId, undefined, now);
                await this.appendEvent(teamId, event);
                events.push(event);
                result.push({ ...current, status: 'delivered', deliveredAt: now });
            }
            if (events.length !== data.events.length)
                await this.project(teamId, agentKey, events);
            return result;
        });
    }
    async release(teamId, agentKey, messageIds, options = {}) {
        assertIdentity(teamId, agentKey);
        const now = options.now ?? Date.now();
        return this.withLock(teamId, agentKey, async () => {
            const data = await this.load(teamId, agentKey);
            const events = [...data.events];
            let sequence = data.allEvents.length + 1;
            const result = [];
            for (const messageId of new Set(messageIds)) {
                const current = data.records.get(messageId);
                if (current === undefined || current.status === 'delivered')
                    continue;
                const event = this.event(sequence++, teamId, agentKey, 'message.delivery.released', messageId, undefined, now);
                await this.appendEvent(teamId, event);
                events.push(event);
                result.push({ message: current.message, status: 'queued' });
            }
            if (events.length !== data.events.length)
                await this.project(teamId, agentKey, events);
            return result;
        });
    }
    async recover(teamId, agentKey, options = {}) {
        const now = options.now ?? Date.now();
        const expired = (await this.pending(teamId, agentKey, { now }))
            .filter(record => record.status === 'claimed').map(record => record.message.id);
        return expired.length === 0 ? [] : this.release(teamId, agentKey, expired, { now });
    }
    /**
     * Convert only the requested legacy inbox projection into durable events.
     * A Team uses one globally sequenced journal, so each recipient is imported
     * lazily; message ids make this repeat-safe after a crash between events.
     */
    async load(teamId, agentKey) {
        let data = await readJournal(this.stateRoot, teamId, agentKey);
        const legacy = await readLegacyMailbox(this.stateRoot, teamId, agentKey, this.options.onMalformedLegacyLine);
        if (legacy.length === 0)
            return data;
        let sequence = data.allEvents.length + 1;
        for (const item of legacy) {
            const existing = data.records.get(item.message.id);
            if (existing !== undefined) {
                if (!sameSourceMessage(existing.message, item.message)) {
                    throw new Error(`mailbox messageId "${item.message.id}" payload conflict during legacy import`);
                }
                continue;
            }
            await this.appendEvent(teamId, this.event(sequence++, teamId, agentKey, 'message.queued', item.message.id, item.message, item.message.ts));
            if (item.claimedAt !== undefined || item.deliveredAt !== undefined) {
                const claimedAt = item.claimedAt ?? item.deliveredAt ?? item.message.ts;
                await this.appendEvent(teamId, this.event(sequence++, teamId, agentKey, 'message.delivery.claimed', item.message.id, undefined, claimedAt));
            }
            if (item.deliveredAt !== undefined) {
                await this.appendEvent(teamId, this.event(sequence++, teamId, agentKey, 'message.delivered', item.message.id, undefined, item.deliveredAt));
            }
        }
        data = await readJournal(this.stateRoot, teamId, agentKey);
        return data;
    }
    event(sequence, teamId, agentKey, type, messageId, message, timestamp = Date.now()) {
        return Object.freeze({ schemaVersion: 1, eventId: randomUUID(), teamId, agentKey, sequence, type, messageId, timestamp, ...(message === undefined ? {} : { message }) });
    }
    async appendEvent(teamId, event) {
        const directory = join(this.stateRoot, teamId);
        await mkdir(directory, { recursive: true });
        await appendAndSync(join(directory, JOURNAL_FILE), `${JSON.stringify(event)}\n`);
    }
    async project(teamId, agentKey, events) {
        await this.options.beforeProjection?.();
        const records = new Map();
        for (const event of events) {
            const current = records.get(event.messageId);
            if (event.type === 'message.queued')
                records.set(event.messageId, { message: event.message, status: 'queued' });
            else if (current !== undefined && event.type === 'message.delivery.claimed')
                records.set(event.messageId, { ...current, status: 'claimed', claimedAt: event.timestamp });
            else if (current !== undefined && event.type === 'message.delivered')
                records.set(event.messageId, { ...current, status: 'delivered', deliveredAt: event.timestamp });
            else if (current !== undefined && event.type === 'message.delivery.released')
                records.set(event.messageId, { message: current.message, status: 'queued' });
        }
        const directory = join(this.stateRoot, teamId, 'inbox');
        await mkdir(directory, { recursive: true });
        const content = [...records.values()].map(messageForProjection).map(value => JSON.stringify(value)).join('\n');
        await writeAtomic(join(directory, `${sanitizeKey(agentKey)}.jsonl`), content === '' ? '' : `${content}\n`);
    }
    async withLock(teamId, _agentKey, operation) {
        const key = `${this.stateRoot}:${teamId}`;
        const previous = locks.get(key) ?? Promise.resolve();
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        const tail = previous.then(() => gate);
        locks.set(key, tail);
        await previous;
        try {
            return await operation();
        }
        finally {
            release();
            if (locks.get(key) === tail)
                locks.delete(key);
        }
    }
}
