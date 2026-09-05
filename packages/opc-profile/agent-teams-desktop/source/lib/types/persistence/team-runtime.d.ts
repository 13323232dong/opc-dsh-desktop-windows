/** Durable persistence composition root for Agent Teams. */
import { FileEventTeamRepository } from './file-event-repository.ts';
import { TeamCommandService, type TeamCommandServiceOptions } from './team-command-service.ts';
import { TeamEventService, type TeamEventServiceOptions } from './team-event-service.ts';
export interface TeamRuntimeOptions extends TeamEventServiceOptions, TeamCommandServiceOptions {
}
export interface TeamRuntime {
    readonly repository: FileEventTeamRepository;
    readonly events: TeamEventService;
    readonly commands: TeamCommandService;
}
/**
 * Build the production file-backed Team boundary without registering tools or
 * performing any external DSH operation. Callers own the runtime lifecycle.
 */
export declare function createTeamRuntime(stateRoot: string, options?: TeamRuntimeOptions): TeamRuntime;
