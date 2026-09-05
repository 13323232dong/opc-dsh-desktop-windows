import type { ActivityTeam } from './activity-monitor.ts';
type ArtifactTeam = Pick<ActivityTeam, 'captainSessionId' | 'tasks' | 'artifacts'>;
/** Build an unambiguous filename-to-download map for one captain Session. */
export declare function buildSessionArtifactDownloadIndex(teams: readonly ArtifactTeam[], captainSessionId: string | undefined): ReadonlyMap<string, string>;
export {};
