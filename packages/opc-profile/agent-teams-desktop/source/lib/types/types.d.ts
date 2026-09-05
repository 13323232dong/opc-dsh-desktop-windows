/**
 * Durable AgentTeams state types.
 *
 * A team is one directory under the state root holding `team.json` plus an
 * `inbox/` of per-agent JSONL mailboxes. Members are continuable subagents
 * whose durable child session ids are recorded in the team file, so a team
 * survives harness restarts.
 * @module dsh-agent-teams/types
 */
/** Task lifecycle statuses in progression order. */
export type TaskStatus = 'pending' | 'claimed' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
/** Statuses after which a task can no longer be claimed or worked on. */
export declare const TERMINAL_TASK_STATUSES: readonly TaskStatus[];
/** One task of a team's task list. */
export interface TeamTask {
    /** Stable task id within the team (`t1`, `t2`, …). */
    id: string;
    /** Monotonic optimistic-concurrency revision for event-backed task updates. */
    revision?: number;
    /** Brief title for the task. */
    subject: string;
    /** What needs to be done. */
    description?: string;
    status: TaskStatus;
    /** Member name (or `captain`) the task is assigned to; unassigned tasks await a claim. */
    assignee?: string;
    /** Task ids that must reach `completed` before this task can be claimed. */
    dependencies: string[];
    /** The worker's written result, set when the task completes or fails. */
    output?: string;
    /** Monotonic execution generation. Reassignment/retry invalidates every older attempt. */
    attempt?: number;
    /** Capability for the current claimed/in-progress attempt. Members must present it when updating. */
    attemptId?: string;
    /** Opaque generation for a revocation/handoff that has not started its next attempt yet. */
    handoffId?: string;
    /** A handoff is quiescing the old owner; the scheduler must not dispatch it yet. */
    reassigning?: boolean;
    /** When the current task attempt first enters `in_progress`. */
    startedAt?: number;
    /** When the current task attempt enters a terminal status. */
    completedAt?: number;
    createdAt: number;
    updatedAt: number;
}
/** Member lifecycle status. */
export type MemberStatus = 'provisioning' | 'idle' | 'working' | 'failed' | 'removed';
/** Member statuses that have a usable continuable DSH child session. */
export declare const ACTIVE_MEMBER_STATUSES: readonly MemberStatus[];
/** Return a normalized task revision while supporting snapshots created before CAS. */
export declare function taskRevisionOf(task: Pick<TeamTask, 'revision'>): number;
/** Return the revision assigned to the next accepted task mutation. */
export declare function nextTaskRevision(task: Pick<TeamTask, 'revision'>): number;
/**
 * Validate an optional caller precondition against the durable task snapshot.
 * Omitting the value is a backward-compatible request for the server to bind
 * the operation to the revision it reads under its Team lock.
 */
export declare function taskRevisionConflict(task: Pick<TeamTask, 'id' | 'revision'>, expectedRevision: number | undefined): string | undefined;
/** One team member: a continuable subagent plus its team-side record. */
export interface TeamMember {
    /** Durable continuable subagent session id (empty until spawned). */
    id: string;
    /** Unique display name inside the team. */
    name: string;
    /** Role description, e.g. `researcher`, `engineer`, `reviewer`. */
    role?: string;
    /** Resolved LLM provider route captured when this member was created. */
    provider?: string;
    /** Resolved model captured when this member was created. */
    model?: string;
    /** Resolved reasoning effort captured from the captain or target model default. */
    reasoningEffort?: string;
    /** Reusable OPC Agent profile selected for this member, if any. */
    agentId?: string;
    /** Immutable profile version captured when this member was created. */
    agentVersion?: number;
    /** Workspace department SOUL id, separate from a reusable profile UUID. */
    soulId?: string;
    /** Human/audit explanation for selecting the profile. */
    selectionReason?: string;
    /** Task that caused this profile to be created. */
    createdFromTaskId?: string;
    /** Sanitized, immutable SOUL content captured when the member was spawned. */
    soulMarkdown?: string;
    /** Short read-only summary shown by the workbench. */
    soulSummary?: string;
    joinedAt: number;
    /** The member record was written before its continuable child was created. */
    status: MemberStatus;
    /** Set when a provisioning record is bound to its durable child session. */
    activatedAt?: number;
    /** Set when provisioning cannot be reconciled to a durable child session. */
    failedAt?: number;
    /** A user-safe lifecycle diagnostic; never store raw provider credentials or prompts. */
    failureReason?: string;
}
/** Whether the member can receive assignments and invoke team tools. */
export declare function isActiveTeamMember(member: Pick<TeamMember, 'status'>): boolean;
/** One mailbox message. */
export interface TeamMessage {
    id: string;
    /** `captain` or a member name. */
    from: string;
    /** `captain` or a member name. */
    to: string;
    content: string;
    ts: number;
    /** Process-local delivery lease; prevents fallback and direct delivery racing. */
    deliveryClaimedAt?: number;
    /** Set after the durable message was accepted by the recipient's live Harness inbox. */
    deliveredAt?: number;
    /** Set once the recipient has consumed or been shown the durable fallback. */
    readAt?: number;
}
/**
 * Public message kinds stored in the append-only team chat.
 *
 * `message` and `status` remain for old teams. The more specific kinds make
 * the read-only workbench useful without exposing hidden model reasoning.
 */
export declare const TEAM_CHAT_MESSAGE_KINDS: readonly ["message", "status", "discussion", "assignment", "objection", "help", "decision", "tool", "artifact", "approval", "system", "summary"];
/** Kinds an Agent may deliberately write through the model-facing tool. */
export declare const AGENT_TEAM_CHAT_MESSAGE_KINDS: readonly ["message", "status", "discussion", "assignment", "objection", "help", "decision", "summary"];
export type TeamChatMessageKind = (typeof TEAM_CHAT_MESSAGE_KINDS)[number];
/** Optional accounting metadata. No prompts, completions, or reasoning are stored. */
export interface TeamChatTokenUsage {
    readonly totalTokens: number;
}
/** One immutable, team-visible chat record from `chat.jsonl`. */
export interface TeamChatMessage {
    readonly id: string;
    /** Monotonic sequence within one team's chat log. */
    readonly seq: number;
    readonly teamId: string;
    /** `captain` or an active member name. */
    readonly from: string;
    /** `captain` or an active member name. */
    readonly to: string;
    /** Plain text only. Consumers must render this as text, never HTML. */
    readonly content: string;
    readonly ts: number;
    readonly taskId?: string;
    readonly mentions?: readonly string[];
    readonly replyTo?: string;
    readonly kind: TeamChatMessageKind;
    readonly tokenUsage?: TeamChatTokenUsage;
}
/** The full durable team record. */
export interface TeamState {
    /** Original team name. */
    name: string;
    /** Sanitized directory id; the team's stable identity. */
    id: string;
    /** Team purpose/goal. */
    description?: string;
    /** Session id of the captain agent that owns this team. */
    captainSessionId: string;
    createdAt: number;
    /** Teammates only; the captain is implicit (the owning session). */
    members: TeamMember[];
    tasks: TeamTask[];
    /** Monotonic task id counter. */
    taskSeq: number;
}
