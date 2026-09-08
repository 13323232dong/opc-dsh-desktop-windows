/** Conservative startup repair for file-backed Team persistence. */
import { readdir } from 'node:fs/promises';
import { FileEventTeamRepository } from "./file-event-repository.js";
async function activeTeamIds(stateRoot) {
    try {
        const entries = await readdir(stateRoot, { withFileTypes: true });
        return entries
            .filter(entry => entry.isDirectory() && entry.name !== 'archive' && !entry.name.startsWith('.'))
            .map(entry => entry.name)
            .sort();
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
            return [];
        throw error;
    }
}
/**
 * Restore only deterministic file projections. This never starts agents,
 * claims tasks, delivers messages, or replays provider/paid side effects.
 */
export async function reconcileTeamPersistence(stateRoot) {
    const teamIds = await activeTeamIds(stateRoot);
    const repository = new FileEventTeamRepository(stateRoot);
    const importedLegacy = [];
    const repairedJournals = [];
    const failures = [];
    for (const teamId of teamIds) {
        try {
            const loaded = await repository.load(teamId);
            if (loaded !== undefined) {
                repairedJournals.push(teamId);
                continue;
            }
            const imported = await repository.importLegacy(teamId);
            if (imported !== undefined)
                importedLegacy.push(teamId);
        }
        catch (error) {
            failures.push({ teamId, message: error instanceof Error ? error.message : String(error) });
        }
    }
    return Object.freeze({
        scanned: teamIds.length,
        importedLegacy: Object.freeze(importedLegacy),
        repairedJournals: Object.freeze(repairedJournals),
        failures: Object.freeze(failures),
    });
}
