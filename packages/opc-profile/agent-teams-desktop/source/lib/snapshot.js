/**
 * Team activity snapshot assembly for the activity panel.
 *
 * Server-side assembly mirrors the Claude Code desktop teamWatcher: read the
 * durable team files (the truth source) and enrich with live subagent
 * activity, so the panel always reflects the on-disk state even when a model
 * skipped a tool "ritual" (e.g. not calling update_task on completion).
 * @module dsh-agent-teams/snapshot
 */
import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { CAPTAIN_KEY, listArchivedTeamIds, readArchivedTeam, readTeamChat, readUnreadMailbox, readTeam, taskDepthsById, taskVisualState, } from "./state.js";
import { producedFilePaths, summarizeToolActivity } from "./tool-activity.js";
const OUTPUT_FILE_PATTERN = /(?:`([^`]+\.(?:md|txt|pdf|docx|xlsx|csv|json|srt|mp4|mp3|wav|png|jpe?g|webp|mov|m4v|webm))`|(?:^|[\s：:，,（(])([^\s：:，,）)`]+\.(?:md|txt|pdf|docx|xlsx|csv|json|srt|mp4|mp3|wav|png|jpe?g|webp|mov|m4v|webm))(?=$|[\s。！!，,）)`]))/giu;
/** Extract actual workspace files explicitly named in a task completion summary. */
export async function outputArtifacts(output, workspace, workspacePath) {
    if (output === undefined)
        return [];
    const artifacts = [];
    const seen = new Set();
    for (const match of output.matchAll(OUTPUT_FILE_PATTERN)) {
        const raw = (match[1] ?? match[2])?.trim();
        if (raw === undefined)
            continue;
        const filePath = isAbsolute(raw) ? resolve(raw) : resolve(workspacePath, raw);
        const path = relative(workspacePath, filePath);
        if (path === '' || path.startsWith('..') || isAbsolute(path) || seen.has(path))
            continue;
        try {
            if (!(await stat(filePath)).isFile())
                continue;
        }
        catch {
            continue;
        }
        seen.add(path);
        artifacts.push({
            name: basename(path),
            url: `/plugins/dsh-agent-teams/files?workspace=${encodeURIComponent(workspace)}&path=${encodeURIComponent(path)}`,
        });
    }
    return artifacts;
}
/** A task with text-only output remains a first-class downloadable deliverable. */
function taskReportArtifact(workspace, teamId, task) {
    if (task.status !== 'completed' || task.output?.trim() === '')
        return undefined;
    return {
        name: `${task.id}-任务报告.md`,
        url: `/plugins/dsh-agent-teams/task-output?workspace=${encodeURIComponent(workspace)}&teamId=${encodeURIComponent(teamId)}&taskId=${encodeURIComponent(task.id)}`,
    };
}
/** The current task of a member: its first unfinished owned task. */
function currentTaskOf(memberName, tasks) {
    for (const task of tasks) {
        if (task.status === 'in_progress' && task.assignee === memberName)
            return task.id;
    }
    return '';
}
/** Read a minimal, sanitized tool trace for a member without exposing arguments or outputs. */
export async function memberToolActivity(ctx, memberId) {
    return summarizeToolActivity(await memberSessionEvents(ctx, memberId));
}
async function memberSessionEvents(ctx, memberId) {
    if (memberId === '')
        return [];
    const live = ctx.agents.get(memberId)?.session;
    if (live !== undefined)
        return live.events;
    const getService = ctx.get;
    if (typeof getService !== 'function')
        return [];
    const persistence = getService.call(ctx, 'sessionPersistence');
    if (persistence?.inspect === undefined)
        return [];
    try {
        return (await persistence.inspect(memberId)).events;
    }
    catch (error) {
        ctx.logger.debug(`agent-teams: tool activity unavailable for ${memberId}: ${String(error)}`);
        return [];
    }
}
/**
 * Assemble one team snapshot from its durable files plus live activity.
 * @param ctx - the plugin context (injects `subagents`, used for activity).
 * @param stateRoot - resolved absolute state root of the owning workspace.
 * @param workspace - display name of the owning workspace.
 * @param state - the durable team record.
 * @returns the panel snapshot.
 */
export async function assembleTeamSnapshot(ctx, stateRoot, workspace, state, options = {}) {
    const tasks = state.tasks;
    const depths = taskDepthsById(tasks);
    const roster = options.includeRemoved === true
        ? state.members
        : state.members.filter((member) => member.status !== 'removed');
    const activity = new Map();
    if (options.historic !== true) {
        try {
            const children = await ctx.subagents.listChildren(state.captainSessionId);
            for (const entry of children) {
                if (entry.kind === 'child') {
                    const live = ctx.agents.get(entry.id);
                    activity.set(entry.id, live === undefined ? 'ready' : live.status);
                }
            }
        }
        catch (error) {
            ctx.logger.warn(`agent-teams: activity listing failed for ${state.name}: ${String(error)}`);
        }
    }
    const unreadByMember = new Map();
    for (const member of roster) {
        try {
            unreadByMember.set(member.name, (await readUnreadMailbox(stateRoot, state.id, member.name)).length);
        }
        catch (error) {
            ctx.logger.warn(`agent-teams: mailbox read failed for ${member.name}: ${String(error)}`);
            unreadByMember.set(member.name, 0);
        }
    }
    const eventsByMember = new Map();
    await Promise.all(roster.map(async (member) => {
        eventsByMember.set(member.name, await memberSessionEvents(ctx, member.id));
    }));
    const members = await Promise.all(roster.map(async (member) => {
        const owned = tasks.filter((task) => task.assignee === member.name);
        const done = owned.filter((task) => task.status === 'completed').length;
        return {
            id: member.id,
            name: member.name,
            role: member.role ?? '',
            status: member.status,
            activity: options.historic === true
                ? 'idle'
                : member.id !== ''
                    ? (activity.get(member.id) === 'running'
                        ? 'working'
                        : activity.get(member.id) === 'idle' || activity.get(member.id) === 'ready'
                            ? 'idle'
                            : 'unknown')
                    : 'unknown',
            progress: owned.length === 0 ? 0 : Math.round((done / owned.length) * 100),
            done,
            total: owned.length,
            currentTask: currentTaskOf(member.name, tasks),
            unread: unreadByMember.get(member.name) ?? 0,
            tools: summarizeToolActivity(eventsByMember.get(member.name) ?? []),
            ...(member.agentId === undefined ? {} : { agentId: member.agentId }),
            ...(member.agentVersion === undefined ? {} : { agentVersion: member.agentVersion }),
            ...(member.soulId === undefined ? {} : { soulId: member.soulId }),
            ...(member.selectionReason === undefined ? {} : { selectionReason: member.selectionReason }),
            ...(member.createdFromTaskId === undefined ? {} : { createdFromTaskId: member.createdFromTaskId }),
            ...(member.soulSummary === undefined ? {} : { soulSummary: member.soulSummary }),
            ...(member.agentVersion === undefined ? {} : { soulVersion: member.agentVersion }),
        };
    }));
    const memberArtifactPaths = roster.flatMap(member => producedFilePaths(eventsByMember.get(member.name) ?? []));
    const memberArtifacts = await outputArtifacts(memberArtifactPaths.map(path => `\`${path}\``).join('\n'), workspace, dirname(stateRoot));
    const captainInbox = await readUnreadMailbox(stateRoot, state.id, CAPTAIN_KEY);
    let chat = [];
    try {
        chat = await readTeamChat(stateRoot, state.id);
    }
    catch (error) {
        ctx.logger.warn(`agent-teams: chat read failed for ${state.name}: ${String(error)}`);
    }
    return {
        workspace,
        teamId: state.id,
        name: state.name,
        ...state.description !== undefined ? { description: state.description } : {},
        captainSessionId: state.captainSessionId,
        members,
        artifacts: memberArtifacts,
        tasks: await Promise.all(tasks.map(async (task) => {
            const artifacts = await outputArtifacts(task.output, workspace, dirname(stateRoot));
            const report = artifacts.length === 0 ? taskReportArtifact(workspace, state.id, task) : undefined;
            return {
                id: task.id,
                subject: task.subject,
                status: task.status,
                state: taskVisualState(task.status, task.dependencies, tasks),
                assignee: task.assignee ?? '',
                dependencies: task.dependencies,
                depth: depths.get(task.id) ?? 0,
                createdAt: task.createdAt,
                ...task.startedAt === undefined ? {} : { startedAt: task.startedAt },
                ...task.completedAt === undefined ? {} : { completedAt: task.completedAt },
                artifacts: report === undefined ? artifacts : [...artifacts, report],
            };
        })),
        messageCount: chat.length,
        chatCursor: String(chat.at(-1)?.seq ?? 0),
        recentMessages: chat.slice(-20),
        captainInbox: captainInbox.slice(-5).map((message) => ({
            from: message.from,
            content: message.content,
        })),
    };
}
/**
 * Collect every team under the given workspace state roots.
 * @param ctx - the plugin context.
 * @param roots - `{ workspace, stateRoot }` pairs (resolved absolute roots).
 * @returns the snapshots in stable order (workspace, then team id).
 */
export async function collectTeamsActivity(ctx, roots) {
    const snapshots = [];
    for (const root of roots) {
        let entries;
        try {
            entries = await readdir(root.stateRoot, { withFileTypes: true });
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                continue;
            }
            throw error;
        }
        for (const entry of entries) {
            if (!entry.isDirectory())
                continue;
            try {
                const state = await readTeam(root.stateRoot, entry.name);
                if (state === undefined)
                    continue;
                snapshots.push(await assembleTeamSnapshot(ctx, root.stateRoot, root.workspace, state));
            }
            catch {
                ctx.logger.warn(`agent-teams: skipped unreadable team state "${entry.name}" in workspace "${root.workspace}"`);
            }
        }
    }
    return snapshots;
}
/**
 * Collect every archived team under the given workspace state roots (the
 * `archive/` subdirectory of each state root). Used by the historic panel
 * path to restore full team detail after deletion.
 * @param ctx - the plugin context.
 * @param roots - `{ workspace, stateRoot }` pairs.
 * @returns the archived snapshots in stable order.
 */
export async function collectArchivedTeamsActivity(ctx, roots) {
    const snapshots = [];
    for (const root of roots) {
        for (const teamId of await listArchivedTeamIds(root.stateRoot)) {
            try {
                const state = await readArchivedTeam(root.stateRoot, teamId);
                if (state === undefined)
                    continue;
                snapshots.push(await assembleTeamSnapshot(ctx, join(root.stateRoot, 'archive'), root.workspace, state, { includeRemoved: true, historic: true }));
            }
            catch {
                ctx.logger.warn(`agent-teams: skipped unreadable archived team "${teamId}" in workspace "${root.workspace}"`);
            }
        }
    }
    return snapshots;
}
