/**
 * Team activity snapshot assembly for the activity panel.
 *
 * Server-side assembly mirrors the Claude Code desktop teamWatcher: read the
 * durable team files (the truth source) and enrich with live subagent
 * activity, so the panel always reflects the on-disk state even when a model
 * skipped a tool "ritual" (e.g. not calling update_task on completion).
 * @module dsh-agent-teams/snapshot
 */
import type { Context } from '@deepseek-ai/cordis';
import type { MemberStatus, TeamChatMessage, TeamState } from './types.ts';
import { type ToolActivity } from './tool-activity.ts';
/** Visual task state for the activity panel. */
export type VisualTaskState = 'blocked' | 'open' | 'running' | 'completed';
/** One member row of the activity snapshot. */
export interface TeamActivityMember {
    readonly id: string;
    readonly name: string;
    readonly role: string;
    readonly status: MemberStatus;
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
    /** Safe aggregate of actual DSH tool outcomes for this member. */
    readonly tools: readonly ToolActivity[];
}
/** One task row of the activity snapshot. */
export interface TeamActivityTask {
    readonly id: string;
    readonly subject: string;
    readonly status: string;
    readonly state: VisualTaskState;
    readonly assignee: string;
    readonly dependencies: readonly string[];
    readonly depth: number;
    /** Task creation time, retained as a display fallback for teams created before start tracking. */
    readonly createdAt: number;
    readonly startedAt?: number;
    readonly completedAt?: number;
    /** Files named by the completed task output and available to open locally. */
    readonly artifacts: readonly TeamActivityArtifact[];
}
/** A generated file exposed through the local DSH web host. */
export interface TeamActivityArtifact {
    readonly name: string;
    readonly url: string;
}
/** Extract actual workspace files explicitly named in a task completion summary. */
export declare function outputArtifacts(output: string | undefined, workspace: string, workspacePath: string): Promise<readonly TeamActivityArtifact[]>;
/** One captain-inbox preview row. */
export interface TeamActivityMessage {
    readonly from: string;
    readonly content: string;
}
/** The full panel payload for one team. */
export interface TeamActivitySnapshot {
    readonly workspace: string;
    readonly teamId: string;
    readonly name: string;
    readonly description?: string;
    readonly captainSessionId: string;
    readonly members: readonly TeamActivityMember[];
    readonly tasks: readonly TeamActivityTask[];
    /** Verified files produced by any member, including post-task revisions. */
    readonly artifacts: readonly TeamActivityArtifact[];
    /** Total append-only chat records; independent of mailbox read state. */
    readonly messageCount: number;
    /** Latest stable chat sequence, represented as a transport-safe cursor. */
    readonly chatCursor: string;
    /** Latest team-visible chat records, oldest first. */
    readonly recentMessages: readonly TeamChatMessage[];
    /** Legacy unread captain mailbox preview retained for older clients. */
    readonly captainInbox: readonly TeamActivityMessage[];
}
/** Snapshot projection switches for live and archived teams. */
export interface TeamSnapshotOptions {
    /** Historic review must retain members that were marked removed at shutdown. */
    readonly includeRemoved?: boolean;
    /** Archived teams have no meaningful live activity after their sessions stop. */
    readonly historic?: boolean;
}
/** Read a minimal, sanitized tool trace for a member without exposing arguments or outputs. */
export declare function memberToolActivity(ctx: Context, memberId: string): Promise<readonly ToolActivity[]>;
/**
 * Assemble one team snapshot from its durable files plus live activity.
 * @param ctx - the plugin context (injects `subagents`, used for activity).
 * @param stateRoot - resolved absolute state root of the owning workspace.
 * @param workspace - display name of the owning workspace.
 * @param state - the durable team record.
 * @returns the panel snapshot.
 */
export declare function assembleTeamSnapshot(ctx: Context, stateRoot: string, workspace: string, state: TeamState, options?: TeamSnapshotOptions): Promise<TeamActivitySnapshot>;
/**
 * Collect every team under the given workspace state roots.
 * @param ctx - the plugin context.
 * @param roots - `{ workspace, stateRoot }` pairs (resolved absolute roots).
 * @returns the snapshots in stable order (workspace, then team id).
 */
export declare function collectTeamsActivity(ctx: Context, roots: readonly {
    workspace: string;
    stateRoot: string;
}[]): Promise<TeamActivitySnapshot[]>;
/**
 * Collect every archived team under the given workspace state roots (the
 * `archive/` subdirectory of each state root). Used by the historic panel
 * path to restore full team detail after deletion.
 * @param ctx - the plugin context.
 * @param roots - `{ workspace, stateRoot }` pairs.
 * @returns the archived snapshots in stable order.
 */
export declare function collectArchivedTeamsActivity(ctx: Context, roots: readonly {
    workspace: string;
    stateRoot: string;
}[]): Promise<TeamActivitySnapshot[]>;
