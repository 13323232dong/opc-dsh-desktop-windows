/**
 * Event-driven shared task scheduler.
 *
 * Claude Code teammates keep polling the shared task list after a turn. DSH
 * continuable agents instead expose explicit idle/running edges, so this
 * scheduler closes the same loop without keeping a polling turn alive: every
 * idle edge and every task-graph mutation attempts one atomic claim and wakes
 * the selected durable member.
 * @module dsh-agent-teams/scheduler
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { join } from 'node:path';
import { deliverToMember, reconcileProvisioningMembers } from "./members.js";
import { acknowledgeMailbox, beginTaskAttempt, claimMailboxDelivery, findTeamByParticipant, readTeam, readUnreadMailbox, releaseMailboxDelivery, appendMailbox, createMessage, unsatisfiedDependencies, withTeamLock, writeTeam, } from "./state.js";
import { isActiveTeamMember, nextTaskRevision } from "./types.js";
function stateRootOf(workspace, config) {
    return join(workspace, config.stateDir);
}
function teamLockKey(stateRoot, teamId) {
    return `team:${stateRoot}:${teamId}`;
}
function advanceTaskRevision(task) {
    task.revision = nextTaskRevision(task);
}
function liveCaptain(ctx, captainSessionId, supplied) {
    if (supplied !== undefined && supplied.id === captainSessionId)
        return supplied;
    return ctx.agents.get(captainSessionId);
}
function isMemberAvailable(ctx, member) {
    const live = ctx.agents.get(member.id);
    return live === undefined || live.status === 'idle';
}
function ownedOpenTask(tasks, memberName) {
    return tasks.find(task => task.assignee === memberName
        && (task.status === 'claimed' || task.status === 'in_progress'));
}
function nextReadyTask(tasks, memberName) {
    const ready = tasks.filter(task => task.status === 'pending'
        && task.reassigning !== true
        && unsatisfiedDependencies([...tasks], task.dependencies).length === 0);
    return ready.find(task => task.assignee === memberName)
        ?? ready.find(task => task.assignee === undefined);
}
/**
 * A member can settle its DSH turn without completing the team task (for
 * example after a provider/tool error). Do not leave the task looking live:
 * close the attempt and wake the captain with an actionable report.
 */
async function failInterruptedTask(stateRoot, teamId, memberName, captain) {
    const result = await withTeamLock(teamLockKey(stateRoot, teamId), async () => {
        const fresh = await readTeam(stateRoot, teamId);
        if (fresh === undefined)
            return undefined;
        const task = fresh.tasks.find(candidate => candidate.assignee === memberName && candidate.status === 'in_progress');
        if (task === undefined)
            return undefined;
        const output = `成员 ${memberName} 的任务在执行过程中结束，未提交完成结果。请检查工具错误后重新分配任务。`;
        task.status = 'failed';
        task.output = output;
        task.completedAt = Date.now();
        task.updatedAt = Date.now();
        advanceTaskRevision(task);
        const member = fresh.members.find(candidate => candidate.name === memberName && isActiveTeamMember(candidate));
        if (member !== undefined)
            member.status = 'idle';
        const message = createMessage(memberName, 'captain', `任务 ${task.id} 已失败：${output}`);
        await appendMailbox(stateRoot, teamId, 'captain', message);
        await writeTeam(stateRoot, fresh);
        return { taskId: task.id, message: message.content };
    });
    if (result === undefined)
        return;
    try {
        captain.steer(createUserMessage({
            content: [{ type: 'text', text: `AgentTeams 成员 ${memberName} 的任务已进入失败终态。请读取团队状态并向用户汇报：\n\n${result.message}` }],
            source: { kind: 'plugin', plugin: 'dsh-agent-teams' },
        }));
    }
    catch {
        // The captain mailbox remains durable when no live steering boundary exists.
    }
}
function assignmentPrompt(ticket, stateDir, teamId) {
    const description = ticket.description === undefined ? '' : `\n\n${ticket.description}`;
    return `AgentTeams automatic task assignment from the shared task list.

Task: ${ticket.taskId} — ${ticket.subject}${description}
Attempt: ${ticket.attempt}
Attempt id: ${ticket.attemptId}
Task revision: ${ticket.revision}

Call agent_teams_claim_task for ${ticket.taskId} with expected_revision=${ticket.revision}; it will return this same attempt_id and a newer revision. Include attempt_id=${ticket.attemptId} and the latest expected_revision in every agent_teams_update_task call. If it is rejected as stale, stop work because the task was reassigned. Work only this task in this turn, report the result to the captain, then become idle so the scheduler can select your next ready task.

State policy: ${stateDir}/${teamId}/ is read-only diagnostics; mutate team state only through agent_teams_* tools.`;
}
function fallbackMailboxPrompt(messages) {
    return [
        'AgentTeams delivered messages that were persisted while live delivery was unavailable:',
        ...messages.map(message => `\nFrom ${message.from}:\n${message.content}`),
        '\nHandle these messages in this turn. Task assignments still require agent_teams_claim_task and the current attempt_id.',
    ].join('\n');
}
/** Install one scheduler and its member activity observer. */
export function installTeamScheduler(ctx, config) {
    const memberQueues = new Map();
    const serializeMember = async (key, operation) => {
        const previous = memberQueues.get(key) ?? Promise.resolve();
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        const tail = previous.then(() => gate);
        memberQueues.set(key, tail);
        await previous;
        try {
            return await operation();
        }
        finally {
            release();
            if (memberQueues.get(key) === tail)
                memberQueues.delete(key);
        }
    };
    const runtime = {
        async kickTeam(workspace, teamId, suppliedCaptain) {
            const stateRoot = stateRootOf(workspace, config);
            const team = await readTeam(stateRoot, teamId);
            if (team === undefined)
                return;
            const captain = liveCaptain(ctx, team.captainSessionId, suppliedCaptain);
            if (captain === undefined)
                return;
            await reconcileProvisioningMembers(ctx, captain, stateRoot, team.id);
            const reconciled = await readTeam(stateRoot, teamId);
            if (reconciled === undefined)
                return;
            for (const member of reconciled.members) {
                if (!isActiveTeamMember(member))
                    continue;
                await runtime.kickMember(workspace, teamId, member.name, captain);
            }
        },
        async kickMember(workspace, teamId, memberName, suppliedCaptain) {
            const stateRoot = stateRootOf(workspace, config);
            const queueKey = `${stateRoot}\u0000${teamId}\u0000${memberName}`;
            await serializeMember(queueKey, async () => {
                let team = await readTeam(stateRoot, teamId);
                if (team === undefined)
                    return;
                const captain = liveCaptain(ctx, team.captainSessionId, suppliedCaptain);
                if (captain === undefined)
                    return;
                let member = team.members.find(candidate => candidate.name === memberName && isActiveTeamMember(candidate));
                if (member === undefined || member.id === '' || !isMemberAvailable(ctx, member))
                    return;
                // Also recover a task stranded before this process observed the idle
                // edge, such as after a web-runtime restart. This call is deliberately
                // outside the dispatch lock because it acquires the same team lock.
                // A resident member becoming idle without reporting is a failed turn.
                // A non-resident continuable member after process restart is different:
                // its durable open task must receive a fresh attempt and wake the same
                // child session below, rather than being finalized as failed.
                if (ctx.agents.get(member.id) !== undefined) {
                    await failInterruptedTask(stateRoot, team.id, member.name, captain);
                }
                team = await readTeam(stateRoot, teamId);
                if (team === undefined)
                    return;
                member = team.members.find(candidate => candidate.name === memberName && isActiveTeamMember(candidate));
                if (member === undefined || member.id === '' || !isMemberAvailable(ctx, member))
                    return;
                // A mailbox-only fallback is real pending work. Deliver it before a
                // fresh task and acknowledge only after Harness accepts the follow-up.
                const unread = await readUnreadMailbox(stateRoot, team.id, member.name);
                if (unread.length > 0) {
                    await withTeamLock(teamLockKey(stateRoot, team.id), () => (claimMailboxDelivery(stateRoot, team.id, member.name, unread.map(message => message.id))));
                    const accepted = await deliverToMember(ctx, captain, member.id, fallbackMailboxPrompt(unread), new AbortController().signal);
                    if (accepted) {
                        await withTeamLock(teamLockKey(stateRoot, team.id), () => (acknowledgeMailbox(stateRoot, team.id, member.name, unread.map(message => message.id))));
                    }
                    else {
                        await withTeamLock(teamLockKey(stateRoot, team.id), () => (releaseMailboxDelivery(stateRoot, team.id, member.name, unread.map(message => message.id))));
                    }
                    return;
                }
                const ticket = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                    const fresh = await readTeam(stateRoot, team.id);
                    if (fresh === undefined)
                        return undefined;
                    const currentMember = fresh.members.find(candidate => candidate.name === memberName && isActiveTeamMember(candidate));
                    if (currentMember === undefined || currentMember.id === '' || !isMemberAvailable(ctx, currentMember))
                        return undefined;
                    // An idle/ready member that still owns an open task lost the turn
                    // that was executing it (model stopped early, interrupt settlement,
                    // or process restart). Retry that task with a fresh capability
                    // instead of permanently treating the durable claim as "busy".
                    const task = ownedOpenTask(fresh.tasks, currentMember.name)
                        ?? nextReadyTask(fresh.tasks, currentMember.name);
                    if (task === undefined) {
                        if (currentMember.status !== 'idle') {
                            currentMember.status = 'idle';
                            await writeTeam(stateRoot, fresh);
                        }
                        return undefined;
                    }
                    const previousAssignee = task.assignee;
                    const attemptId = beginTaskAttempt(task, currentMember.name);
                    advanceTaskRevision(task);
                    currentMember.status = 'working';
                    await writeTeam(stateRoot, fresh);
                    return {
                        taskId: task.id,
                        memberName: currentMember.name,
                        memberId: currentMember.id,
                        attempt: task.attempt ?? 1,
                        attemptId,
                        revision: task.revision ?? 1,
                        previousAssignee,
                        subject: task.subject,
                        description: task.description,
                    };
                });
                if (ticket === undefined)
                    return;
                const accepted = await deliverToMember(ctx, captain, ticket.memberId, assignmentPrompt(ticket, config.stateDir, team.id), new AbortController().signal);
                if (accepted)
                    return;
                // Roll back only our exact failed dispatch. A concurrent captain
                // handoff has already changed the capability and wins.
                await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                    const fresh = await readTeam(stateRoot, team.id);
                    if (fresh === undefined)
                        return;
                    const task = fresh.tasks.find(candidate => candidate.id === ticket.taskId);
                    if (task?.attemptId !== ticket.attemptId)
                        return;
                    task.status = 'pending';
                    task.assignee = ticket.previousAssignee;
                    task.attemptId = undefined;
                    task.handoffId = undefined;
                    task.reassigning = false;
                    task.updatedAt = Date.now();
                    advanceTaskRevision(task);
                    const currentMember = fresh.members.find(candidate => candidate.name === ticket.memberName);
                    if (currentMember !== undefined && isActiveTeamMember(currentMember))
                        currentMember.status = 'idle';
                    await writeTeam(stateRoot, fresh);
                });
            });
        },
    };
    const syncMemberStatus = async (agent, status) => {
        const workspace = agent.session.header.cwd ?? process.cwd();
        const stateRoot = stateRootOf(workspace, config);
        const located = await findTeamByParticipant(stateRoot, agent.id);
        if (located === undefined || located.captainSessionId === agent.id)
            return;
        const member = located.members.find(candidate => candidate.id === agent.id && isActiveTeamMember(candidate));
        if (member === undefined)
            return;
        await withTeamLock(teamLockKey(stateRoot, located.id), async () => {
            const fresh = await readTeam(stateRoot, located.id);
            const current = fresh?.members.find(candidate => candidate.id === agent.id && isActiveTeamMember(candidate));
            if (fresh === undefined || current === undefined)
                return;
            const next = status === 'running' ? 'working' : 'idle';
            if (current.status === next)
                return;
            current.status = next;
            await writeTeam(stateRoot, fresh);
        });
        if (status === 'idle') {
            const captain = liveCaptain(ctx, located.captainSessionId);
            if (captain !== undefined)
                await failInterruptedTask(stateRoot, located.id, member.name, captain);
            await runtime.kickMember(workspace, located.id, member.name, captain);
        }
    };
    ctx.on('agent/status', ({ agent, status }) => {
        void syncMemberStatus(agent, status).catch((error) => {
            ctx.logger.warn(`agent-teams: member status scheduling failed for ${agent.id}: ${String(error)}`);
        });
    });
    // A web-runtime restart has no member idle edge to trigger recovery. When
    // its captain session is restored, reconcile the durable team immediately:
    // a member task left in_progress without a live child becomes failed with a
    // clear retry path instead of looking active forever.
    const recoverCaptain = async (agent) => {
        if (agent.session.header.parentSession !== undefined)
            return;
        const workspace = agent.session.header.cwd ?? process.cwd();
        const team = await findTeamByParticipant(stateRootOf(workspace, config), agent.id);
        if (team?.captainSessionId === agent.id)
            await runtime.kickTeam(workspace, team.id, agent);
    };
    ctx.on('agent/created', ({ agent }) => {
        void recoverCaptain(agent).catch((error) => {
            ctx.logger.warn(`agent-teams: captain recovery failed for ${agent.id}: ${String(error)}`);
        });
    });
    for (const agent of ctx.agents.list()) {
        void recoverCaptain(agent).catch((error) => {
            ctx.logger.warn(`agent-teams: captain startup recovery failed for ${agent.id}: ${String(error)}`);
        });
    }
    return runtime;
}
