/**
 * The `agent_teams_*` model-facing tools.
 *
 * The captain (the agent that created the team) orchestrates: members are
 * continuable subagents it spawns and wakes. Members share the same tools and
 * drive their own task state, mirroring the Claude Code AgentTeams flow:
 * create team → add members → create tasks with dependencies → claim/assign →
 * work → report → status → delete.
 * @module dsh-agent-teams/tools
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type TeamChatMessage, type TeamChatMessageKind } from './types.ts';
/** Resolved plugin config consumed by the tools. */
export interface ToolsConfig {
    /** State directory name under the captain's workspace. */
    stateDir: string;
    /** Workspace-relative SOUL source directory. */
    soulDirectory?: string;
    /** Member subagent provider name. */
    memberProvider: string;
    /** Optional member model override. */
    memberModel?: string;
    /** Member delegation depth cap. */
    memberMaxDepth?: number;
    /** Team size cap (members). */
    maxMembers: number;
    /** Total append-only chat cap. The final slot is reserved for a captain summary. */
    maxTeamMessages?: number;
    /** Consecutive-message cap for each non-captain member. */
    maxConsecutiveMemberMessages?: number;
    /** Optional tenant-private Agent Registry used to persist department roles. */
    controlPlaneEnabled?: boolean;
    controlPlaneRegistryBaseUrl?: string;
    controlPlaneGatewayTimeoutMs?: number;
    controlPlaneIdentityHmacSecret?: string;
}
export declare const DEFAULT_MAX_TEAM_MESSAGES = 1000;
export declare const DEFAULT_MAX_CONSECUTIVE_MEMBER_MESSAGES = 8;
/** Deterministic discussion-budget rule used inside the serialized send path. */
export declare function discussionBudgetError(messages: readonly TeamChatMessage[], from: string, kind: TeamChatMessageKind, config: Pick<ToolsConfig, 'maxTeamMessages' | 'maxConsecutiveMemberMessages'>): string | undefined;
/**
 * Deliver a durable member report at the captain's nearest model boundary.
 *
 * `Agent.steer()` targets the next step while the captain is running, wakes a
 * new turn when it is idle, and lets the Agent runtime reclassify an aborted
 * activity to `next-turn`. This prevents reports from waiting behind the
 * captain's entire orchestration turn.
 */
export declare function steerCaptainReport(captain: Pick<Agent, 'steer'>, from: string, content: string): boolean;
/**
 * Register every `agent_teams_*` tool into the shared tools registry.
 * @param ctx - the plugin context (injects `tools`).
 * @param config - resolved tool config.
 */
export declare function registerAgentTeamsTools(ctx: Context, config: ToolsConfig): void;
