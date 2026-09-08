/** Durable persistence composition root for Agent Teams. */
import { FileEventTeamRepository } from "./file-event-repository.js";
import { TeamCommandService } from "./team-command-service.js";
import { TeamEventService } from "./team-event-service.js";
/**
 * Build the production file-backed Team boundary without registering tools or
 * performing any external DSH operation. Callers own the runtime lifecycle.
 */
export function createTeamRuntime(stateRoot, options = {}) {
    const repository = new FileEventTeamRepository(stateRoot);
    const events = new TeamEventService(repository, options);
    const commands = new TeamCommandService(events, options);
    return Object.freeze({ repository, events, commands });
}
