/** File-backed append-only Team event journal with compatibility snapshots. */
import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readTeam } from "../state.js";
import { createTeamEvent, reduceTeamEvents } from "./events.js";
const EVENTS_FILE = 'events.jsonl';
const SNAPSHOT_FILE = 'team.json';
const METADATA_FILE = 'metadata.json';
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
function journalError(teamId, line, detail) {
    return new Error(`Team journal for "${teamId}" is invalid at line ${line}: ${detail}`);
}
async function readEvents(root, teamId) {
    let raw;
    try {
        raw = await readFile(join(root, teamId, EVENTS_FILE), 'utf8');
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
            return undefined;
        throw error;
    }
    const events = [];
    for (const [index, line] of raw.split('\n').entries()) {
        if (line.trim() === '')
            continue;
        try {
            events.push(createTeamEvent(JSON.parse(line)));
        }
        catch (error) {
            throw journalError(teamId, index + 1, error instanceof Error ? error.message : String(error));
        }
    }
    return events;
}
/**
 * The event journal is authoritative. `team.json` remains a compatible read
 * projection for the current plugin while callers are incrementally migrated.
 */
export class FileEventTeamRepository {
    stateRoot;
    options;
    #locks = new Map();
    constructor(stateRoot, options = {}) {
        this.stateRoot = stateRoot;
        this.options = options;
    }
    async append(event) {
        const normalized = createTeamEvent(event);
        return this.withLock(normalized.teamId, async () => {
            const existing = await readEvents(this.stateRoot, normalized.teamId) ?? [];
            const state = reduceTeamEvents([...existing, normalized]);
            const teamDirectory = join(this.stateRoot, normalized.teamId);
            await mkdir(teamDirectory, { recursive: true });
            await appendAndSync(join(teamDirectory, EVENTS_FILE), `${JSON.stringify(normalized)}\n`);
            await this.writeProjection(state);
            return state;
        });
    }
    async load(teamId) {
        return this.withLock(teamId, async () => {
            const events = await readEvents(this.stateRoot, teamId);
            if (events === undefined)
                return undefined;
            let state;
            try {
                state = reduceTeamEvents(events);
            }
            catch (error) {
                throw journalError(teamId, 0, error instanceof Error ? error.message : String(error));
            }
            await this.writeProjection(state);
            return state;
        });
    }
    /** Import a pre-journal `team.json` as one auditable, idempotent baseline. */
    async importLegacy(teamId) {
        return this.withLock(teamId, async () => {
            const existing = await readEvents(this.stateRoot, teamId);
            if (existing !== undefined)
                return this.loadInsideLock(teamId, existing);
            const legacy = await readTeam(this.stateRoot, teamId);
            if (legacy === undefined)
                return undefined;
            const imported = createTeamEvent({
                eventId: `legacy-import-${randomUUID()}`,
                teamId,
                sequence: 1,
                type: 'team.imported',
                timestamp: Date.now(),
                actor: { kind: 'system' },
                payload: { snapshot: legacy },
            });
            const state = reduceTeamEvents([imported]);
            const directory = join(this.stateRoot, teamId);
            await appendAndSync(join(directory, EVENTS_FILE), `${JSON.stringify(imported)}\n`);
            await this.writeProjection(state);
            return state;
        });
    }
    async writeProjection(state) {
        await this.options.beforeSnapshotWrite?.(state);
        const directory = join(this.stateRoot, state.team.id);
        await mkdir(directory, { recursive: true });
        const metadata = { schemaVersion: 1, lastAppliedSequence: state.teamRevision };
        await writeAtomic(join(directory, SNAPSHOT_FILE), `${JSON.stringify(state.team, null, 2)}\n`);
        await writeAtomic(join(directory, METADATA_FILE), `${JSON.stringify(metadata, null, 2)}\n`);
    }
    async loadInsideLock(teamId, events) {
        let state;
        try {
            state = reduceTeamEvents(events);
        }
        catch (error) {
            throw journalError(teamId, 0, error instanceof Error ? error.message : String(error));
        }
        await this.writeProjection(state);
        return state;
    }
    async withLock(teamId, operation) {
        const previous = this.#locks.get(teamId) ?? Promise.resolve();
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        const tail = previous.then(() => gate);
        this.#locks.set(teamId, tail);
        await previous;
        try {
            return await operation();
        }
        finally {
            release();
            if (this.#locks.get(teamId) === tail)
                this.#locks.delete(teamId);
        }
    }
}
