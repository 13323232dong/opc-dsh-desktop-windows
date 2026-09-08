/**
 * Pure Team commands shared by tools and the scheduler.
 *
 * This boundary owns business preconditions and event selection. Callers still
 * own identity/permission checks, DSH child-session operations, and UI events.
 */
import type { MemberModelRoute, ReducedTeamState, TeamEvent } from './events.ts';
import { TeamEventService } from './team-event-service.ts';
type TeamActor = TeamEvent['actor'];
export interface TeamCommandServiceOptions {
    readonly now?: () => number;
    readonly attemptId?: (input: {
        readonly teamId: string;
        readonly taskId: string;
        readonly attempt: number;
    }) => string;
    readonly handoffId?: (input: {
        readonly teamId: string;
        readonly taskId: string;
    }) => string;
}
export interface CreateTeamCommand {
    readonly teamId: string;
    readonly name: string;
    readonly captainSessionId: string;
    readonly description?: string;
    readonly actor: TeamActor;
}
export interface CreateTaskCommand {
    readonly teamId: string;
    readonly subject: string;
    readonly description?: string;
    readonly assignee?: string;
    readonly dependencies?: readonly string[];
    readonly actor: TeamActor;
}
export interface ClaimTaskCommand {
    readonly teamId: string;
    readonly taskId: string;
    readonly assignee: string;
    readonly expectedRevision: number;
    readonly actor: TeamActor;
}
interface AttemptTaskCommand {
    readonly teamId: string;
    readonly taskId: string;
    readonly attemptId: string;
    readonly expectedRevision: number;
    readonly actor: TeamActor;
}
export interface UpdateTaskOutputCommand extends AttemptTaskCommand {
    readonly output: string;
}
export interface CompleteTaskCommand extends UpdateTaskOutputCommand {
}
export interface FailTaskCommand extends AttemptTaskCommand {
    readonly output?: string;
}
export interface CancelTaskCommand extends AttemptTaskCommand {
    readonly output?: string;
}
export interface ReassignTaskCommand {
    readonly teamId: string;
    readonly taskId: string;
    readonly assignee?: string;
    readonly expectedRevision: number;
    readonly actor: TeamActor;
}
export interface ReleaseReassignmentCommand {
    readonly teamId: string;
    readonly taskId: string;
    readonly handoffId: string;
    readonly expectedRevision: number;
    readonly actor: TeamActor;
}
export interface ProposeMemberCommand {
    readonly teamId: string;
    readonly memberId: string;
    readonly name: string;
    readonly role?: string;
    readonly joinedAt?: number;
    readonly soulId?: string;
    readonly selectionReason?: string;
    readonly createdFromTaskId?: string;
    readonly soulMarkdown?: string;
    readonly soulSummary?: string;
    readonly requestedRoute: MemberModelRoute;
    readonly actor: TeamActor;
}
export interface ActivateMemberCommand {
    readonly teamId: string;
    readonly memberId: string;
    readonly sessionId?: string;
    readonly resolvedRoute: MemberModelRoute;
    readonly activatedAt?: number;
    readonly agentId?: string;
    readonly agentVersion?: number;
    readonly actor: TeamActor;
}
export interface FailMemberCommand {
    readonly teamId: string;
    readonly memberId: string;
    readonly reason: string;
    readonly failedAt?: number;
    readonly actor: TeamActor;
}
export interface ChangeMemberStatusCommand {
    readonly teamId: string;
    readonly memberId: string;
    readonly status: 'idle' | 'working';
    readonly actor: TeamActor;
}
export interface RetireMemberCommand {
    readonly teamId: string;
    readonly memberId: string;
    readonly actor: TeamActor;
}
/**
 * Converts state-aware commands to immutable Team events.
 *
 * The lock intentionally covers read/validate/append as one command, so two
 * callers cannot allocate the same task id or validate the same stale task.
 */
export declare class TeamCommandService {
    #private;
    private readonly events;
    constructor(events: TeamEventService, options?: TeamCommandServiceOptions);
    load(teamId: string): Promise<ReducedTeamState | undefined>;
    createTeam(command: CreateTeamCommand): Promise<ReducedTeamState>;
    createTask(command: CreateTaskCommand): Promise<{
        readonly id: string;
        readonly revision: number;
    }>;
    claimTask(command: ClaimTaskCommand): Promise<{
        readonly attemptId: string;
        readonly revision: number;
    }>;
    startTask(command: AttemptTaskCommand): Promise<{
        readonly revision: number;
    }>;
    updateTaskOutput(command: UpdateTaskOutputCommand): Promise<{
        readonly revision: number;
    }>;
    completeTask(command: CompleteTaskCommand): Promise<{
        readonly revision: number;
    }>;
    failTask(command: FailTaskCommand): Promise<{
        readonly revision: number;
    }>;
    cancelTask(command: CancelTaskCommand): Promise<{
        readonly revision: number;
    }>;
    reassignTask(command: ReassignTaskCommand): Promise<{
        readonly handoffId: string;
        readonly revision: number;
    }>;
    releaseReassignment(command: ReleaseReassignmentCommand): Promise<{
        readonly revision: number;
    }>;
    proposeMember(command: ProposeMemberCommand): Promise<{
        readonly memberId: string;
        readonly revision: number;
    }>;
    activateMember(command: ActivateMemberCommand): Promise<{
        readonly revision: number;
    }>;
    failMember(command: FailMemberCommand): Promise<{
        readonly revision: number;
    }>;
    changeMemberStatus(command: ChangeMemberStatusCommand): Promise<{
        readonly revision: number;
    }>;
    retireMember(command: RetireMemberCommand): Promise<{
        readonly revision: number;
    }>;
    private requireTeam;
    private appendMemberEvent;
    private mutateAttempt;
    private withLock;
    private createLock;
}
export {};
