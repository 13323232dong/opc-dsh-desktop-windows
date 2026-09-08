/**
 * Pure Team commands shared by tools and the scheduler.
 *
 * This boundary owns business preconditions and event selection. Callers still
 * own identity/permission checks, DSH child-session operations, and UI events.
 */
import { taskRevisionConflict, taskRevisionOf } from "../types.js";
/**
 * Converts state-aware commands to immutable Team events.
 *
 * The lock intentionally covers read/validate/append as one command, so two
 * callers cannot allocate the same task id or validate the same stale task.
 */
export class TeamCommandService {
    events;
    #locks = new Map();
    #now;
    #attemptId;
    #handoffId;
    constructor(events, options = {}) {
        this.events = events;
        this.#now = options.now ?? Date.now;
        this.#attemptId = options.attemptId ?? (() => crypto.randomUUID());
        this.#handoffId = options.handoffId ?? (() => crypto.randomUUID());
    }
    async load(teamId) {
        return this.events.loadOrImport(teamId);
    }
    async createTeam(command) {
        return this.withLock(command.teamId, () => this.events.append(command.teamId, {
            type: 'team.created',
            actor: command.actor,
            payload: {
                name: command.name,
                captainSessionId: command.captainSessionId,
                createdAt: this.#now(),
                ...(command.description === undefined ? {} : { description: command.description }),
            },
        }));
    }
    async createTask(command) {
        return this.withLock(command.teamId, async () => {
            const current = await this.requireTeam(command.teamId);
            const dependencies = command.dependencies ?? [];
            const missing = dependencies.find(id => !current.team.tasks.some(task => task.id === id));
            if (missing !== undefined)
                throw new Error(`task dependency "${missing}" does not exist`);
            const taskId = `t${current.team.taskSeq + 1}`;
            const state = await this.events.append(command.teamId, {
                type: 'task.created',
                actor: command.actor,
                payload: {
                    taskId,
                    subject: command.subject,
                    dependencies,
                    createdAt: this.#now(),
                    ...(command.description === undefined ? {} : { description: command.description }),
                    ...(command.assignee === undefined ? {} : { assignee: command.assignee }),
                },
            });
            const task = state.team.tasks.find(candidate => candidate.id === taskId);
            if (task === undefined)
                throw new Error(`task "${taskId}" was not projected after creation`);
            return { id: task.id, revision: taskRevisionOf(task) };
        });
    }
    async claimTask(command) {
        return this.withLock(command.teamId, async () => {
            const current = await this.requireTeam(command.teamId);
            const task = current.team.tasks.find(candidate => candidate.id === command.taskId);
            if (task === undefined)
                throw new Error(`task "${command.taskId}" does not exist`);
            const conflict = taskRevisionConflict(task, command.expectedRevision);
            if (conflict !== undefined)
                throw new Error(conflict);
            if (task.status !== 'pending' || task.reassigning === true)
                throw new Error(`task "${task.id}" is not claimable`);
            const incomplete = task.dependencies.find(dependencyId => current.team.tasks.find(candidate => candidate.id === dependencyId)?.status !== 'completed');
            if (incomplete !== undefined)
                throw new Error(`task "${task.id}" dependencies are not completed: ${incomplete}`);
            const attempt = (task.attempt ?? 0) + 1;
            const attemptId = this.#attemptId({ teamId: command.teamId, taskId: task.id, attempt });
            const state = await this.events.append(command.teamId, {
                type: 'task.claimed',
                actor: command.actor,
                payload: {
                    taskId: task.id,
                    expectedRevision: taskRevisionOf(task),
                    revision: taskRevisionOf(task) + 1,
                    assignee: command.assignee,
                    attempt,
                    attemptId,
                    updatedAt: this.#now(),
                },
            });
            const claimed = state.team.tasks.find(candidate => candidate.id === task.id);
            if (claimed?.attemptId !== attemptId)
                throw new Error(`task "${task.id}" was not projected after claim`);
            return { attemptId, revision: taskRevisionOf(claimed) };
        });
    }
    async startTask(command) {
        return this.mutateAttempt(command, 'task.started');
    }
    async updateTaskOutput(command) {
        return this.mutateAttempt(command, 'task.output.updated', { output: command.output });
    }
    async completeTask(command) {
        return this.mutateAttempt(command, 'task.completed', { output: command.output });
    }
    async failTask(command) {
        return this.mutateAttempt(command, 'task.failed', command.output === undefined ? {} : { output: command.output });
    }
    async cancelTask(command) {
        return this.mutateAttempt(command, 'task.cancelled', command.output === undefined ? {} : { output: command.output });
    }
    async reassignTask(command) {
        return this.withLock(command.teamId, async () => {
            const current = await this.requireTeam(command.teamId);
            const task = current.team.tasks.find(candidate => candidate.id === command.taskId);
            if (task === undefined)
                throw new Error(`task "${command.taskId}" does not exist`);
            const conflict = taskRevisionConflict(task, command.expectedRevision);
            if (conflict !== undefined)
                throw new Error(conflict);
            if (task.status === 'completed')
                throw new Error(`completed task "${task.id}" cannot be reassigned`);
            if (task.reassigning === true)
                throw new Error(`task "${task.id}" is already being reassigned`);
            const handoffId = this.#handoffId({ teamId: command.teamId, taskId: task.id });
            const state = await this.events.append(command.teamId, {
                type: 'task.reassigned',
                actor: command.actor,
                payload: {
                    taskId: task.id,
                    expectedRevision: taskRevisionOf(task),
                    revision: taskRevisionOf(task) + 1,
                    ...(command.assignee === undefined ? {} : { assignee: command.assignee }),
                    handoffId,
                    updatedAt: this.#now(),
                },
            });
            const reassigned = state.team.tasks.find(candidate => candidate.id === task.id);
            if (reassigned?.handoffId !== handoffId)
                throw new Error(`task "${task.id}" was not projected after reassignment`);
            return { handoffId, revision: taskRevisionOf(reassigned) };
        });
    }
    async releaseReassignment(command) {
        return this.withLock(command.teamId, async () => {
            const current = await this.requireTeam(command.teamId);
            const task = current.team.tasks.find(candidate => candidate.id === command.taskId);
            if (task === undefined)
                throw new Error(`task "${command.taskId}" does not exist`);
            const conflict = taskRevisionConflict(task, command.expectedRevision);
            if (conflict !== undefined)
                throw new Error(conflict);
            if (task.handoffId !== command.handoffId || task.reassigning !== true)
                throw new Error(`task "${task.id}" reassignment is stale`);
            const state = await this.events.append(command.teamId, {
                type: 'task.reassignment_released',
                actor: command.actor,
                payload: {
                    taskId: task.id,
                    expectedRevision: taskRevisionOf(task),
                    revision: taskRevisionOf(task) + 1,
                    handoffId: command.handoffId,
                    updatedAt: this.#now(),
                },
            });
            const released = state.team.tasks.find(candidate => candidate.id === task.id);
            if (released === undefined)
                throw new Error(`task "${task.id}" was not projected after reassignment release`);
            return { revision: taskRevisionOf(released) };
        });
    }
    async proposeMember(command) {
        return this.withLock(command.teamId, async () => {
            const current = await this.requireTeam(command.teamId);
            if (current.team.members.some(member => member.id === command.memberId || member.name === command.name))
                throw new Error(`member "${command.name}" already exists`);
            const state = await this.events.append(command.teamId, {
                type: 'member.proposed',
                actor: command.actor,
                payload: {
                    memberId: command.memberId,
                    name: command.name,
                    ...(command.role === undefined ? {} : { role: command.role }),
                    joinedAt: command.joinedAt ?? this.#now(),
                    ...(command.soulId === undefined ? {} : { soulId: command.soulId }),
                    ...(command.selectionReason === undefined ? {} : { selectionReason: command.selectionReason }),
                    ...(command.createdFromTaskId === undefined ? {} : { createdFromTaskId: command.createdFromTaskId }),
                    ...(command.soulMarkdown === undefined ? {} : { soulMarkdown: command.soulMarkdown }),
                    ...(command.soulSummary === undefined ? {} : { soulSummary: command.soulSummary }),
                    requestedRoute: command.requestedRoute,
                },
            });
            return { memberId: command.memberId, revision: state.teamRevision };
        });
    }
    async activateMember(command) {
        return this.appendMemberEvent(command.teamId, {
            type: 'member.activated',
            actor: command.actor,
            payload: {
                memberId: command.memberId,
                ...(command.sessionId === undefined ? {} : { sessionId: command.sessionId }),
                resolvedRoute: command.resolvedRoute,
                ...(command.activatedAt === undefined ? {} : { activatedAt: command.activatedAt }),
                ...(command.agentId === undefined ? {} : { agentId: command.agentId }),
                ...(command.agentVersion === undefined ? {} : { agentVersion: command.agentVersion }),
            },
        });
    }
    async failMember(command) {
        return this.appendMemberEvent(command.teamId, {
            type: 'member.failed',
            actor: command.actor,
            payload: { memberId: command.memberId, failedAt: command.failedAt ?? this.#now(), failureReason: command.reason },
        });
    }
    async changeMemberStatus(command) {
        return this.appendMemberEvent(command.teamId, {
            type: 'member.status.changed', actor: command.actor,
            payload: { memberId: command.memberId, status: command.status },
        });
    }
    async retireMember(command) {
        return this.appendMemberEvent(command.teamId, {
            type: 'member.retired', actor: command.actor, payload: { memberId: command.memberId },
        });
    }
    async requireTeam(teamId) {
        const state = await this.events.loadOrImport(teamId);
        if (state === undefined)
            throw new Error(`Team "${teamId}" does not exist`);
        return state;
    }
    async appendMemberEvent(teamId, draft) {
        return this.withLock(teamId, async () => {
            const state = await this.events.append(teamId, draft);
            return { revision: state.teamRevision };
        });
    }
    async mutateAttempt(command, type, additionalPayload = {}) {
        return this.withLock(command.teamId, async () => {
            const current = await this.requireTeam(command.teamId);
            const task = current.team.tasks.find(candidate => candidate.id === command.taskId);
            if (task === undefined)
                throw new Error(`task "${command.taskId}" does not exist`);
            const conflict = taskRevisionConflict(task, command.expectedRevision);
            if (conflict !== undefined)
                throw new Error(conflict);
            if (task.attemptId !== command.attemptId)
                throw new Error(`task "${task.id}" attempt is stale`);
            const revision = taskRevisionOf(task) + 1;
            const now = this.#now();
            const payload = {
                taskId: task.id,
                expectedRevision: taskRevisionOf(task),
                revision,
                attemptId: command.attemptId,
                ...additionalPayload,
                ...(type === 'task.started' ? { startedAt: now } : {}),
                ...(type === 'task.completed' || type === 'task.failed' || type === 'task.cancelled' ? { completedAt: now } : {}),
                updatedAt: now,
            };
            const state = await this.events.append(command.teamId, { type, actor: command.actor, payload });
            const updated = state.team.tasks.find(candidate => candidate.id === task.id);
            if (updated === undefined)
                throw new Error(`task "${task.id}" was not projected after ${type}`);
            return { revision: taskRevisionOf(updated) };
        });
    }
    async withLock(teamId, operation) {
        const lock = this.createLock(teamId);
        await lock.previous;
        try {
            return await operation();
        }
        finally {
            lock.release();
            if (this.#locks.get(teamId) === lock.tail)
                this.#locks.delete(teamId);
        }
    }
    createLock(teamId) {
        const previous = this.#locks.get(teamId) ?? Promise.resolve();
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        const tail = previous.then(() => gate);
        this.#locks.set(teamId, tail);
        return { previous, tail, release };
    }
}
