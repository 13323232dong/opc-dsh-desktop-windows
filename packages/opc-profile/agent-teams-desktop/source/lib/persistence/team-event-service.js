/** Application boundary for allocating and appending Team event envelopes. */
import { randomUUID } from 'node:crypto';
import { createTeamEvent } from "./events.js";
function supportsLegacyImport(repository) {
    return 'importLegacy' in repository && typeof repository.importLegacy === 'function';
}
/**
 * Serializes allocation of the next envelope sequence before delegating to the
 * repository. It intentionally contains no scheduling or provider calls.
 */
export class TeamEventService {
    repository;
    #locks = new Map();
    #now;
    #eventId;
    constructor(repository, options = {}) {
        this.repository = repository;
        this.#now = options.now ?? Date.now;
        this.#eventId = options.eventId ?? (() => randomUUID());
    }
    async loadOrImport(teamId) {
        return this.withLock(teamId, () => this.loadOrImportInsideLock(teamId));
    }
    async append(teamId, draft) {
        return this.withLock(teamId, async () => {
            const current = await this.loadOrImportInsideLock(teamId);
            if (current === undefined && draft.type !== 'team.created') {
                throw new Error(`Team "${teamId}" does not exist; the first event must be team.created`);
            }
            const sequence = (current?.teamRevision ?? 0) + 1;
            return this.repository.append(createTeamEvent({
                eventId: this.#eventId(sequence),
                teamId,
                sequence,
                type: draft.type,
                timestamp: this.#now(),
                actor: draft.actor,
                payload: draft.payload,
            }));
        });
    }
    async loadOrImportInsideLock(teamId) {
        const current = await this.repository.load(teamId);
        if (current !== undefined || !supportsLegacyImport(this.repository))
            return current;
        return this.repository.importLegacy(teamId);
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
