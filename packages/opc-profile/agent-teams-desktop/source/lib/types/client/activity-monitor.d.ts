/** Shared, demand-driven state for the AgentTeams browser monitor. */
/** One member row of a host snapshot. */
export interface ActivityMember {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly status?: 'idle' | 'working' | 'removed';
    readonly activity: 'working' | 'idle' | 'unknown';
    readonly progress: number;
    readonly done: number;
    readonly total: number;
    readonly currentTask: string;
    readonly unread: number;
    readonly agentId?: string;
    readonly agentVersion?: number;
    readonly soulId?: string;
    readonly selectionReason?: string;
    readonly createdFromTaskId?: string;
    readonly soulSummary?: string;
    readonly soulVersion?: number;
    readonly tools: readonly ActivityTool[];
}
export interface ActivityTool {
    readonly id: string;
    readonly label: string;
    readonly calls: number;
    readonly failures: number;
    readonly lastAt: number;
    readonly lastError?: string;
}
/** One task row of a host snapshot. */
export interface ActivityTask {
    readonly id: string;
    readonly subject: string;
    readonly status: string;
    readonly state: 'blocked' | 'open' | 'running' | 'completed';
    readonly assignee: string;
    readonly dependencies: readonly string[];
    readonly depth: number;
    readonly createdAt: number;
    readonly startedAt?: number;
    readonly completedAt?: number;
    readonly artifacts: readonly ActivityArtifact[];
}
/** A generated file available from the local DSH host. */
export interface ActivityArtifact {
    readonly name: string;
    readonly url: string;
}
/** One captain-inbox preview row. */
export interface ActivityMessage {
    readonly from: string;
    readonly content: string;
}
/** Immutable, team-visible coordination message returned by the host. */
export interface ActivityChatMessage {
    readonly id: string;
    readonly seq: number;
    readonly teamId: string;
    readonly from: string;
    readonly to: string;
    readonly content: string;
    readonly ts: number;
    readonly taskId?: string;
    readonly mentions?: readonly string[];
    readonly replyTo?: string;
    readonly kind: 'message' | 'status' | 'discussion' | 'assignment' | 'objection' | 'help' | 'decision' | 'tool' | 'artifact' | 'approval' | 'system' | 'summary';
}
/** One team snapshot (mirrors the host TeamActivitySnapshot). */
export interface ActivityTeam {
    readonly workspace: string;
    readonly teamId: string;
    readonly name: string;
    readonly description?: string;
    readonly captainSessionId: string;
    readonly members: readonly ActivityMember[];
    readonly tasks: readonly ActivityTask[];
    readonly artifacts?: readonly ActivityArtifact[];
    readonly messageCount: number;
    readonly chatCursor?: string;
    readonly recentMessages?: readonly ActivityChatMessage[];
    readonly captainInbox: readonly ActivityMessage[];
}
/** A successfully-created conversation card that currently needs updates. */
export interface ActivityMonitorTarget {
    readonly key: string;
    readonly sessionId: string;
    readonly teamId: string;
}
/** Latest shared response data for both the floater and conversation cards. */
export interface ActivitySnapshots {
    readonly teams: readonly ActivityTeam[];
    readonly archivedTeams: readonly ActivityTeam[];
    /** Optional profile extension; false for a normal standalone DSH install. */
    readonly controlPlaneEnabled: boolean;
}
/** Subscribe to the active monitor-target list (React external-store shape). */
export declare function subscribeActivityMonitorTargets(listener: () => void): () => void;
/** Read the stable active-target snapshot. */
export declare function getActivityMonitorTargetsSnapshot(): readonly ActivityMonitorTarget[];
/**
 * Register one successful AgentTeams card as a monitoring demand.
 *
 * The returned cleanup is reference-counted so multiple cards and React
 * StrictMode remounts cannot stop another card's monitor.
 */
export declare function monitorAgentTeam(sessionId: string, teamId: string): () => void;
/** Stop polling targets whose final archived snapshot has been captured. */
export declare function settleActivityMonitorTargets(keys: ReadonlySet<string>): void;
/** Subscribe to the shared live/archive snapshot. */
export declare function subscribeActivitySnapshots(listener: () => void): () => void;
/** Read the stable shared live/archive snapshot. */
export declare function getActivitySnapshotsSnapshot(): ActivitySnapshots;
/** Publish one or both successful state-route responses. */
export declare function updateActivitySnapshots(update: Partial<ActivitySnapshots>): void;
/** Poll cadence for the live host snapshot route. */
export declare const ACTIVITY_POLL_MS = 1000;
/** Host route serving live and archived team snapshots. */
export declare const ACTIVITY_STATE_URL = "/plugins/dsh-agent-teams/state";
export declare const TEAM_CHAT_URL = "/plugins/dsh-agent-teams/chat";
export interface ActivityChatPage {
    readonly messages: readonly ActivityChatMessage[];
    readonly messageCount: number;
    readonly chatCursor: string;
    readonly nextCursor?: string;
    readonly hasMore: boolean;
}
/** Load the durable read-only chat log. The workspace and session are always
 * taken from a host snapshot, never from user-entered group-chat controls. */
export declare function loadTeamChatPage(team: Pick<ActivityTeam, 'workspace' | 'teamId' | 'captainSessionId'>, cursor?: number, limit?: number, fetcher?: typeof fetch): Promise<ActivityChatPage>;
interface ActivityFetchResponse {
    readonly ok: boolean;
    json(): Promise<unknown>;
}
/** Injectable browser primitives used by the poll controller and its tests. */
export interface ActivityPollingRuntime {
    readonly fetchState?: (url: string, init: {
        readonly cache: 'no-store';
        readonly signal: AbortSignal;
    }) => Promise<ActivityFetchResponse>;
    readonly schedule?: (callback: () => void, intervalMs: number) => unknown;
    readonly cancel?: (timer: unknown) => void;
    readonly publishSnapshots?: (update: Partial<ActivitySnapshots>) => void;
    readonly settleTargets?: (keys: ReadonlySet<string>) => void;
    /** Discover durable teams even when an old session lacks a rendered team card. */
    readonly pollAll?: boolean;
}
/** Handle returned by one current-session polling loop. */
export interface ActivityPollingController {
    /** The immediate first pass, exposed so offline verification can await it. */
    readonly firstTick: Promise<void>;
    /** Idempotently stop the timer and abort the current request. */
    stop(): void;
}
/**
 * Start the single polling loop for the current session's requested targets.
 *
 * With no targets this is deliberately inert: installing the plugin must not
 * touch the state route. Live state is polled at the normal cadence; archive
 * state is fetched only as a one-time fallback for targets no longer live.
 */
export declare function startActivityPolling(monitorTargets: readonly ActivityMonitorTarget[], runtime?: ActivityPollingRuntime): ActivityPollingController;
export {};
