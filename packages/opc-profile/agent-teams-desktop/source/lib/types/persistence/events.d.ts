/**
 * Immutable disk-event contracts and a pure TeamState reducer.
 *
 * This module deliberately performs no I/O. The file repository introduced in
 * the next phase will append validated events first, then use this reducer to
 * rebuild the compatibility snapshot.
 */
import type { TeamState } from '../types.ts';
export type TeamEventType = 'team.imported' | 'team.created' | 'team.archived' | 'member.proposed' | 'member.activated' | 'member.failed' | 'member.retired' | 'member.status.changed' | 'task.created' | 'task.claimed' | 'task.claim.released' | 'task.started' | 'task.output.updated' | 'task.reassigned' | 'task.reassignment_released' | 'task.completed' | 'task.failed' | 'task.cancelled';
export interface MemberModelRoute {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
    readonly source: 'captain' | 'role-preference' | 'task-router' | 'user';
    readonly resolvedAt: number;
    readonly fallbackReason?: string;
}
interface TeamCreatedPayload {
    readonly name: string;
    readonly captainSessionId: string;
    readonly createdAt: number;
    readonly description?: string;
}
interface TeamImportedPayload {
    readonly snapshot: TeamState;
}
interface MemberProposedPayload {
    readonly memberId: string;
    readonly name: string;
    readonly role?: string;
    readonly joinedAt: number;
    readonly soulId?: string;
    readonly selectionReason?: string;
    readonly createdFromTaskId?: string;
    readonly soulMarkdown?: string;
    readonly soulSummary?: string;
    readonly requestedRoute: MemberModelRoute;
}
interface MemberActivatedPayload {
    readonly memberId: string;
    readonly sessionId?: string;
    readonly resolvedRoute: MemberModelRoute;
    readonly activatedAt?: number;
    readonly agentId?: string;
    readonly agentVersion?: number;
}
interface MemberFailedPayload {
    readonly memberId: string;
    readonly failedAt: number;
    readonly failureReason: string;
}
interface MemberRetiredPayload {
    readonly memberId: string;
}
interface MemberStatusChangedPayload {
    readonly memberId: string;
    readonly status: 'idle' | 'working';
}
interface TaskCreatedPayload {
    readonly taskId: string;
    readonly subject: string;
    readonly dependencies: readonly string[];
    readonly createdAt: number;
    readonly description?: string;
    readonly assignee?: string;
}
interface TaskStartedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly attemptId: string;
    readonly startedAt: number;
    readonly updatedAt: number;
}
interface TaskOutputUpdatedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly attemptId: string;
    readonly output: string;
    readonly updatedAt: number;
}
interface TaskClaimReleasedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly attemptId: string;
    readonly updatedAt: number;
}
interface TaskReassignedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly assignee?: string;
    readonly handoffId: string;
    readonly updatedAt: number;
}
interface TaskReassignmentReleasedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly handoffId: string;
    readonly updatedAt: number;
}
interface TaskFailedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly attemptId: string;
    readonly output?: string;
    readonly completedAt: number;
    readonly updatedAt: number;
}
interface TaskClaimedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly assignee: string;
    readonly attempt: number;
    readonly attemptId: string;
    readonly updatedAt: number;
}
interface TaskCompletedPayload {
    readonly taskId: string;
    readonly expectedRevision: number;
    readonly revision: number;
    readonly attemptId: string;
    readonly output: string;
    readonly completedAt: number;
    readonly updatedAt: number;
}
export type TeamEventPayload = TeamImportedPayload | TeamCreatedPayload | MemberProposedPayload | MemberActivatedPayload | MemberFailedPayload | MemberRetiredPayload | MemberStatusChangedPayload | TaskCreatedPayload | TaskClaimedPayload | TaskClaimReleasedPayload | TaskCompletedPayload | TaskStartedPayload | TaskOutputUpdatedPayload | TaskReassignedPayload | TaskReassignmentReleasedPayload | TaskFailedPayload | Record<string, never>;
export interface TeamEvent {
    readonly schemaVersion: 1;
    readonly eventId: string;
    readonly teamId: string;
    readonly sequence: number;
    readonly type: TeamEventType;
    readonly timestamp: number;
    readonly actor: {
        readonly kind: 'captain' | 'member' | 'scheduler' | 'system';
        readonly sessionId?: string;
        readonly memberName?: string;
    };
    readonly payload: TeamEventPayload;
}
export interface CreateTeamEventInput extends Omit<TeamEvent, 'schemaVersion'> {
    readonly schemaVersion?: 1;
}
export interface ReducedTeamState {
    readonly team: TeamState;
    readonly teamRevision: number;
    readonly archived: boolean;
}
/** Construct one validated, deeply immutable event envelope. */
export declare function createTeamEvent(input: CreateTeamEventInput): TeamEvent;
/** Replay a complete, ordered event stream into an immutable Team snapshot. */
export declare function reduceTeamEvents(events: readonly TeamEvent[]): ReducedTeamState;
export {};
