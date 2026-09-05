/** File-backed append-only Team event journal with compatibility snapshots. */
import { type ReducedTeamState, type TeamEvent } from './events.ts';
import type { TeamRepository } from './team-repository.ts';
export interface FileEventTeamRepositoryOptions {
    /** Test-only fault hook invoked after an event is durable and before projection writes. */
    readonly beforeSnapshotWrite?: (state: ReducedTeamState) => Promise<void>;
}
/**
 * The event journal is authoritative. `team.json` remains a compatible read
 * projection for the current plugin while callers are incrementally migrated.
 */
export declare class FileEventTeamRepository implements TeamRepository {
    #private;
    private readonly stateRoot;
    private readonly options;
    constructor(stateRoot: string, options?: FileEventTeamRepositoryOptions);
    append(event: TeamEvent): Promise<ReducedTeamState>;
    load(teamId: string): Promise<ReducedTeamState | undefined>;
    /** Import a pre-journal `team.json` as one auditable, idempotent baseline. */
    importLegacy(teamId: string): Promise<ReducedTeamState | undefined>;
    private writeProjection;
    private loadInsideLock;
    private withLock;
}
