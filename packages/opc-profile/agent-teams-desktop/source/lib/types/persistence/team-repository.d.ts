/** Storage boundary shared by the file runtime and future SaaS adapters. */
import { type ReducedTeamState, type TeamEvent } from './events.ts';
export interface TeamRepository {
    load(teamId: string): Promise<ReducedTeamState | undefined>;
    append(event: TeamEvent): Promise<ReducedTeamState>;
}
/** Deterministic contract adapter used by tests and future service tests. */
export declare class InMemoryTeamRepository implements TeamRepository {
    #private;
    load(teamId: string): Promise<ReducedTeamState | undefined>;
    append(event: TeamEvent): Promise<ReducedTeamState>;
}
