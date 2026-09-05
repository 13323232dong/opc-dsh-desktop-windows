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
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { join } from 'node:path';
import { appendTeamEvent, captainSessionOf } from "./events.js";
import { acknowledgeMailbox, appendMailbox, appendTeamChat, archiveTeamDir, beginTaskAttempt, CAPTAIN_KEY, createMessage, createTeamChatMessage, createTeamDir, findTeamByCaptain, findTeamByParticipant, invalidateTaskAttempt, readUnreadMailbox, recordRetiredMemberIds, releaseMailboxDelivery, readTeam, readTeamChat, sanitizeKey, transitionError, unsatisfiedDependencies, withTeamLock, writeTeam, } from "./state.js";
import { deliverToMember, installRetiredMemberGuard, installMemberSelectionRuntime, interruptMember, memberActivity, reconcileProvisioningMembers, resolveMemberLlmSelection, spawnMember, } from "./members.js";
import { AGENT_TEAM_CHAT_MESSAGE_KINDS, TERMINAL_TASK_STATUSES, isActiveTeamMember, nextTaskRevision, taskRevisionConflict, taskRevisionOf, } from "./types.js";
import { installTeamScheduler } from "./scheduler.js";
import { loadWorkspaceSoul } from "./soul.js";
import { summarizeTeamChatContent } from "./chat-presentation.js";
import { ensureMemberProfile, fetchMemberProfile } from "./member-profile-client.js";
import { isPersistentMemberProfileId } from "./member-profile-id.js";
export const DEFAULT_MAX_TEAM_MESSAGES = 1_000;
export const DEFAULT_MAX_CONSECUTIVE_MEMBER_MESSAGES = 8;
/** Deterministic discussion-budget rule used inside the serialized send path. */
export function discussionBudgetError(messages, from, kind, config) {
    const maximum = config.maxTeamMessages ?? DEFAULT_MAX_TEAM_MESSAGES;
    if (messages.length >= maximum) {
        return `team discussion message limit (${maximum}) has been reached`;
    }
    if (from !== CAPTAIN_KEY) {
        const consecutiveMaximum = config.maxConsecutiveMemberMessages
            ?? DEFAULT_MAX_CONSECUTIVE_MEMBER_MESSAGES;
        let consecutive = 0;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            if (messages[index]?.from !== from)
                break;
            consecutive += 1;
        }
        if (consecutive >= consecutiveMaximum) {
            return `member "${from}" consecutive message limit (${consecutiveMaximum}) has been reached; wait for another participant`;
        }
    }
    return messages.length === maximum - 1 && !(from === CAPTAIN_KEY && kind === 'summary')
        ? `team discussion message limit reserves the final slot for a captain summary (${maximum} total)`
        : undefined;
}
/** The caller agent, or a loud failure for non-agent callers. */
function requireCaptain(exec) {
    if (!exec.agent) {
        throw new Error('agent_teams tools require a calling agent (exec.agent was undefined)');
    }
    return exec.agent;
}
/** The captain's workspace directory (team state root parent). */
function workspaceOf(agent) {
    return agent.session.header.cwd ?? process.cwd();
}
/** Resolved absolute state root. */
function stateRootOf(workspace, config) {
    return join(workspace, config.stateDir);
}
/** Process-local lock key scoped by workspace state root and team id. */
function teamLockKey(stateRoot, teamId) {
    return `team:${stateRoot}:${teamId}`;
}
/** Process-local lock key enforcing one active team per captain session. */
function captainLockKey(stateRoot, captainId) {
    return `captain:${stateRoot}:${captainId}`;
}
/** The team this captain currently leads, or a loud failure. */
async function requireCaptainTeam(workspace, config, captain) {
    const team = await findTeamByCaptain(stateRootOf(workspace, config), captain.id);
    if (team === undefined) {
        throw new Error('you are not leading any team yet — call agent_teams_create first');
    }
    return team;
}
/** The team this captain or active member currently participates in. */
async function requireParticipantTeam(workspace, config, caller) {
    const team = await findTeamByParticipant(stateRootOf(workspace, config), caller.id);
    if (team === undefined) {
        throw new Error('you do not lead or belong to any active team yet');
    }
    return team;
}
/** Re-derive a caller's role from fresh state while holding the team lock. */
function participantIdentityOf(team, agentId) {
    if (team.captainSessionId === agentId)
        return { kind: 'captain', name: CAPTAIN_KEY };
    const member = team.members.find((candidate) => candidate.id === agentId && isActiveTeamMember(candidate));
    return member === undefined ? undefined : { kind: 'member', name: member.name };
}
/** Fresh state for a team that still exists; never falls back to stale lookup data. */
async function requireFreshTeam(stateRoot, teamId) {
    const fresh = await readTeam(stateRoot, teamId);
    if (fresh === undefined)
        throw new Error(`team "${teamId}" is no longer active`);
    return fresh;
}
/** Fresh state with captain authorization rechecked inside the lock. */
async function requireFreshCaptainTeam(stateRoot, teamId, captainId) {
    const fresh = await requireFreshTeam(stateRoot, teamId);
    if (fresh.captainSessionId !== captainId) {
        throw new Error(`only the captain of team "${fresh.name}" may perform this operation`);
    }
    return fresh;
}
/** Fresh state and caller identity rechecked inside the lock. */
async function requireFreshParticipant(stateRoot, teamId, callerId) {
    const fresh = await requireFreshTeam(stateRoot, teamId);
    const identity = participantIdentityOf(fresh, callerId);
    if (identity === undefined)
        throw new Error(`you are no longer an active participant in team "${fresh.name}"`);
    return { team: fresh, identity };
}
/** Look up one live (non-removed) member by display name. */
function requireMember(team, name) {
    const member = team.members.find((candidate) => candidate.name === name && isActiveTeamMember(candidate));
    if (member === undefined) {
        throw new Error(`no active member named "${name}" in team "${team.name}"`);
    }
    return member;
}
/** Look up one task by id. */
function requireTask(team, taskId) {
    const task = team.tasks.find((candidate) => candidate.id === taskId);
    if (task === undefined) {
        throw new Error(`no task "${taskId}" in team "${team.name}" — use agent_teams_status to list tasks`);
    }
    return task;
}
/** Check a caller's CAS precondition while the current Team snapshot is locked. */
function requireExpectedTaskRevision(task, expectedRevision) {
    const conflict = taskRevisionConflict(task, typeof expectedRevision === 'number' ? expectedRevision : undefined);
    if (conflict !== undefined)
        throw new Error(conflict);
    if (expectedRevision !== undefined && typeof expectedRevision !== 'number') {
        throw new Error('expected_revision must be a positive safe integer');
    }
}
/** Advance a task's optimistic-concurrency revision once for one committed mutation. */
function advanceTaskRevision(task) {
    const revision = nextTaskRevision(task);
    task.revision = revision;
    return revision;
}
function memberOpenTask(team, memberName, exceptTaskId) {
    return team.tasks.find(task => task.id !== exceptTaskId
        && task.assignee === memberName
        && (task.status === 'claimed' || task.status === 'in_progress'));
}
async function waitForMemberIdle(ctx, member, signal) {
    if (member.id === '')
        return;
    const live = ctx.agents.get(member.id);
    if (live === undefined)
        return;
    if (signal.aborted)
        throw signal.reason;
    let onAbort;
    const aborted = new Promise((_resolve, reject) => {
        onAbort = () => reject(signal.reason ?? new Error('task reassignment was cancelled'));
        signal.addEventListener('abort', onAbort, { once: true });
    });
    try {
        await Promise.race([live.whenIdle(), aborted]);
    }
    finally {
        signal.removeEventListener('abort', onAbort);
    }
}
/**
 * Deliver a durable member report at the captain's nearest model boundary.
 *
 * `Agent.steer()` targets the next step while the captain is running, wakes a
 * new turn when it is idle, and lets the Agent runtime reclassify an aborted
 * activity to `next-turn`. This prevents reports from waiting behind the
 * captain's entire orchestration turn.
 */
export function steerCaptainReport(captain, from, content) {
    try {
        captain.steer(createUserMessage({
            content: [{ type: 'text', text: `AgentTeams message from member ${from}:\n\n${content}` }],
            source: { kind: 'plugin', plugin: 'dsh-agent-teams' },
        }));
        return true;
    }
    catch {
        // The plugin mailbox was persisted before this best-effort live delivery.
        return false;
    }
}
/**
 * Register every `agent_teams_*` tool into the shared tools registry.
 * @param ctx - the plugin context (injects `tools`).
 * @param config - resolved tool config.
 */
export function registerAgentTeamsTools(ctx, config) {
    installRetiredMemberGuard(ctx, config.stateDir);
    const memberSelections = installMemberSelectionRuntime(ctx, config.stateDir);
    const scheduler = installTeamScheduler(ctx, { stateDir: config.stateDir });
    ctx.tools.register(defineTool({
        name: 'agent_teams_create',
        description: 'Create a new AgentTeams team: you (the calling agent) become the captain. A captain leads one team at a time; create tasks and members afterwards with agent_teams_add_member and agent_teams_create_task.',
        parameters: {
            name: { type: 'string', required: true, description: 'Name for the new team (used as its stable id).' },
            description: { type: 'string', description: 'Team purpose / the goal the team will work on.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    team_id: { type: 'string', required: true },
                    team_name: { type: 'string', required: true },
                    state_dir: { type: 'string', required: true },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Team "${value.team_name}" created (id ${value.team_id}) under ${value.state_dir}. You are the captain.`,
                }],
        },
        async execute(args, exec) {
            const captain = requireCaptain(exec);
            const workspace = workspaceOf(captain);
            const stateRoot = stateRootOf(workspace, config);
            const teamName = args.name.trim();
            if (teamName === '')
                throw new Error('team name must not be empty');
            const teamId = sanitizeKey(teamName);
            return withTeamLock(captainLockKey(stateRoot, captain.id), async () => {
                const current = await findTeamByParticipant(stateRoot, captain.id);
                if (current !== undefined) {
                    const relationship = current.captainSessionId === captain.id ? 'lead' : 'belong to';
                    throw new Error(`you already ${relationship} team "${current.name}" — end or leave it before creating another`);
                }
                return withTeamLock(teamLockKey(stateRoot, teamId), async () => {
                    const existing = await readTeam(stateRoot, teamId);
                    if (existing !== undefined) {
                        throw new Error(`team id "${teamId}" is taken by another captain — pick a different team name`);
                    }
                    const state = {
                        name: teamName,
                        id: teamId,
                        description: args.description,
                        captainSessionId: captain.id,
                        createdAt: Date.now(),
                        members: [],
                        tasks: [],
                        taskSeq: 0,
                    };
                    await createTeamDir(stateRoot, state);
                    appendTeamEvent(ctx, captain.session, 'agent-teams/team-created', {
                        teamId: state.id,
                        captainSessionId: captain.id,
                        name: state.name,
                        ...state.description !== undefined ? { description: state.description } : {},
                    });
                    return { team_id: state.id, team_name: state.name, state_dir: join(stateRoot, state.id) };
                });
            });
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_add_member',
        description: 'Add a durable continuable member. By default it snapshots the captain\'s current LLM route and effort. Supply provider/model only for an explicitly requested role-specific route; a changed provider or model automatically uses the target model\'s default effort. Set reasoning_effort only to request one of the target model\'s supported ids explicitly (or "default" to force its default). The member waits for messages, works on assigned tasks, and can message the team.',
        parameters: {
            name: { type: 'string', required: true, description: 'Unique member name inside the team.' },
            role: { type: 'string', description: 'Role of the member (e.g. researcher, engineer, reviewer).' },
            provider: { type: 'string', description: 'Optional LLM provider route. Use only when the user explicitly requests a different provider; requires model.' },
            model: { type: 'string', description: 'Optional model override. Omit for the captain\'s current model (or the configured memberModel default).' },
            reasoning_effort: { type: 'string', description: 'Optional reasoning effort override: one of the target model\'s supported effort ids, or "default" to force its default. When omitted, the captain\'s effort is inherited only for the same provider/model; a changed route uses the target default.' },
            agent_id: { type: 'string', description: 'Optional reusable OPC Agent profile id selected for this member.' },
            agent_version: { type: 'number', description: 'Immutable OPC Agent profile version captured for this member.' },
            soul_id: { type: 'string', description: 'Optional installed department SOUL id (for example scriptwriter or video-producer). This is separate from an Agent Profile id.' },
            selection_reason: { type: 'string', description: 'Why this reusable Agent profile was selected.' },
            created_from_task_id: { type: 'string', description: 'Task id that created the reusable Agent profile.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    member_name: { type: 'string', required: true },
                    member_id: { type: 'string', required: true },
                    provider: { type: 'string', required: true },
                    model: { type: 'string', required: true },
                    reasoning_effort: { type: 'string' },
                    agent_id: { type: 'string' },
                    agent_version: { type: 'number' },
                    soul_id: { type: 'string' },
                    selection_reason: { type: 'string' },
                    created_from_task_id: { type: 'string' },
                    status: { type: 'string', required: true },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Member "${value.member_name}" added (subagent id ${value.member_id}, ${value.provider}/${value.model}${value.reasoning_effort === undefined ? '' : `, reasoning ${value.reasoning_effort}`}, status ${value.status}).`,
                }],
        },
        async execute(args, exec) {
            const captain = requireCaptain(exec);
            const workspace = workspaceOf(captain);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireCaptainTeam(workspace, config, captain);
            await reconcileProvisioningMembers(ctx, captain, stateRoot, team.id);
            const created = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const fresh = await requireFreshCaptainTeam(stateRoot, team.id, captain.id);
                const memberName = args.name.trim();
                if (memberName === '')
                    throw new Error('member name must not be empty');
                const memberKey = sanitizeKey(memberName);
                if (memberKey === CAPTAIN_KEY) {
                    throw new Error(`member name "${args.name}" is reserved for the captain`);
                }
                if (fresh.members.some((candidate) => sanitizeKey(candidate.name) === memberKey)) {
                    throw new Error(`member name "${args.name}" has already been used in team "${fresh.name}"`);
                }
                if (fresh.members.filter(isActiveTeamMember).length >= config.maxMembers) {
                    throw new Error(`team "${fresh.name}" is at its member cap (${config.maxMembers})`);
                }
                const requestedProfileId = typeof args.agent_id === 'string' && isPersistentMemberProfileId(args.agent_id.trim())
                    ? args.agent_id.trim()
                    : undefined;
                const profile = requestedProfileId === undefined || config.controlPlaneEnabled !== true
                    ? undefined
                    : await (async () => {
                        const identityService = ctx.get('opcDshIdentity');
                        const principal = await identityService?.resolve?.(captain.id, undefined, captain.session.header.parentSession);
                        if (principal === undefined)
                            throw new Error('当前 DSH 对话未登录，无法读取“我的 Agent”配置');
                        return fetchMemberProfile({
                            harnessBaseUrl: config.controlPlaneRegistryBaseUrl,
                            identityHmacSecret: config.controlPlaneIdentityHmacSecret,
                            timeoutMs: config.controlPlaneGatewayTimeoutMs,
                        }, { sessionId: captain.id, profileId: requestedProfileId, principal });
                    })();
                const savedRoute = profile?.modelRoute?.split('/', 2);
                const useSavedRoute = args.provider === undefined && args.model === undefined && savedRoute?.[0] !== undefined && savedRoute[1] !== undefined;
                const selection = await resolveMemberLlmSelection(ctx, captain, {
                    provider: args.provider,
                    model: args.model,
                    // A task-level route is explicit and always wins. Otherwise a saved
                    // profile model becomes the durable default for future members.
                    ...(useSavedRoute ? { defaultProvider: savedRoute[0], defaultModel: savedRoute[1] } : { defaultModel: config.memberModel }),
                    reasoningEffort: args.reasoning_effort,
                }, exec.signal);
                const member = {
                    id: '',
                    name: memberName,
                    role: args.role,
                    provider: selection.provider,
                    model: selection.model,
                    reasoningEffort: selection.reasoningEffort,
                    ...(typeof args.agent_id === 'string' && args.agent_id.trim() !== '' ? { agentId: args.agent_id.trim() } : {}),
                    ...(typeof args.agent_version === 'number' && Number.isInteger(args.agent_version) && args.agent_version > 0
                        ? { agentVersion: args.agent_version }
                        : profile === undefined ? {} : { agentVersion: profile.currentVersion }),
                    ...(typeof args.soul_id === 'string' && args.soul_id.trim() !== '' ? { soulId: args.soul_id.trim() } : {}),
                    ...(typeof args.selection_reason === 'string' && args.selection_reason.trim() !== '' ? { selectionReason: args.selection_reason.trim().slice(0, 500) } : {}),
                    ...(typeof args.created_from_task_id === 'string' && args.created_from_task_id.trim() !== '' ? { createdFromTaskId: args.created_from_task_id.trim() } : {}),
                    joinedAt: Date.now(),
                    status: 'provisioning',
                };
                const soul = (member.soulId ?? member.agentId) === undefined
                    ? undefined
                    : await loadWorkspaceSoul(workspace, config.soulDirectory ?? '.agent-teams/agents', member.soulId ?? member.agentId);
                if (soul !== undefined) {
                    if (member.soulId !== undefined && member.agentVersion !== undefined && member.agentVersion !== soul.version) {
                        throw new Error(`SOUL ${member.soulId} version ${member.agentVersion} is not available in the installed source`);
                    }
                    member.soulMarkdown = soul.markdown;
                    member.soulSummary = soul.summary;
                    if (member.agentVersion === undefined)
                        member.agentVersion = soul.version;
                }
                if (profile !== undefined) {
                    member.soulMarkdown = profile.soulMarkdown ?? profile.persona;
                    member.soulSummary = profile.soulSummary ?? profile.persona.slice(0, 500);
                    member.selectionReason = '使用“我的 Agent”已发布版本的模型与人格配置';
                }
                // Legacy prompts used `agent_id` for a SOUL id. Only a Harness UUID
                // proves that a reusable profile already exists.
                if (config.controlPlaneEnabled === true && !isPersistentMemberProfileId(member.agentId)) {
                    const identityService = ctx.get('opcDshIdentity');
                    const principal = await identityService?.resolve?.(captain.id, undefined, captain.session.header.parentSession);
                    if (principal === undefined)
                        throw new Error('当前 DSH 对话未登录，无法把部门角色保存到“我的 Agent”');
                    const memberRole = member.role ?? '';
                    const preferredTools = member.name === '截流专家' || memberRole.includes('截流')
                        ? ['competitor_chase_create', 'competitor_chase_status', 'competitor_chase_analyze', 'competitor_chase_prepare_outreach', 'competitor_chase_authorize_outreach', 'competitor_chase_send', 'competitor_intercept_rule_create', 'competitor_intercept_rule_list', 'competitor_intercept_rule_run']
                        : member.name === 'AI 客服' || memberRole.includes('客服')
                            ? ['wechat_contact_status', 'wechat_message_draft', 'wechat_message_send']
                            : [];
                    const profile = await ensureMemberProfile({
                        harnessBaseUrl: config.controlPlaneRegistryBaseUrl,
                        identityHmacSecret: config.controlPlaneIdentityHmacSecret,
                        timeoutMs: config.controlPlaneGatewayTimeoutMs,
                    }, {
                        sessionId: captain.id,
                        teamId: fresh.id,
                        name: member.name,
                        role: member.role,
                        ...(member.soulMarkdown ? { soulMarkdown: member.soulMarkdown } : {}),
                        ...(member.soulSummary ? { soulSummary: member.soulSummary } : {}),
                        preferredTools,
                        principal,
                    });
                    member.agentId = profile.id;
                    member.agentVersion = profile.currentVersion;
                    member.selectionReason = '组长首次组建时自动登记到“我的 Agent”';
                }
                fresh.members.push(member);
                try {
                    // Persist the proposal before publishing the continuable child. A
                    // process crash between these phases can be reconciled from the
                    // child's durable AgentTeams label after restart.
                    await writeTeam(stateRoot, fresh);
                }
                catch (error) {
                    throw error;
                }
                try {
                    await spawnMember(ctx, memberRuntime(config), memberSelections, selection, captain, fresh, member, config.stateDir, exec.signal, soul);
                }
                catch (error) {
                    member.status = 'failed';
                    member.failedAt = Date.now();
                    member.failureReason = '成员的 DSH continuable 会话创建失败。请检查成员模型路由或子 Agent 提供方后重试。';
                    await writeTeam(stateRoot, fresh);
                    throw error;
                }
                member.status = 'idle';
                member.activatedAt = Date.now();
                try {
                    await writeTeam(stateRoot, fresh);
                }
                catch (error) {
                    // The continuable child is already live, but the activation record
                    // could not be written. Retire it and keep the prior proposal for
                    // restart reconciliation rather than leaving an untracked member.
                    if (member.id !== '') {
                        await recordRetiredMemberIds(stateRoot, [member.id]).catch(() => undefined);
                        interruptMember(ctx, captain, member.id);
                    }
                    member.id = '';
                    member.status = 'failed';
                    member.failedAt = Date.now();
                    member.failureReason = '成员已创建但无法持久化激活状态，已停止该成员。';
                    await writeTeam(stateRoot, fresh).catch(() => undefined);
                    throw error;
                }
                appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, captain.session), 'agent-teams/member-added', {
                    teamId: fresh.id,
                    memberId: member.id,
                    name: member.name,
                    ...member.role !== undefined ? { role: member.role } : {},
                });
                return {
                    member_name: member.name,
                    member_id: member.id,
                    provider: selection.provider,
                    model: selection.model,
                    ...selection.reasoningEffort === undefined
                        ? {}
                        : { reasoning_effort: selection.reasoningEffort },
                    ...member.agentId === undefined ? {} : { agent_id: member.agentId },
                    ...member.agentVersion === undefined ? {} : { agent_version: member.agentVersion },
                    ...member.soulId === undefined ? {} : { soul_id: member.soulId },
                    ...member.selectionReason === undefined ? {} : { selection_reason: member.selectionReason },
                    ...member.createdFromTaskId === undefined ? {} : { created_from_task_id: member.createdFromTaskId },
                    status: member.status,
                };
            });
            await scheduler.kickMember(workspace, team.id, created.member_name, captain);
            return created;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_remove_member',
        description: 'Remove a member safely: revoke its current attempts, return all unfinished owned tasks to the shared pending pool, interrupt its live turn, and mark it removed.',
        parameters: {
            name: { type: 'string', required: true, description: 'Name of the member to remove.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    member_name: { type: 'string', required: true },
                    status: { type: 'string', required: true },
                    requeued_tasks: { type: 'array', items: { type: 'string' }, required: true },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Member "${value.member_name}" removed (status ${value.status}); requeued tasks: ${value.requeued_tasks.join(', ') || 'none'}.`,
                }],
        },
        async execute(args, exec) {
            const captain = requireCaptain(exec);
            const workspace = workspaceOf(captain);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireCaptainTeam(workspace, config, captain);
            const revoked = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const fresh = await requireFreshCaptainTeam(stateRoot, team.id, captain.id);
                const member = requireMember(fresh, args.name);
                const requeued = [];
                for (const task of fresh.tasks) {
                    if (task.assignee !== member.name || task.status === 'completed')
                        continue;
                    invalidateTaskAttempt(task);
                    task.reassigning = false;
                    advanceTaskRevision(task);
                    requeued.push(task.id);
                }
                member.status = 'removed';
                await writeTeam(stateRoot, fresh);
                appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, captain.session), 'agent-teams/member-removed', {
                    teamId: fresh.id,
                    memberId: member.id,
                });
                return { member: { ...member }, requeued };
            });
            if (revoked.member.id !== '') {
                await recordRetiredMemberIds(stateRoot, [revoked.member.id]);
                interruptMember(ctx, captain, revoked.member.id);
                await waitForMemberIdle(ctx, revoked.member, exec.signal);
            }
            await scheduler.kickTeam(workspace, team.id, captain);
            return {
                member_name: revoked.member.name,
                status: revoked.member.status,
                requeued_tasks: revoked.requeued,
            };
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_create_task',
        description: 'Create a task in your team\'s task list. Tasks can depend on other tasks (dependencies): use the returned task_id (for example t1), not the task title; an unambiguous existing title is also accepted. A task is only claimable once every dependency is completed. Optionally assign it to a member, who still claims it before working.',
        parameters: {
            subject: { type: 'string', required: true, description: 'Brief title for the task.' },
            description: { type: 'string', description: 'What needs to be done, in detail.' },
            dependencies: {
                type: 'array',
                items: { type: 'string' },
                description: 'Task ids this task depends on (must be completed before this task can be claimed).',
            },
            assignee: { type: 'string', description: 'Optional member name this task is intended for.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_id: { type: 'string', required: true },
                    subject: { type: 'string', required: true },
                    status: { type: 'string', required: true },
                    assignee: { type: 'string' },
                    revision: { type: 'number', required: true },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Task "${value.subject}" created as ${value.task_id} (status ${value.status}${value.assignee ? `, assigned to ${value.assignee}` : ''}).`,
                }],
        },
        async execute(args, exec) {
            const captain = requireCaptain(exec);
            const workspace = workspaceOf(captain);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireCaptainTeam(workspace, config, captain);
            // A resumed captain may create a task before the scheduler gets an idle
            // edge. Reconcile first so an already-created child can be assigned.
            await reconcileProvisioningMembers(ctx, captain, stateRoot, team.id);
            const created = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const fresh = await requireFreshCaptainTeam(stateRoot, team.id, captain.id);
                const requestedDependencies = args.dependencies ?? [];
                const dependencies = requestedDependencies.map((dependency) => {
                    const byId = fresh.tasks.find((task) => task.id === dependency);
                    if (byId !== undefined)
                        return byId.id;
                    // Models sometimes pass the human-readable subject even though the
                    // contract is task_id. Resolve an unambiguous subject for backward
                    // compatibility, while still rejecting typos and duplicate titles.
                    const matches = fresh.tasks.filter((task) => task.subject === dependency);
                    if (matches.length === 1)
                        return matches[0].id;
                    if (matches.length > 1) {
                        throw new Error(`dependency "${dependency}" matches multiple tasks; use the task_id (for example ${matches.map((task) => task.id).join(', ')})`);
                    }
                    throw new Error(`dependency "${dependency}" does not exist in team "${fresh.name}"; use a task_id such as ${fresh.tasks.map((task) => task.id).join(', ') || '(none)'}`);
                });
                if (args.assignee !== undefined)
                    requireMember(fresh, args.assignee);
                const task = {
                    id: `t${fresh.taskSeq + 1}`,
                    subject: args.subject,
                    description: args.description,
                    status: 'pending',
                    assignee: args.assignee,
                    dependencies,
                    attempt: 0,
                    revision: 1,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                fresh.taskSeq += 1;
                fresh.tasks.push(task);
                await writeTeam(stateRoot, fresh);
                appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, captain.session), 'agent-teams/task-created', {
                    teamId: fresh.id,
                    taskId: task.id,
                    subject: task.subject,
                    dependencies: task.dependencies,
                    ...task.assignee !== undefined ? { assignee: task.assignee } : {},
                });
                return {
                    task_id: task.id,
                    subject: task.subject,
                    status: task.status,
                    revision: taskRevisionOf(task),
                    ...task.assignee !== undefined ? { assignee: task.assignee } : {},
                };
            });
            await scheduler.kickTeam(workspace, team.id, captain);
            return created;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_reassign_task',
        description: 'Atomically retry, reassign, or let the captain take over any unfinished/failed task. The old attempt is revoked before its member is interrupted, so late updates cannot overwrite the new owner. Use assignee="captain" for captain takeover.',
        parameters: {
            task_id: { type: 'string', required: true, description: 'Task to retry/reassign.' },
            assignee: { type: 'string', required: true, description: 'Active member name, or "captain" for captain takeover.' },
            reason: { type: 'string', description: 'Why the task is being retried or reassigned.' },
            expected_revision: { type: 'number', description: 'Optional task revision returned by status/claim/update. When omitted, this legacy request is atomically bound to the revision read by the server.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_id: { type: 'string', required: true },
                    previous_assignee: { type: 'string', required: true },
                    assignee: { type: 'string', required: true },
                    status: { type: 'string', required: true },
                    attempt: { type: 'number', required: true },
                    attempt_id: { type: 'string' },
                    revision: { type: 'number', required: true },
                },
            },
            render: (_args, value) => [{
                    type: 'text',
                    text: `Task ${value.task_id} reassigned ${value.previous_assignee || 'unassigned'} → ${value.assignee} (attempt ${value.attempt}, status ${value.status}${value.attempt_id ? `, attempt_id ${value.attempt_id}` : ''}).`,
                }],
        },
        async execute(args, exec) {
            const captain = requireCaptain(exec);
            const workspace = workspaceOf(captain);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireCaptainTeam(workspace, config, captain);
            await reconcileProvisioningMembers(ctx, captain, stateRoot, team.id);
            const target = args.assignee.trim();
            if (target === '')
                throw new Error('reassignment assignee must not be empty');
            const revoked = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const fresh = await requireFreshCaptainTeam(stateRoot, team.id, captain.id);
                const task = requireTask(fresh, args.task_id);
                requireExpectedTaskRevision(task, args.expected_revision);
                if (task.status === 'completed')
                    throw new Error(`completed task ${task.id} is immutable and cannot be reassigned`);
                if (task.reassigning === true)
                    throw new Error(`task ${task.id} is already being reassigned`);
                const targetMember = target === CAPTAIN_KEY ? undefined : requireMember(fresh, target);
                if (targetMember !== undefined) {
                    const busy = memberOpenTask(fresh, targetMember.name, task.id);
                    if (busy !== undefined) {
                        throw new Error(`member "${targetMember.name}" is busy with ${busy.id}; finish or reassign it first`);
                    }
                }
                const previousAssignee = task.assignee ?? '';
                const previousMember = (task.status !== 'claimed' && task.status !== 'in_progress')
                    || task.assignee === undefined || task.assignee === CAPTAIN_KEY
                    ? undefined
                    : fresh.members.find(member => member.name === task.assignee && isActiveTeamMember(member));
                invalidateTaskAttempt(task, target, true);
                advanceTaskRevision(task);
                await writeTeam(stateRoot, fresh);
                return {
                    previousAssignee,
                    previousMember: previousMember === undefined ? undefined : { ...previousMember },
                    handoffId: task.handoffId,
                };
            });
            let quiescenceError;
            if (revoked.previousMember !== undefined) {
                interruptMember(ctx, captain, revoked.previousMember.id);
                try {
                    await waitForMemberIdle(ctx, revoked.previousMember, exec.signal);
                }
                catch (error) {
                    quiescenceError = error;
                }
            }
            await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const fresh = await requireFreshCaptainTeam(stateRoot, team.id, captain.id);
                const task = requireTask(fresh, args.task_id);
                if (task.handoffId !== revoked.handoffId || task.assignee !== target || task.reassigning !== true) {
                    throw new Error(`task ${task.id} changed during reassignment; refusing to overwrite the newer state`);
                }
                task.reassigning = false;
                if (quiescenceError === undefined && target === CAPTAIN_KEY)
                    beginTaskAttempt(task, CAPTAIN_KEY);
                advanceTaskRevision(task);
                await writeTeam(stateRoot, fresh);
                appendTeamEvent(ctx, captain.session, 'agent-teams/task-updated', {
                    teamId: fresh.id,
                    taskId: task.id,
                    status: task.status,
                    assignee: task.assignee,
                    ...args.reason === undefined ? {} : { output: `Reassigned: ${args.reason}` },
                });
            });
            if (quiescenceError !== undefined)
                throw quiescenceError;
            if (target !== CAPTAIN_KEY)
                await scheduler.kickMember(workspace, team.id, target, captain);
            const current = await readTeam(stateRoot, team.id);
            const task = current === undefined ? undefined : requireTask(current, args.task_id);
            if (task === undefined)
                throw new Error(`team "${team.name}" ended during reassignment`);
            return {
                task_id: task.id,
                previous_assignee: revoked.previousAssignee,
                assignee: task.assignee ?? '',
                status: task.status,
                attempt: task.attempt ?? 0,
                revision: taskRevisionOf(task),
                ...task.attemptId === undefined ? {} : { attempt_id: task.attemptId },
            };
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_claim_task',
        description: 'Claim one ready task for a member (or yourself). A member cannot own a second unfinished task. The returned attempt_id is required for that member\'s updates and becomes stale after retry/reassignment.',
        parameters: {
            task_id: { type: 'string', required: true, description: 'The task id to claim.' },
            assignee: { type: 'string', description: 'Member to claim for (captain only; defaults to the task\'s assignee).' },
            expected_revision: { type: 'number', description: 'Optional task revision returned by status/claim/update. When omitted, this legacy request is atomically bound to the revision read by the server.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_id: { type: 'string', required: true },
                    status: { type: 'string', required: true },
                    assignee: { type: 'string', required: true },
                    attempt: { type: 'number', required: true },
                    attempt_id: { type: 'string' },
                    revision: { type: 'number', required: true },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Task ${value.task_id} claimed by ${value.assignee} (attempt ${value.attempt}${value.attempt_id ? `, attempt_id ${value.attempt_id}` : ''}, status ${value.status}).`,
                }],
        },
        async execute(args, exec) {
            const caller = requireCaptain(exec);
            const workspace = workspaceOf(caller);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireParticipantTeam(workspace, config, caller);
            return withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const { team: fresh, identity } = await requireFreshParticipant(stateRoot, team.id, caller.id);
                const task = requireTask(fresh, args.task_id);
                requireExpectedTaskRevision(task, args.expected_revision);
                if (task.reassigning === true) {
                    throw new Error(`task ${task.id} is being reassigned; wait for the handoff to finish`);
                }
                let assignee = task.assignee;
                if (identity.kind === 'captain') {
                    if (args.assignee !== undefined) {
                        requireMember(fresh, args.assignee);
                        assignee = args.assignee;
                    }
                }
                else {
                    if (args.assignee !== undefined) {
                        throw new Error('members cannot set assignee when claiming a task');
                    }
                    if (assignee !== undefined && assignee !== identity.name) {
                        throw new Error(`task ${task.id} is assigned to "${assignee}", not you`);
                    }
                    assignee = identity.name;
                }
                // Authorization must happen before the idempotent return: another
                // member must not receive a false success for somebody else's task.
                if (task.status === 'claimed' || task.status === 'in_progress') {
                    if (assignee === undefined || task.assignee !== assignee) {
                        throw new Error(`task ${task.id} is already claimed by "${task.assignee ?? 'nobody'}"`);
                    }
                    return {
                        task_id: task.id,
                        status: task.status,
                        assignee,
                        attempt: task.attempt ?? 0,
                        revision: taskRevisionOf(task),
                        ...task.attemptId === undefined ? {} : { attempt_id: task.attemptId },
                    };
                }
                const pending = unsatisfiedDependencies(fresh.tasks, task.dependencies);
                if (pending.length > 0) {
                    throw new Error(`task ${task.id} is blocked by unfinished dependencies: ${pending.join(', ')} — complete them first`);
                }
                const transition = transitionError(task.status, 'claimed');
                if (transition !== undefined)
                    throw new Error(transition);
                if (assignee === undefined) {
                    throw new Error('claiming an unassigned task needs an assignee (claim on behalf of a member)');
                }
                const busy = memberOpenTask(fresh, assignee, task.id);
                if (busy !== undefined) {
                    throw new Error(`member "${assignee}" is busy with ${busy.id}; finish or reassign it first`);
                }
                const attemptId = beginTaskAttempt(task, assignee);
                advanceTaskRevision(task);
                await writeTeam(stateRoot, fresh);
                appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, caller.session), 'agent-teams/task-updated', {
                    teamId: fresh.id,
                    taskId: task.id,
                    status: task.status,
                    assignee: task.assignee,
                });
                return {
                    task_id: task.id,
                    status: task.status,
                    assignee: task.assignee ?? '',
                    attempt: task.attempt ?? 0,
                    attempt_id: attemptId,
                    revision: taskRevisionOf(task),
                };
            });
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_update_task',
        description: 'Update a task status/output. Members must supply the current attempt_id returned by claim_task; stale attempts are rejected after takeover/reassignment. Terminal results are immutable. A captain must use reassign_task(assignee="captain") before updating member-owned work.',
        parameters: {
            task_id: { type: 'string', required: true, description: 'The task id to update.' },
            status: {
                type: 'string',
                enum: ['in_progress', 'completed', 'failed', 'cancelled'],
                description: 'New status (in_progress, completed, failed, cancelled).',
            },
            output: { type: 'string', description: 'Result summary; set when completing or failing.' },
            attempt_id: { type: 'string', description: 'Current execution capability returned by claim_task (required for members when present on the task).' },
            expected_revision: { type: 'number', description: 'Optional task revision returned by status/claim/update. When omitted, this legacy request is atomically bound to the revision read by the server.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    task_id: { type: 'string', required: true },
                    status: { type: 'string', required: true },
                    output: { type: 'string' },
                    attempt: { type: 'number', required: true },
                    attempt_id: { type: 'string' },
                    revision: { type: 'number', required: true },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Task ${value.task_id} attempt ${value.attempt} → ${value.status}${value.output !== undefined ? `\nOutput: ${value.output}` : ''}`,
                }],
        },
        async execute(args, exec) {
            const caller = requireCaptain(exec);
            const workspace = workspaceOf(caller);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireParticipantTeam(workspace, config, caller);
            const updated = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const { team: fresh, identity } = await requireFreshParticipant(stateRoot, team.id, caller.id);
                const task = requireTask(fresh, args.task_id);
                requireExpectedTaskRevision(task, args.expected_revision);
                if (identity.kind === 'captain'
                    && task.assignee !== undefined
                    && task.assignee !== CAPTAIN_KEY) {
                    throw new Error(`task ${task.id} is owned by member "${task.assignee}"; call agent_teams_reassign_task with assignee="captain" before takeover`);
                }
                if (identity.kind === 'member') {
                    if (task.assignee !== identity.name) {
                        throw new Error(`task ${task.id} is assigned to "${task.assignee ?? 'nobody'}", not you`);
                    }
                    if (task.attemptId !== undefined && args.attempt_id !== task.attemptId) {
                        throw new Error(`stale attempt for task ${task.id}: expected the current attempt_id; stop work and request fresh assignment`);
                    }
                }
                if (TERMINAL_TASK_STATUSES.includes(task.status)) {
                    const sameStatus = args.status === undefined || args.status === task.status;
                    const sameOutput = args.output === undefined || args.output === task.output;
                    if (!sameStatus || !sameOutput) {
                        throw new Error(`terminal task ${task.id} is immutable; use agent_teams_reassign_task to retry failed/cancelled work`);
                    }
                    return {
                        task_id: task.id,
                        status: task.status,
                        attempt: task.attempt ?? 0,
                        revision: taskRevisionOf(task),
                        ...task.attemptId === undefined ? {} : { attempt_id: task.attemptId },
                        ...task.output !== undefined ? { output: task.output } : {},
                    };
                }
                let changed = false;
                if (args.status !== undefined) {
                    const transition = transitionError(task.status, args.status);
                    if (transition !== undefined)
                        throw new Error(transition);
                    task.status = args.status;
                    changed = true;
                    if (task.status === 'in_progress')
                        task.startedAt ??= Date.now();
                    if (TERMINAL_TASK_STATUSES.includes(task.status))
                        task.completedAt = Date.now();
                }
                if (args.output !== undefined && args.output !== task.output) {
                    task.output = args.output;
                    changed = true;
                }
                if (!changed) {
                    return {
                        task_id: task.id,
                        status: task.status,
                        attempt: task.attempt ?? 0,
                        revision: taskRevisionOf(task),
                        ...task.attemptId === undefined ? {} : { attempt_id: task.attemptId },
                        ...task.output === undefined ? {} : { output: task.output },
                    };
                }
                task.updatedAt = Date.now();
                advanceTaskRevision(task);
                await writeTeam(stateRoot, fresh);
                appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, caller.session), 'agent-teams/task-updated', {
                    teamId: fresh.id,
                    taskId: task.id,
                    status: task.status,
                    ...task.assignee !== undefined ? { assignee: task.assignee } : {},
                    ...task.output !== undefined ? { output: task.output } : {},
                });
                return {
                    task_id: task.id,
                    status: task.status,
                    attempt: task.attempt ?? 0,
                    revision: taskRevisionOf(task),
                    ...task.attemptId === undefined ? {} : { attempt_id: task.attemptId },
                    ...task.output !== undefined ? { output: task.output } : {},
                };
            });
            await scheduler.kickTeam(workspace, team.id, team.captainSessionId === caller.id ? caller : undefined);
            return updated;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_send_message',
        description: 'Send a complete execution message to the captain or a teammate. content goes to the private mailbox; display_content is the optional one-sentence, SOUL-voiced update shown in the read-only team chat. Use message_kind="summary" only for the captain\'s final team summary; prompts, hidden reasoning, and secrets must never be sent.',
        parameters: {
            to: { type: 'string', required: true, description: 'Recipient: "captain" or a member name.' },
            content: { type: 'string', required: true, description: 'The message text.' },
            display_content: { type: 'string', description: 'Optional natural Chinese office-chat summary for the user, one sentence and at most 56 characters. Keep complete instructions in content.' },
            from: { type: 'string', description: 'Sender (defaults to the caller: the captain, or the calling member).' },
            task_id: { type: 'string', description: 'Optional related team task id.' },
            mentions: { type: 'array', items: { type: 'string' }, description: 'Optional active participant names mentioned by this message.' },
            reply_to: { type: 'string', description: 'Optional id of an earlier team chat message.' },
            message_kind: {
                type: 'string',
                enum: ['message', 'status', 'discussion', 'assignment', 'objection', 'help', 'decision', 'summary'],
                description: 'Public Agent message kind. Tool, artifact, approval, and system events are emitted by the host; only the captain may send a summary.',
            },
            token_usage: { type: 'number', description: 'Optional non-negative total token count; message text only is stored.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    message_id: { type: 'string', required: true },
                    from: { type: 'string', required: true },
                    to: { type: 'string', required: true },
                    delivered: { type: 'string', required: true, description: 'live (accepted by the live captain), wake (member recipient woken), or mailbox (durable inbox only).' },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Message ${value.message_id} ${value.from} → ${value.to} delivered via ${value.delivered}.`,
                }],
        },
        async execute(args, exec) {
            const caller = requireCaptain(exec);
            const workspace = workspaceOf(caller);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireParticipantTeam(workspace, config, caller);
            const to = args.to.trim();
            const prepared = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const { team: fresh, identity } = await requireFreshParticipant(stateRoot, team.id, caller.id);
                const from = identity.name;
                // `from` may only be the caller's own identity: impersonating another
                // member (or the captain) would poison the mailbox and event records.
                if (args.from !== undefined && args.from !== from) {
                    throw new Error(`agent_teams_send_message: "from" must be your own identity ("${from}"), not "${args.from}"`);
                }
                const kind = (args.message_kind ?? 'message');
                if (!AGENT_TEAM_CHAT_MESSAGE_KINDS.includes(kind)) {
                    throw new Error(`agent_teams_send_message: message kind "${kind}" is reserved for host-generated events`);
                }
                if (kind === 'summary' && identity.kind !== 'captain') {
                    throw new Error('agent_teams_send_message: only the captain may send a summary message');
                }
                const recipient = to === CAPTAIN_KEY ? undefined : requireMember(fresh, to);
                const recipientName = recipient?.name ?? CAPTAIN_KEY;
                if (args.task_id !== undefined)
                    requireTask(fresh, args.task_id);
                const identities = new Set([
                    CAPTAIN_KEY,
                    ...fresh.members.filter(isActiveTeamMember).map(member => member.name),
                ]);
                const mentions = args.mentions ?? [];
                for (const mention of mentions) {
                    if (mention.trim() !== mention || !identities.has(mention)) {
                        throw new Error(`agent_teams_send_message: mention "${mention}" is not an active team identity`);
                    }
                }
                const chat = await readTeamChat(stateRoot, fresh.id);
                if (args.reply_to !== undefined && !chat.some(message => message.id === args.reply_to)) {
                    throw new Error(`agent_teams_send_message: reply target "${args.reply_to}" does not exist in team chat`);
                }
                const budgetError = discussionBudgetError(chat, from, kind, config);
                if (budgetError !== undefined)
                    throw new Error(`agent_teams_send_message: ${budgetError}`);
                // The mailbox is the execution channel; chat.jsonl is a concise
                // user-facing projection of that same coordination event.
                const mailboxContent = args.content;
                const chatMessage = createTeamChatMessage({
                    seq: (chat.at(-1)?.seq ?? 0) + 1,
                    teamId: fresh.id,
                    from,
                    to: recipientName,
                    content: summarizeTeamChatContent(args.display_content ?? mailboxContent, kind),
                    ...(args.task_id === undefined ? {} : { taskId: args.task_id }),
                    ...(mentions.length === 0 ? {} : { mentions }),
                    ...(args.reply_to === undefined ? {} : { replyTo: args.reply_to }),
                    kind,
                    ...(args.token_usage === undefined
                        ? {}
                        : { tokenUsage: { totalTokens: args.token_usage } }),
                });
                await appendTeamChat(stateRoot, fresh.id, chatMessage);
                const message = {
                    ...createMessage(from, recipientName, mailboxContent),
                    id: chatMessage.id,
                    ts: chatMessage.ts,
                    deliveryClaimedAt: Date.now(),
                };
                if (to === CAPTAIN_KEY) {
                    await appendMailbox(stateRoot, fresh.id, CAPTAIN_KEY, message);
                    appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, caller.session), 'agent-teams/message-sent', {
                        teamId: fresh.id,
                        messageId: message.id,
                        from,
                        to: CAPTAIN_KEY,
                        content: mailboxContent,
                        ts: message.ts,
                    });
                    return { kind: 'captain', fresh, identity, message, from };
                }
                await appendMailbox(stateRoot, fresh.id, recipient.name, message);
                appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, caller.session), 'agent-teams/message-sent', {
                    teamId: fresh.id,
                    messageId: message.id,
                    from,
                    to: recipient.name,
                    content: mailboxContent,
                    ts: message.ts,
                });
                return { kind: 'member', fresh, identity, message, from, recipient: recipient };
            });
            // Resolve the exact live captain only after releasing the state lock.
            // The plugin mailbox is already durable if live delivery cannot proceed.
            const captain = ctx.agents.get(prepared.fresh.captainSessionId);
            if (prepared.kind === 'captain') {
                let delivered = 'mailbox';
                if (captain !== undefined && prepared.identity.kind === 'member') {
                    delivered = steerCaptainReport(captain, prepared.from, prepared.message.content) ? 'live' : 'mailbox';
                }
                if (delivered === 'live') {
                    await withTeamLock(teamLockKey(stateRoot, prepared.fresh.id), () => (acknowledgeMailbox(stateRoot, prepared.fresh.id, CAPTAIN_KEY, [prepared.message.id])));
                }
                else {
                    await withTeamLock(teamLockKey(stateRoot, prepared.fresh.id), () => (releaseMailboxDelivery(stateRoot, prepared.fresh.id, CAPTAIN_KEY, [prepared.message.id])));
                }
                return { message_id: prepared.message.id, from: prepared.from, to: CAPTAIN_KEY, delivered };
            }
            let delivered = 'mailbox';
            if (captain !== undefined && prepared.recipient.id !== '') {
                const senderText = prepared.from === CAPTAIN_KEY
                    ? prepared.message.content
                    : `Message from team member ${prepared.from}:\n\n${prepared.message.content}`;
                const text = `AgentTeams state policy: inspect ${config.stateDir}/${prepared.fresh.id}/ read-only; never edit team.json or inbox files directly. Use agent_teams_* tools for team state.\n\n${senderText}`;
                const accepted = await deliverToMember(ctx, captain, prepared.recipient.id, text, exec.signal);
                delivered = accepted ? 'wake' : 'mailbox';
                if (accepted) {
                    await withTeamLock(teamLockKey(stateRoot, prepared.fresh.id), () => (acknowledgeMailbox(stateRoot, prepared.fresh.id, prepared.recipient.name, [prepared.message.id])));
                }
            }
            if (delivered === 'mailbox') {
                await withTeamLock(teamLockKey(stateRoot, prepared.fresh.id), () => (releaseMailboxDelivery(stateRoot, prepared.fresh.id, prepared.recipient.name, [prepared.message.id])));
            }
            return {
                message_id: prepared.message.id,
                from: prepared.from,
                to: prepared.recipient.name,
                delivered,
            };
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_status',
        description: 'Team snapshot: members with live activity and tasks with status/assignee/dependencies/output. Captains also see every team mailbox; members see only their own inbox. Poll this to watch progress.',
        parameters: {},
        output: {
            schema: { type: 'object', additionalProperties: true, properties: {} },
            render: (_args, value) => [{ type: 'text', text: renderStatus(value) }],
        },
        async execute(_args, exec) {
            const caller = requireCaptain(exec);
            const workspace = workspaceOf(caller);
            const stateRoot = stateRootOf(workspace, config);
            const located = await requireParticipantTeam(workspace, config, caller);
            if (located.captainSessionId === caller.id) {
                await scheduler.kickTeam(workspace, located.id, caller);
            }
            const { team, identity } = await withTeamLock(teamLockKey(stateRoot, located.id), () => requireFreshParticipant(stateRoot, located.id, caller.id));
            const activity = await memberActivity(ctx, team.captainSessionId);
            const members = team.members
                // Captains must be able to diagnose a proposal that never activated;
                // only removed members are hidden from the active Team status view.
                .filter((member) => member.status !== 'removed')
                .map((member) => ({
                name: member.name,
                role: member.role ?? '',
                provider: member.provider ?? '',
                model: member.model ?? '',
                reasoning_effort: member.reasoningEffort ?? '',
                status: member.status,
                activity: member.id !== '' ? (activity.get(member.id) ?? 'unknown') : 'unspawned',
            }));
            const tasks = team.tasks.map((task) => ({
                id: task.id,
                subject: task.subject,
                status: task.status,
                assignee: task.assignee ?? '',
                dependencies: task.dependencies,
                attempt: task.attempt ?? 0,
                revision: taskRevisionOf(task),
                attempt_id: task.attemptId ?? '',
                reassigning: task.reassigning === true,
                ...task.output !== undefined ? { output: task.output } : {},
            }));
            const mailboxWarnings = [];
            let mailboxWarningCount = 0;
            const reportMalformed = (agentKey) => (lineNumber) => {
                mailboxWarningCount += 1;
                if (mailboxWarnings.length < 10) {
                    mailboxWarnings.push(`${agentKey} mailbox line ${lineNumber}`);
                }
            };
            const captainInbox = identity.kind === 'captain'
                ? await readUnreadMailbox(stateRoot, team.id, CAPTAIN_KEY, reportMalformed(CAPTAIN_KEY))
                : [];
            const memberInboxes = {};
            const visibleMembers = identity.kind === 'captain'
                ? members
                : members.filter((member) => member.name === identity.name);
            for (const member of visibleMembers) {
                const messages = await readUnreadMailbox(stateRoot, team.id, member.name, reportMalformed(member.name));
                if (messages.length > 0) {
                    memberInboxes[member.name] = {
                        count: messages.length,
                        latest: messages[messages.length - 1]?.content.slice(0, 200) ?? '',
                    };
                }
            }
            const result = {
                team_id: team.id,
                team_name: team.name,
                description: team.description ?? '',
                viewer: identity.name,
                members,
                tasks,
                captain_inbox: captainInbox.slice(-10).map((message) => ({
                    from: message.from,
                    content: message.content,
                    ts: message.ts,
                })),
                member_inboxes: memberInboxes,
                mailbox_warnings: mailboxWarnings,
                mailbox_warning_count: mailboxWarningCount,
            };
            const acknowledged = identity.kind === 'captain'
                ? captainInbox.map(message => message.id)
                : await readUnreadMailbox(stateRoot, team.id, identity.name).then(messages => messages.map(message => message.id));
            if (acknowledged.length > 0) {
                await withTeamLock(teamLockKey(stateRoot, team.id), () => (acknowledgeMailbox(stateRoot, team.id, identity.kind === 'captain' ? CAPTAIN_KEY : identity.name, acknowledged)));
            }
            return result;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'agent_teams_delete',
        description: 'End your team: interrupts all members (best effort) and deletes the team\'s state directory (team file, tasks, mailboxes). Use when the team\'s work is done or abandoned.',
        parameters: {},
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    deleted: { type: 'boolean', required: true },
                    team_name: { type: 'string', required: true },
                },
            },
            render: (args, value) => [{
                    type: 'text',
                    text: `Team "${value.team_name}" deleted.`,
                }],
        },
        async execute(_args, exec) {
            const captain = requireCaptain(exec);
            const workspace = workspaceOf(captain);
            const stateRoot = stateRootOf(workspace, config);
            const team = await requireCaptainTeam(workspace, config, captain);
            const members = await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const fresh = await requireFreshCaptainTeam(stateRoot, team.id, captain.id);
                // Include previously removed members so deleting a pre-fix team also
                // retires durable catalog entries left behind by remove_member.
                const roster = fresh.members.map(member => ({ ...member }));
                for (const member of fresh.members) {
                    if (!isActiveTeamMember(member))
                        continue;
                    member.status = 'removed';
                    for (const task of fresh.tasks) {
                        if (task.assignee === member.name && task.status !== 'completed') {
                            invalidateTaskAttempt(task);
                            advanceTaskRevision(task);
                        }
                    }
                }
                await writeTeam(stateRoot, fresh);
                return roster;
            });
            await recordRetiredMemberIds(stateRoot, members.map(member => member.id));
            for (const member of members) {
                if (member.id === '')
                    continue;
                interruptMember(ctx, captain, member.id);
            }
            const quiescence = await Promise.allSettled(members.map(member => waitForMemberIdle(ctx, member, exec.signal)));
            for (const result of quiescence) {
                if (result.status === 'rejected') {
                    ctx.logger.warn(`agent-teams: member did not quiesce cleanly before team archive: ${String(result.reason)}`);
                }
            }
            await withTeamLock(teamLockKey(stateRoot, team.id), async () => {
                const fresh = await requireFreshCaptainTeam(stateRoot, team.id, captain.id);
                appendTeamEvent(ctx, captainSessionOf(ctx, fresh.captainSessionId, captain.session), 'agent-teams/team-deleted', {
                    teamId: fresh.id,
                });
                // Archive, not delete: tasks (with their dependency graph) and the
                // mailboxes stay on disk for later review and dependency rebuilds.
                await archiveTeamDir(stateRoot, fresh.id);
            });
            return { deleted: true, team_name: team.name };
        },
    }));
}
/** Build the `memberRuntime` config handed to member helpers. */
function memberRuntime(config) {
    return {
        provider: config.memberProvider,
        maxDepth: config.memberMaxDepth,
    };
}
/** Render the status snapshot as compact text for the model. */
function renderStatus(value) {
    const team = value;
    const lines = [
        `Team "${team.team_name}"${team.description ? ` — ${team.description}` : ''}`,
        `Viewing as: ${team.viewer}`,
        `Members (${team.members.length}):`,
        ...team.members.map((member) => {
            const route = member.provider && member.model ? ` · ${member.provider}/${member.model}` : '';
            const effort = member.reasoning_effort ? ` · reasoning ${member.reasoning_effort}` : '';
            return `  - ${member.name} [${member.role}] ${member.status}/${member.activity}${route}${effort}`;
        }),
        `Tasks (${team.tasks.length}):`,
        ...team.tasks.map((task) => {
            const deps = task.dependencies.length > 0 ? ` (deps: ${task.dependencies.join(',')})` : '';
            const output = task.output !== undefined ? `\n      output: ${task.output.slice(0, 300)}` : '';
            const handoff = task.reassigning ? ' (reassigning)' : '';
            return `  - ${task.id} [${task.status}] attempt ${task.attempt}${handoff} ${task.subject} → ${task.assignee || 'unassigned'}${deps}${output}`;
        }),
        `Captain inbox (${team.captain_inbox.length}):`,
        ...team.captain_inbox.map((message) => `  - [${message.from}] ${message.content.slice(0, 200)}`),
    ];
    for (const [name, inbox] of Object.entries(team.member_inboxes)) {
        lines.push(`Member inbox ${name} (${inbox.count}): latest — ${inbox.latest.slice(0, 120)}`);
    }
    if (team.mailbox_warning_count > 0) {
        lines.push(`Mailbox warnings (${team.mailbox_warning_count}; malformed lines were skipped; showing up to 10):`, ...team.mailbox_warnings.map((warning) => `  - ${warning}`));
    }
    return lines.join('\n');
}
