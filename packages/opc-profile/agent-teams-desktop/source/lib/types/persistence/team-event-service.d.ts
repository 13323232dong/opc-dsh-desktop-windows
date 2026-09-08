/** Application boundary for allocating and appending Team event envelopes. */
import { type ReducedTeamState, type TeamEvent } from './events.ts';
import type { TeamRepository } from './team-repository.ts';
export interface TeamEventServiceOptions {
    readonly now?: () => number;
    readonly eventId?: (sequence: number) => string;
}
export interface TeamEventDraft {
    readonly type: TeamEvent['type'];
    readonly actor: TeamEvent['actor'];
    readonly payload: TeamEvent['payload'];
}
/**
 * Serializes allocation of the next envelope sequence before delegating to the
 * repository. It intentionally contains no scheduling or provider calls.
 */
export declare class TeamEventService {
    #private;
    private readonly repository;
    constructor(repository: TeamRepository, options?: TeamEventServiceOptions);
    loadOrImport(teamId: string): Promise<ReducedTeamState | undefined>;
    append(teamId: string, draft: TeamEventDraft): Promise<ReducedTeamState>;
    private loadOrImportInsideLock;
    private withLock;
}
