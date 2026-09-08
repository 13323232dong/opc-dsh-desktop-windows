/** Storage boundary shared by the file runtime and future SaaS adapters. */
import { reduceTeamEvents } from "./events.js";
/** Deterministic contract adapter used by tests and future service tests. */
export class InMemoryTeamRepository {
    #events = new Map();
    async load(teamId) {
        const events = this.#events.get(teamId);
        return events === undefined ? undefined : reduceTeamEvents(events);
    }
    async append(event) {
        const current = this.#events.get(event.teamId) ?? [];
        const next = Object.freeze([...current, event]);
        const state = reduceTeamEvents(next);
        this.#events.set(event.teamId, next);
        return state;
    }
}
