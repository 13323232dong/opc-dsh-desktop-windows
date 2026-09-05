/**
 * Team state persistence and pure team-logic rules.
 *
 * State lives on disk under `<workspace>/<stateDir>/<teamId>/`:
 * - `team.json` — the durable {@link TeamState} record
 * - `inbox/<agentKey>.jsonl` — one JSONL mailbox per agent (`captain` or a
 *   member name), mirroring the Claude Code AgentTeams mailbox layout
 *
 * All mutations run through an in-process per-team queue so read-modify-write
 * stays serial; `fs/promises` is used directly because the plugin owns this
 * bookkeeping (host-plane state, like session persistence) and the abstract
 * `fs` service offers no directory deletion.
 * @module dsh-agent-teams/state
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TEAM_CHAT_MESSAGE_KINDS, isActiveTeamMember, } from "./types.js";
/** Mailbox key of the captain. */
export const CAPTAIN_KEY = 'captain';
/** A crashed live-delivery attempt becomes retryable after this interval. */
const MAILBOX_DELIVERY_LEASE_MS = 60_000;
/** Durable deny-list for AgentTeams members that must never be resumed. */
const RETIRED_MEMBERS_FILE = 'retired-members.json';
/** Append-only team-visible chat log. Mailboxes remain a separate delivery mechanism. */
const TEAM_CHAT_FILE = 'chat.jsonl';
/** Maximum UTF-16 code units accepted in one plain-text team message. */
export const TEAM_CHAT_CONTENT_MAX_LENGTH = 8_000;
/** Maximum chat page size exposed by state/HTTP readers. */
export const TEAM_CHAT_MAX_PAGE_LIMIT = 100;
/** In-process per-team mutation queues (promise chains). */
const locks = new Map();
/**
 * Serialize mutations of one team across the whole process.
 * @param key - the team id (or any mutation scope).
 * @param fn - the mutation to run exclusively.
 * @returns the mutation's result.
 */
export async function withTeamLock(key, fn) {
    const previous = locks.get(key) ?? Promise.resolve();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    locks.set(key, previous.then(() => gate));
    await previous;
    try {
        return await fn();
    }
    finally {
        release();
    }
}
/** Longest key emitted before truncating and appending a digest. */
const MAX_KEY_LENGTH = 48;
/** Short stable digest, used to keep otherwise-colliding keys distinct. */
function keyDigest(name) {
    return createHash('sha256').update(name).digest('hex').slice(0, 8);
}
/**
 * Fold a free-form name into a safe path/key segment.
 *
 * Unicode letters and digits survive, so CJK/Cyrillic/Greek names stay
 * distinct and readable; everything else — spaces, punctuation, path
 * separators, control characters — folds to `-`. An ASCII-only whitelist
 * mapped *every* non-Latin name onto one shared fallback, which silently
 * merged their mailboxes and rejected the second such member as a duplicate.
 *
 * A name with no letters or digits at all (pure emoji or punctuation) cannot
 * yield a readable key, so it gets a digest rather than a shared constant.
 * Over-long names are truncated with a digest appended, so names sharing a
 * long prefix stay distinct and the result stays within filesystem limits
 * (CJK costs 3 bytes per character in UTF-8).
 *
 * @param name - any user-supplied name.
 * @returns a non-empty key safe as a single path segment.
 */
export function sanitizeKey(name) {
    const cleaned = name.normalize('NFC').trim().toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    if (cleaned === '')
        return `k-${keyDigest(name)}`;
    const points = [...cleaned];
    if (points.length > MAX_KEY_LENGTH) {
        return `${points.slice(0, MAX_KEY_LENGTH).join('')}-${keyDigest(name)}`;
    }
    return cleaned;
}
/**
 * Whether `dependencies` are all satisfied (every named task exists and
 * completed) for the given task list.
 * @param tasks - the team's tasks.
 * @param dependencies - task ids the candidate depends on.
 * @returns the ids that are still unsatisfied, empty when claimable.
 */
export function unsatisfiedDependencies(tasks, dependencies) {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    return dependencies.filter((id) => byId.get(id)?.status !== 'completed');
}
/**
 * The allowed task status transitions, keyed by current status.
 * Terminal statuses have no outgoing transitions.
 */
export const TASK_TRANSITIONS = {
    pending: ['claimed', 'cancelled'],
    claimed: ['in_progress', 'failed', 'cancelled'],
    in_progress: ['completed', 'failed', 'cancelled'],
    completed: [],
    failed: [],
    cancelled: [],
};
/**
 * Validate one task status transition.
 * @param current - the task's current status.
 * @param next - the requested status.
 * @returns the transition error, or undefined when allowed.
 */
export function transitionError(current, next) {
    if (current === next)
        return undefined;
    if (!TASK_TRANSITIONS[current].includes(next)) {
        return `task status cannot move from "${current}" to "${next}"`;
    }
    return undefined;
}
/** Activate the task's current generation for one owner and return its capability id. */
export function activateTaskAttempt(task, assignee) {
    const attemptId = randomUUID();
    task.status = 'claimed';
    task.assignee = assignee;
    task.attemptId = attemptId;
    task.handoffId = undefined;
    task.reassigning = false;
    task.output = undefined;
    task.updatedAt = Date.now();
    return attemptId;
}
/** Start a fresh task generation for one owner. */
export function beginTaskAttempt(task, assignee) {
    task.attempt = (task.attempt ?? 0) + 1;
    task.startedAt = undefined;
    task.completedAt = undefined;
    return activateTaskAttempt(task, assignee);
}
/**
 * Revoke the current worker immediately. Clearing its capability makes old
 * updates stale; a separate handoff generation serializes async quiescence.
 */
export function invalidateTaskAttempt(task, nextAssignee, reassigning = false) {
    task.attemptId = undefined;
    task.handoffId = randomUUID();
    task.status = 'pending';
    task.assignee = nextAssignee;
    task.reassigning = reassigning;
    task.output = undefined;
    task.startedAt = undefined;
    task.completedAt = undefined;
    task.updatedAt = Date.now();
}
/**
 * Create the team directory structure and the initial team record.
 * @param stateRoot - resolved absolute state root directory.
 * @param state - the initial team record.
 */
export async function createTeamDir(stateRoot, state) {
    const dir = join(stateRoot, state.id);
    await mkdir(join(dir, 'inbox'), { recursive: true });
    await atomicWriteText(join(dir, 'team.json'), JSON.stringify(state, null, 2));
}
/**
 * Read one team record; `undefined` when absent.
 * @param stateRoot - resolved absolute state root directory.
 * @param teamId - the team's sanitized id.
 */
export async function readTeam(stateRoot, teamId) {
    try {
        const raw = await readFile(join(stateRoot, teamId, 'team.json'), 'utf8');
        const value = JSON.parse(stripLeadingBom(raw));
        if (!isTeamState(value, teamId)) {
            throw new Error(`invalid AgentTeams state in team "${teamId}"`);
        }
        return value;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }
}
/**
 * Synchronously read one team record while a continuable child is being
 * composed. Harness requires child setup contributions to be synchronous;
 * this narrow boundary lets a cold-resumed member restore its durable model
 * selection before its first request can be published.
 * @param stateRoot - resolved absolute state root directory.
 * @param teamId - the team's sanitized id.
 * @returns the team record, or `undefined` when absent.
 */
export function readTeamSync(stateRoot, teamId) {
    try {
        const raw = readFileSync(join(stateRoot, teamId, 'team.json'), 'utf8');
        const value = JSON.parse(stripLeadingBom(raw));
        if (!isTeamState(value, teamId)) {
            throw new Error(`invalid AgentTeams state in team "${teamId}"`);
        }
        return value;
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }
}
/**
 * Persist one team record (inside the caller's lock).
 * @param stateRoot - resolved absolute state root directory.
 * @param state - the record to persist.
 */
export async function writeTeam(stateRoot, state) {
    await atomicWriteText(join(stateRoot, state.id, 'team.json'), JSON.stringify(state, null, 2));
}
/** Read the durable set of member session ids retired by remove/delete. */
export async function readRetiredMemberIds(stateRoot) {
    try {
        const parsed = JSON.parse(stripLeadingBom(await readFile(join(stateRoot, RETIRED_MEMBERS_FILE), 'utf8')));
        if (!Array.isArray(parsed) || parsed.some(value => typeof value !== 'string' || value === '')) {
            throw new Error('invalid AgentTeams retired member index');
        }
        return new Set(parsed);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return new Set();
        }
        throw error;
    }
}
/** Atomically add session ids to the durable retired-member deny-list. */
export async function recordRetiredMemberIds(stateRoot, memberIds) {
    const additions = memberIds.filter(id => id !== '');
    if (additions.length === 0)
        return;
    await withTeamLock(`retired-members:${stateRoot}`, async () => {
        const retired = await readRetiredMemberIds(stateRoot);
        for (const id of additions)
            retired.add(id);
        await mkdir(stateRoot, { recursive: true });
        await atomicWriteText(join(stateRoot, RETIRED_MEMBERS_FILE), `${JSON.stringify([...retired].sort(), null, 2)}\n`);
    });
}
/**
 * Find the team owned by one captain session (at most one per captain).
 * @param stateRoot - resolved absolute state root directory.
 * @param captainSessionId - the owning session id.
 * @returns the team record, or undefined when the captain leads no team.
 */
export async function findTeamByCaptain(stateRoot, captainSessionId) {
    let entries;
    try {
        entries = await readdir(stateRoot, { withFileTypes: true });
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }
    let found;
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const team = await readTeam(stateRoot, entry.name);
        if (team?.captainSessionId === captainSessionId) {
            if (found !== undefined && found.id !== team.id) {
                throw new Error(`captain session leads multiple active teams ("${found.id}", "${team.id}"); archive one before continuing`);
            }
            found = team;
        }
    }
    return found;
}
/**
 * Find the team in which one session is an active participant.
 * Captains match `captainSessionId`; members match their durable child session
 * id. Removed members no longer have access to team-scoped tools.
 * @param stateRoot - resolved absolute state root directory.
 * @param agentSessionId - calling captain/member session id.
 * @returns the team record, or undefined when the caller belongs to no team.
 */
export async function findTeamByParticipant(stateRoot, agentSessionId) {
    let entries;
    try {
        entries = await readdir(stateRoot, { withFileTypes: true });
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }
    let found;
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        const team = await readTeam(stateRoot, entry.name);
        const participates = team?.captainSessionId === agentSessionId
            || team?.members.some((member) => member.id === agentSessionId && isActiveTeamMember(member)) === true;
        if (participates && team !== undefined) {
            if (found !== undefined && found.id !== team.id) {
                throw new Error(`agent session belongs to multiple active teams ("${found.id}", "${team.id}"); the target team is ambiguous`);
            }
            found = team;
        }
    }
    return found;
}
/** Build a fresh message record. */
export function createMessage(from, to, content) {
    return { id: randomUUID(), from, to, content, ts: Date.now() };
}
const CHAT_IDENTITY_MAX_LENGTH = 128;
const CHAT_ID_MAX_LENGTH = 256;
const CHAT_MAX_MENTIONS = 16;
const CHAT_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const CHAT_SENSITIVE_CONTENT = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/iu,
    /\bsk-[A-Za-z0-9_-]{20,}\b/u,
    /\b(?:api[_-]?key|access[_-]?token|authorization)\s*[:=]\s*(?:bearer\s+)?[A-Za-z0-9_./+=-]{16,}/iu,
    /(?:^|\n)\s*(?:system[_ -]?prompt|chain[_ -]?of[_ -]?thought|hidden[_ -]?reasoning)\s*[:=]/iu,
];
function validChatIdentifier(value, maximum = CHAT_ID_MAX_LENGTH) {
    return typeof value === 'string'
        && value.length > 0
        && value.length <= maximum
        && value.trim() === value
        && !CHAT_CONTROL_CHARACTERS.test(value);
}
function chatValidationError(value) {
    if (!isRecord(value))
        return 'chat message must be an object';
    const allowed = new Set([
        'id', 'seq', 'teamId', 'from', 'to', 'content', 'ts', 'taskId', 'mentions',
        'replyTo', 'kind', 'tokenUsage',
    ]);
    if (Object.keys(value).some(key => !allowed.has(key)))
        return 'chat message contains unknown fields';
    if (!validChatIdentifier(value['id']))
        return 'chat message id is invalid';
    if (!Number.isSafeInteger(value['seq']) || value['seq'] < 1) {
        return 'chat message sequence must be a positive safe integer';
    }
    if (!validChatIdentifier(value['teamId'], CHAT_IDENTITY_MAX_LENGTH))
        return 'chat message teamId is invalid';
    if (!validChatIdentifier(value['from'], CHAT_IDENTITY_MAX_LENGTH))
        return 'chat message from identity is invalid';
    if (!validChatIdentifier(value['to'], CHAT_IDENTITY_MAX_LENGTH))
        return 'chat message to identity is invalid';
    if (typeof value['content'] !== 'string'
        || value['content'].trim() === ''
        || value['content'].length > TEAM_CHAT_CONTENT_MAX_LENGTH
        || CHAT_CONTROL_CHARACTERS.test(value['content'])) {
        return `chat message content must be non-empty plain text of at most ${TEAM_CHAT_CONTENT_MAX_LENGTH} characters`;
    }
    if (CHAT_SENSITIVE_CONTENT.some(pattern => pattern.test(value['content']))) {
        return 'chat message content appears to contain sensitive prompt, reasoning, or secret material';
    }
    if (!Number.isSafeInteger(value['ts']) || value['ts'] < 0)
        return 'chat message timestamp is invalid';
    if (value['taskId'] !== undefined && !validChatIdentifier(value['taskId']))
        return 'chat message taskId is invalid';
    if (value['replyTo'] !== undefined && !validChatIdentifier(value['replyTo']))
        return 'chat message replyTo is invalid';
    if (!TEAM_CHAT_MESSAGE_KINDS.includes(value['kind']))
        return 'chat message kind is invalid';
    if (value['mentions'] !== undefined) {
        if (!Array.isArray(value['mentions'])
            || value['mentions'].length > CHAT_MAX_MENTIONS
            || value['mentions'].some(mention => !validChatIdentifier(mention, CHAT_IDENTITY_MAX_LENGTH))
            || new Set(value['mentions']).size !== value['mentions'].length) {
            return `chat message mentions must contain at most ${CHAT_MAX_MENTIONS} unique identities`;
        }
    }
    if (value['tokenUsage'] !== undefined) {
        if (!isRecord(value['tokenUsage'])
            || Object.keys(value['tokenUsage']).some(key => key !== 'totalTokens')
            || !Number.isSafeInteger(value['tokenUsage']['totalTokens'])
            || value['tokenUsage']['totalTokens'] < 0) {
            return 'chat message tokenUsage must contain one non-negative totalTokens integer';
        }
    }
    return undefined;
}
/** Create and freeze one strictly validated plain-text chat record. */
export function createTeamChatMessage(input) {
    const value = {
        id: input.id ?? randomUUID(),
        seq: input.seq,
        teamId: input.teamId,
        from: input.from,
        to: input.to,
        content: input.content,
        ts: input.ts ?? Date.now(),
        ...(input.taskId === undefined ? {} : { taskId: input.taskId }),
        ...(input.mentions === undefined ? {} : { mentions: Object.freeze([...input.mentions]) }),
        ...(input.replyTo === undefined ? {} : { replyTo: input.replyTo }),
        kind: input.kind ?? 'message',
        ...(input.tokenUsage === undefined
            ? {}
            : { tokenUsage: Object.freeze({ totalTokens: input.tokenUsage.totalTokens }) }),
    };
    const error = chatValidationError(value);
    if (error !== undefined)
        throw new Error(error);
    return Object.freeze(value);
}
/** Read the append-only team chat, oldest first; malformed records are skipped. */
export async function readTeamChat(stateRoot, teamId, onMalformedLine) {
    let raw;
    try {
        raw = await readFile(join(stateRoot, teamId, TEAM_CHAT_FILE), 'utf8');
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
            return [];
        throw error;
    }
    const messages = [];
    let previousSequence = 0;
    for (const [index, rawLine] of raw.split('\n').entries()) {
        const line = index === 0 ? stripLeadingBom(rawLine) : rawLine;
        if (line.trim() === '')
            continue;
        try {
            const value = JSON.parse(line);
            if (chatValidationError(value) !== undefined
                || value.teamId !== teamId
                || value.seq <= previousSequence) {
                onMalformedLine?.(index + 1);
                continue;
            }
            const message = createTeamChatMessage(value);
            messages.push(message);
            previousSequence = message.seq;
        }
        catch {
            onMalformedLine?.(index + 1);
        }
    }
    return messages;
}
/** Append exactly the next immutable chat record. Callers serialize with the team lock. */
export async function appendTeamChat(stateRoot, teamId, message) {
    const error = chatValidationError(message);
    if (error !== undefined)
        throw new Error(error);
    if (message.teamId !== teamId)
        throw new Error('chat message teamId does not match its log');
    const current = await readTeamChat(stateRoot, teamId);
    const expectedSequence = (current.at(-1)?.seq ?? 0) + 1;
    if (message.seq !== expectedSequence) {
        throw new Error(`chat message sequence must be ${expectedSequence}, received ${message.seq}`);
    }
    await writeFile(join(stateRoot, teamId, TEAM_CHAT_FILE), `${JSON.stringify(message)}\n`, {
        encoding: 'utf8', flag: 'a',
    });
}
/** Read messages strictly after `cursor`, in ascending sequence order. */
export async function readTeamChatPage(stateRoot, teamId, options) {
    if (!Number.isSafeInteger(options.cursor) || options.cursor < 0)
        throw new Error('chat cursor is invalid');
    if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > TEAM_CHAT_MAX_PAGE_LIMIT) {
        throw new Error(`chat limit must be between 1 and ${TEAM_CHAT_MAX_PAGE_LIMIT}`);
    }
    const all = await readTeamChat(stateRoot, teamId);
    const remaining = all.filter(message => message.seq > options.cursor);
    const messages = remaining.slice(0, options.limit);
    const nextCursor = messages.at(-1)?.seq ?? options.cursor;
    return Object.freeze({
        messages: Object.freeze(messages),
        messageCount: all.length,
        chatCursor: String(all.at(-1)?.seq ?? 0),
        nextCursor: String(nextCursor),
        hasMore: remaining.length > messages.length,
    });
}
/**
 * Append one message to an agent's mailbox (JSONL).
 * @param stateRoot - resolved absolute state root directory.
 * @param teamId - the team id.
 * @param agentKey - `captain` or a member name.
 * @param message - the message to append.
 */
export async function appendMailbox(stateRoot, teamId, agentKey, message) {
    const { MailboxService } = await import("./persistence/mailbox-service.js");
    await new MailboxService(stateRoot).queue(teamId, agentKey, message);
}
/**
 * Read one agent's whole mailbox, oldest first.
 * @param stateRoot - resolved absolute state root directory.
 * @param teamId - the team id.
 * @param agentKey - `captain` or a member name.
 * @param onMalformedLine - optional diagnostic hook; malformed records are
 * skipped so one manually damaged line cannot make the whole team unreadable.
 * @returns the messages, empty when the mailbox does not exist yet.
 */
export async function readMailbox(stateRoot, teamId, agentKey, onMalformedLine) {
    const { MailboxService } = await import("./persistence/mailbox-service.js");
    return (await new MailboxService(stateRoot, { onMalformedLegacyLine: onMalformedLine }).all(teamId, agentKey)).map(record => {
        const message = record.message;
        if (record.status === 'delivered') {
            const deliveredAt = record.deliveredAt ?? message.deliveredAt ?? Date.now();
            return { ...message, deliveredAt, readAt: message.readAt ?? deliveredAt };
        }
        if (record.status === 'claimed')
            return { ...message, deliveryClaimedAt: record.claimedAt };
        const { deliveryClaimedAt: _claimed, ...queued } = message;
        return queued;
    });
}
/** Read only messages that have not been acknowledged by their recipient. */
export async function readUnreadMailbox(stateRoot, teamId, agentKey, onMalformedLine) {
    const { MailboxService } = await import("./persistence/mailbox-service.js");
    return (await new MailboxService(stateRoot, {
        leaseMs: MAILBOX_DELIVERY_LEASE_MS,
        onMalformedLegacyLine: onMalformedLine,
    }).pending(teamId, agentKey))
        .map(record => record.message);
}
/** Lease selected fallback messages to one delivery path. */
export async function claimMailboxDelivery(stateRoot, teamId, agentKey, messageIds) {
    const { MailboxService } = await import("./persistence/mailbox-service.js");
    await new MailboxService(stateRoot, { leaseMs: MAILBOX_DELIVERY_LEASE_MS }).claim(teamId, agentKey, messageIds);
}
/** Release a failed delivery lease so the scheduler can retry it later. */
export async function releaseMailboxDelivery(stateRoot, teamId, agentKey, messageIds) {
    const { MailboxService } = await import("./persistence/mailbox-service.js");
    await new MailboxService(stateRoot, { leaseMs: MAILBOX_DELIVERY_LEASE_MS }).release(teamId, agentKey, messageIds);
}
/**
 * Mark selected durable mailbox records delivered/read while preserving
 * malformed lines for diagnostics. Callers serialize this with the team lock.
 */
export async function acknowledgeMailbox(stateRoot, teamId, agentKey, messageIds) {
    const { MailboxService } = await import("./persistence/mailbox-service.js");
    const service = new MailboxService(stateRoot, { leaseMs: MAILBOX_DELIVERY_LEASE_MS });
    const known = new Set((await service.all(teamId, agentKey)).map(record => record.message.id));
    const selected = messageIds.filter(messageId => known.has(messageId));
    if (selected.length === 0)
        return;
    await service.claim(teamId, agentKey, selected);
    await service.markDelivered(teamId, agentKey, selected);
}
/** Remove the optional UTF-8 BOM some editors prepend to JSON text. */
function stripLeadingBom(value) {
    return value.charCodeAt(0) === 0xFEFF ? value.slice(1) : value;
}
/** Rename attempts before falling back to a direct overwrite. */
const ATOMIC_RENAME_RETRIES = 3;
/** Pause between rename attempts, giving a briefly-locking owner time to finish. */
const ATOMIC_RENAME_RETRY_DELAY_MS = 50;
/**
 * Rename error codes worth retrying before the direct-write fallback. On
 * Windows, replacing an existing file whose target is momentarily held open
 * without FILE_SHARE_DELETE surfaces as EPERM (or EACCES/EBUSY variants);
 * EEXIST/ENOTEMPTY cover other "target busy" edge shapes.
 */
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EACCES', 'EBUSY', 'EEXIST', 'ENOTEMPTY']);
function isRetryableRenameError(error) {
    return error instanceof Error
        && 'code' in error
        && RETRYABLE_RENAME_CODES.has(error.code ?? '');
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Replace `file` with `content`, preferring an atomic same-directory rename of
 * an already-written temp file.
 *
 * On Windows, `rename(tmp, file)` over an existing target throws EPERM while
 * any other process keeps the target open without FILE_SHARE_DELETE (editors,
 * indexers, antivirus scans, preview panes). By that point the payload has
 * already been fully written to the temp file, so a direct overwrite of the
 * target is a content-equivalent degraded path: retry the rename a few times
 * (transient locks clear quickly), then write the target in place. Every path
 * removes the temp file; when both the atomic rename and the direct write
 * fail, the combined error surfaces as an {@link AggregateError}.
 *
 * @returns nothing once the file has been replaced by one of the two paths.
 */
export async function replaceFileAtomicOrDirect(temporary, file, content, primitives, options = {}) {
    const retries = options.retries ?? ATOMIC_RENAME_RETRIES;
    const retryDelayMs = options.retryDelayMs ?? ATOMIC_RENAME_RETRY_DELAY_MS;
    for (let attempt = 0;; attempt += 1) {
        try {
            await primitives.rename(temporary, file);
            return;
        }
        catch (error) {
            if (isRetryableRenameError(error) && attempt < retries) {
                await sleep(retryDelayMs);
                continue;
            }
            let fallbackError;
            try {
                await primitives.writeFile(file, content);
            }
            catch (writeError) {
                fallbackError = writeError;
            }
            await primitives.remove(temporary).catch(() => undefined);
            if (fallbackError !== undefined) {
                throw new AggregateError([error, fallbackError], `failed to replace "${file}" atomically (${String(error)}) or by direct write (${String(fallbackError)})`);
            }
            return;
        }
    }
}
/**
 * Atomically replace one UTF-8 state file from a same-directory temp file,
 * degrading to a direct overwrite when the atomic rename cannot proceed
 * (see {@link replaceFileAtomicOrDirect} for the Windows EPERM rationale).
 */
async function atomicWriteText(file, content) {
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
    }
    catch (error) {
        await rm(temporary, { force: true }).catch(() => undefined);
        throw error;
    }
    await replaceFileAtomicOrDirect(temporary, file, content, {
        rename: (from, to) => rename(from, to),
        writeFile: (target, payload) => writeFile(target, payload, 'utf8'),
        remove: (path) => rm(path, { force: true }),
    });
}
/** Whether a parsed JSON value is a plain record. */
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Whether a value is an optional string. */
function isOptionalString(value) {
    return value === undefined || typeof value === 'string';
}
/** Whether a value is a finite timestamp/counter number. */
function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
/** Validate one member record at the durable JSON boundary. */
function isTeamMember(value) {
    if (!isRecord(value))
        return false;
    return typeof value['id'] === 'string'
        && typeof value['name'] === 'string'
        && value['name'].trim() !== ''
        && isOptionalString(value['role'])
        && isOptionalString(value['provider'])
        && isOptionalString(value['model'])
        && isOptionalString(value['reasoningEffort'])
        && isOptionalString(value['agentId'])
        && (value['agentVersion'] === undefined || (Number.isSafeInteger(value['agentVersion']) && value['agentVersion'] > 0))
        && isOptionalString(value['soulId'])
        && isOptionalString(value['selectionReason'])
        && isOptionalString(value['createdFromTaskId'])
        && isOptionalString(value['soulMarkdown'])
        && isOptionalString(value['soulSummary'])
        && isFiniteNumber(value['joinedAt'])
        && (value['activatedAt'] === undefined || isFiniteNumber(value['activatedAt']))
        && (value['failedAt'] === undefined || isFiniteNumber(value['failedAt']))
        && isOptionalString(value['failureReason'])
        && (value['status'] === 'provisioning' || value['status'] === 'idle' || value['status'] === 'working'
            || value['status'] === 'failed' || value['status'] === 'removed');
}
/** Validate one task record at the durable JSON boundary. */
function isTeamTask(value) {
    if (!isRecord(value))
        return false;
    return typeof value['id'] === 'string'
        && typeof value['subject'] === 'string'
        && isOptionalString(value['description'])
        && (value['status'] === 'pending'
            || value['status'] === 'claimed'
            || value['status'] === 'in_progress'
            || value['status'] === 'completed'
            || value['status'] === 'failed'
            || value['status'] === 'cancelled')
        && isOptionalString(value['assignee'])
        && Array.isArray(value['dependencies'])
        && value['dependencies'].every((dependency) => typeof dependency === 'string')
        && isOptionalString(value['output'])
        && (value['attempt'] === undefined
            || (Number.isSafeInteger(value['attempt']) && value['attempt'] >= 0))
        && (value['revision'] === undefined
            || (Number.isSafeInteger(value['revision']) && value['revision'] >= 1))
        && isOptionalString(value['attemptId'])
        && isOptionalString(value['handoffId'])
        && (value['reassigning'] === undefined || typeof value['reassigning'] === 'boolean')
        && (value['startedAt'] === undefined || isFiniteNumber(value['startedAt']))
        && (value['completedAt'] === undefined || isFiniteNumber(value['completedAt']))
        && isFiniteNumber(value['createdAt'])
        && isFiniteNumber(value['updatedAt']);
}
/** Validate the full team record before it can participate in authorization. */
function isTeamState(value, expectedId) {
    if (!isRecord(value))
        return false;
    const validShape = value['id'] === expectedId
        && typeof value['name'] === 'string'
        && value['name'].trim() !== ''
        && isOptionalString(value['description'])
        && typeof value['captainSessionId'] === 'string'
        && value['captainSessionId'] !== ''
        && isFiniteNumber(value['createdAt'])
        && Array.isArray(value['members'])
        && value['members'].every(isTeamMember)
        && Array.isArray(value['tasks'])
        && value['tasks'].every(isTeamTask)
        && Number.isSafeInteger(value['taskSeq'])
        && value['taskSeq'] >= 0;
    if (!validShape)
        return false;
    const members = value['members'];
    const tasks = value['tasks'];
    const memberIds = new Set();
    const memberKeys = new Set();
    for (const member of members) {
        const key = sanitizeKey(member.name);
        const isUnboundLifecycleRecord = member.id === ''
            && (member.status === 'provisioning' || member.status === 'failed');
        if ((!isUnboundLifecycleRecord && member.id === '')
            || key === CAPTAIN_KEY
            || (!isUnboundLifecycleRecord && memberIds.has(member.id))
            || memberKeys.has(key))
            return false;
        if (!isUnboundLifecycleRecord)
            memberIds.add(member.id);
        memberKeys.add(key);
    }
    const taskIds = new Set();
    for (const task of tasks) {
        if (task.id === '' || taskIds.has(task.id))
            return false;
        taskIds.add(task.id);
    }
    return true;
}
/**
 * Remove a team's whole directory (members should be interrupted first).
 * @param stateRoot - resolved absolute state root directory.
 * @param teamId - the team id.
 */
export async function removeTeamDir(stateRoot, teamId) {
    await rm(join(stateRoot, teamId), { recursive: true, force: true });
}
/**
 * `rename` with the same transient retry policy as the state-file atomic
 * write, for paths (like archiving a whole team directory) where there is no
 * content-equivalent direct-write degradation on Windows. A short-lived
 * delete-sharing lock on any file below the renamed path is retried a few
 * times before the error propagates.
 * @param from - source path.
 * @param to - destination path.
 */
async function renameWithRetry(from, to) {
    for (let attempt = 0;; attempt += 1) {
        try {
            await rename(from, to);
            return;
        }
        catch (error) {
            if (isRetryableRenameError(error) && attempt < ATOMIC_RENAME_RETRIES) {
                await sleep(ATOMIC_RENAME_RETRY_DELAY_MS);
                continue;
            }
            throw error;
        }
    }
}
/**
 * Archive a team instead of deleting it: the whole directory (team.json with
 * tasks and dependency graph, plus the mailboxes) moves under
 * `<stateRoot>/archive/<teamId>/` so later sessions can review how tasks were
 * planned and rebuild dependency relationships. The archive directory has no
 * team.json of its own, so the live activity scan skips it naturally.
 * @param stateRoot - resolved absolute state root directory.
 * @param teamId - the team id.
 */
export async function archiveTeamDir(stateRoot, teamId) {
    const archiveRoot = join(stateRoot, 'archive');
    await mkdir(archiveRoot, { recursive: true });
    const source = join(stateRoot, teamId);
    const target = join(archiveRoot, teamId);
    const previous = join(archiveRoot, `.${teamId}.previous-${randomUUID()}`);
    let displaced = false;
    try {
        // The same Windows EPERM-on-rename applies at the directory boundary: a
        // delete-sharing violation on any file below `target` blocks the move, so
        // retry the transient-lock case before giving up.
        await renameWithRetry(target, previous);
        displaced = true;
    }
    catch (error) {
        // Only ENOENT means there was nothing to displace; any other failure
        // (including a persistent EPERM lock) surfaces to the caller.
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
            throw error;
        }
    }
    try {
        await renameWithRetry(source, target);
    }
    catch (error) {
        if (displaced) {
            try {
                await renameWithRetry(previous, target);
            }
            catch (restoreError) {
                throw new AggregateError([error, restoreError], `failed to archive team "${teamId}" and restore its previous archive`);
            }
        }
        throw error;
    }
    // The new generation is authoritative. A failed cleanup only leaves a
    // hidden recovery directory, which archive discovery deliberately ignores.
    if (displaced)
        await rm(previous, { recursive: true, force: true }).catch(() => undefined);
}
/**
 * Read one archived team (already moved under `archive/`), or undefined when
 * it was never archived.
 * @param stateRoot - resolved absolute state root directory.
 * @param teamId - the team id.
 */
export async function readArchivedTeam(stateRoot, teamId) {
    return readTeam(join(stateRoot, 'archive'), teamId);
}
/**
 * List every archived team id under the state root.
 * @param stateRoot - resolved absolute state root directory.
 * @returns the archived team ids, empty when the archive does not exist.
 */
export async function listArchivedTeamIds(stateRoot) {
    try {
        const entries = await readdir(join(stateRoot, 'archive'), { withFileTypes: true });
        return entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
            .map((entry) => entry.name);
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}
/**
 * The visual state of one task: `running` while in_progress, `completed`
 * when done, `blocked` while any dependency is unfinished, else `open`.
 */
export function taskVisualState(status, dependencies, tasks) {
    if (status === 'completed')
        return 'completed';
    if (status === 'in_progress')
        return 'running';
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const openDependency = dependencies.some((dependencyId) => {
        const dependency = byId.get(dependencyId);
        return dependency !== undefined && dependency.status !== 'completed';
    });
    return openDependency ? 'blocked' : 'open';
}
/**
 * Longest dependency path depth per task id (each depth = one lane column).
 */
export function taskDepthsById(tasks) {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const depths = new Map();
    const visiting = new Set();
    const depthOf = (taskId) => {
        const cached = depths.get(taskId);
        if (cached !== undefined)
            return cached;
        if (visiting.has(taskId))
            return 0;
        const task = byId.get(taskId);
        if (task === undefined)
            return 0;
        visiting.add(taskId);
        const dependencies = task.dependencies
            .filter((dependencyId) => byId.has(dependencyId))
            .sort();
        const depth = dependencies.length === 0
            ? 0
            : 1 + Math.max(...dependencies.map(depthOf));
        visiting.delete(taskId);
        depths.set(taskId, depth);
        return depth;
    };
    for (const task of tasks)
        depthOf(task.id);
    return depths;
}
