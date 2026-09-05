import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * AgentTeams activity panel: the top-right floater monitoring every team.
 *
 * Modeled on the Claude Code desktop SessionActivityPanel: a fixed glass
 * panel at the top-right corner. On wide viewports it cooperatively makes the
 * conversation column yield space; narrow viewports keep overlay mode. It
 * polls the host `/plugins/dsh-agent-teams/state` route for
 * server-side snapshots (durable files + live subagent activity), with a
 * collapsed badge that auto-expands once when activity appears. Archived
 * teams stay available for the owning conversation after live work ends.
 *
 * The floater mounts through a body portal (no top-right slot exists in the
 * web shell); it is not a conversation node — the in-conversation panel was
 * removed in favor of this always-available monitor.
 * @module dsh-agent-teams/client/activity
 */
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { IconBranchOutline16, IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { TriangleAlert } from 'lucide-react';
import { compactDagLayout, COMPACT_DAG_NODE_HEIGHT, COMPACT_DAG_NODE_WIDTH, dependencyFocusTaskId, relatedTaskIds, usesParallelTaskGrid, } from "./activity-model.js";
import { getActivityMonitorTargetsSnapshot, getActivitySnapshotsSnapshot, startActivityPolling, subscribeActivityMonitorTargets, subscribeActivitySnapshots, } from "./activity-monitor.js";
import { TeamArtifactsView, TeamChatView } from "./TeamChatView.js";
import { ACTION_ART, LEAD_ART, memberArtUrl } from "./artwork.js";
import { OPEN_PANEL_EVENT } from "./AgentTeamsCard.js";
import { groupToolIndicators, ToolIcon } from "./tool-icons.js";
import { ToolLibraryView } from "./ToolLibraryView.js";
import { AgentProfilesView } from "./AgentProfilesView.js";
import css from './ActivityPanel.module.css';
/** Grace before the panel collapses once no team remains. */
const AUTOCLOSE_GRACE_MS = 2000;
/**
 * Page-settle window after mount: activity restored on page load only shows
 * the collapsed badge, so the panel never yanks the conversation column
 * right after load. New activity after this window auto-expands as usual.
 */
const AUTO_OPEN_SETTLE_MS = 4000;
/** Root marker shared with the panel CSS while the portal is expanded. */
const PANEL_OPEN_ATTRIBUTE = 'data-agent-teams-panel-open';
/** Initial-letter fallback for unmatched roles. */
function memberInitial(name) {
    return name.trim().slice(0, 1).toUpperCase() || '?';
}
/** Internal role slugs (for example `researcher`) are not user-facing names. */
function visibleRoleLabel(role) {
    const value = role.trim();
    return /\p{Script=Han}/u.test(value) ? value : '';
}
function stableHash(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
}
const ACCENTS = [
    'var(--dsw-alias-state-business-primary)',
    'var(--dsw-alias-state-success)',
    'var(--dsw-alias-state-danger)',
    'var(--dsw-alias-state-warning)',
    'var(--dsw-alias-label-tertiary)',
];
function accentOf(id) {
    return ACCENTS[stableHash(id) % ACCENTS.length] ?? ACCENTS[0];
}
/** Badge text follows the raw task status (finer than the 4 visual states):
 * claimed/pending/failed/cancelled keep their own labels and colors. */
const TASK_STATUS_LABEL = {
    pending: '待领取',
    claimed: '已认领',
    in_progress: '进行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
};
function taskStatusLabel(status) {
    return TASK_STATUS_LABEL[status] ?? status;
}
function taskTimeLabel(value) {
    if (value === undefined || !Number.isFinite(value))
        return '未开始';
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(new Date(value));
}
function isTeamControlTool(id) {
    return id.startsWith('agent_teams_');
}
function MemberToolTrace({ member }) {
    const tools = groupToolIndicators(member.tools.filter((tool) => !isTeamControlTool(tool.id)));
    if (tools.length === 0)
        return null;
    return _jsx("span", { className: css.memberToolTrace, "aria-label": `${member.name} 的工具调用`, children: tools.map((tool) => {
            const failureTitle = tool.failures === 0 ? '' : ` · ${tool.failures} 次失败${tool.lastError === undefined ? '' : `：${tool.lastError}`}`;
            const toolNames = tool.labels.join('、');
            return _jsxs("span", { className: css.memberToolTag, "data-failed": tool.failures > 0, title: `${toolNames} · 合计调用 ${tool.calls} 次${failureTitle}`, children: [_jsx(ToolIcon, { toolId: tool.representativeId, size: 13 }), _jsx("span", { className: css.memberToolCount, children: tool.calls }), tool.failures > 0 && _jsx(TriangleAlert, { className: css.memberToolFailure, size: 11, strokeWidth: 2.4, "aria-label": `${toolNames} 有 ${tool.failures} 次调用失败` })] }, tool.iconKey);
        }) });
}
/** Badge/bar coloring key: visual state, widened for terminal statuses. */
function taskTone(state, status) {
    if (status === 'failed')
        return 'failed';
    if (status === 'cancelled')
        return 'cancelled';
    return state;
}
function Chevron({ open }) {
    return (_jsx("svg", { className: css.chevron, "data-open": open, width: "9", height: "9", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", "aria-hidden": true, children: _jsx("path", { d: "M3.5 2l3 3-3 3" }) }));
}
function WorkGlyph({ active }) {
    return (_jsx("svg", { className: css.workGlyph, "data-active": active, width: "11", height: "11", viewBox: "0 0 11 11", fill: "currentColor", "aria-hidden": true, children: [[0, 0], [4.2, 0], [8.4, 0], [0, 4.2], [4.2, 4.2], [8.4, 4.2]].map(([x, y], index) => (_jsx("rect", { x: x, y: y, width: "2.6", height: "2.6", rx: ".6", style: { animationDelay: `${index * 0.15}s` } }, `${x}:${y}`))) }));
}
/** Collapsed badge: an always-visible corner pill while any team exists. */
function CollapsedBadge({ count, busy, onClick }) {
    return (_jsxs("button", { type: "button", className: css.badge, "data-busy": busy, onClick: onClick, "aria-label": `AgentTeams 活动，${count} 个团队`, children: [_jsx("span", { className: css.badgeDot, "data-busy": busy, "aria-hidden": true }), _jsx("span", { className: css.badgeCount, children: count })] }));
}
function memberStateLabel(member, tasks, historic) {
    const owned = tasks.filter((task) => task.assignee === member.name);
    if (member.activity === 'working')
        return '工作中';
    if (owned.some((task) => task.status === 'failed'))
        return '有失败';
    if (owned.some((task) => task.state === 'blocked'))
        return '等待';
    if (owned.length > 0 && owned.every((task) => task.status === 'completed'))
        return '已交付';
    if (member.status === 'removed')
        return historic ? '已离队' : '已移除';
    if (owned.length > 0)
        return '待执行';
    return '待派工';
}
function memberStatusText(member, tasks) {
    const owned = tasks.filter((task) => task.assignee === member.name);
    const current = owned.find((task) => task.id === member.currentTask);
    const blocked = owned.find((task) => task.state === 'blocked');
    if (member.activity === 'working' && current !== undefined)
        return `正在执行 ${current.id}`;
    if (member.activity === 'working')
        return '正在处理已派任务';
    if (blocked !== undefined) {
        const dependency = tasks.find((task) => blocked.dependencies.includes(task.id) && task.state !== 'completed');
        if (dependency !== undefined)
            return `等待 ${dependency.id} · ${dependency.assignee || '待认领'}`;
        return '等待前置任务';
    }
    if (member.total === 0)
        return '等待组长派工';
    if (member.done === member.total)
        return '任务已交付';
    return member.activity === 'idle' ? '待继续执行' : '状态未知';
}
function compactTaskLabel(subject) {
    const withoutVerb = subject.replace(/^开发\s*/u, '').replace(/^\d+[-_.、\s]*/u, '');
    const head = withoutVerb.split(/[（(·：:]/u)[0]?.trim() ?? withoutVerb;
    return head.length > 18 ? `${head.slice(0, 17)}…` : head;
}
function taskSummary(team) {
    const completed = team.tasks.filter((task) => task.status === 'completed');
    const running = team.tasks.filter((task) => task.state === 'running');
    const blocked = team.tasks.filter((task) => task.state === 'blocked');
    const ready = team.tasks.filter((task) => task.state === 'open' && task.status !== 'completed');
    if (team.tasks.length === 0)
        return '等待组长拆解任务';
    if (completed.length === team.tasks.length)
        return `全部 ${completed.length} 项任务已交付`;
    if (blocked.length > 0 && running.length > 0) {
        return `${blocked.slice(0, 3).map((task) => task.id).join('、')}${blocked.length > 3 ? ` 等 ${blocked.length} 项` : ''} 等待前置，其余已开工`;
    }
    if (running.length > 0)
        return `${running.map((task) => task.id).join('、')} 正在执行`;
    if (ready.length > 0)
        return `${ready.map((task) => task.id).join('、')} 已就绪待开工`;
    if (blocked.length > 0)
        return `${blocked.map((task) => task.id).join('、')} 等待前置`;
    return '等待下一轮调度';
}
function ProgressOverview({ team }) {
    const running = team.tasks.filter((task) => task.state === 'running').length;
    const blocked = team.tasks.filter((task) => task.state === 'blocked').length;
    const completed = team.tasks.filter((task) => task.status === 'completed').length;
    const summaryTone = blocked > 0 ? 'warning' : completed === team.tasks.length && team.tasks.length > 0 ? 'completed' : 'running';
    return (_jsxs("section", { className: css.progressOverview, "aria-label": "\u56E2\u961F\u603B\u8FDB\u5EA6", "data-progress-summary": true, children: [_jsx("span", { className: css.progressTitle, children: "\u603B\u8FDB\u5EA6" }), team.tasks.length > 0 ? (_jsx("span", { className: css.progressSegments, "aria-hidden": true, children: team.tasks.map((task) => _jsx("span", { "data-state": taskTone(task.state, task.status) }, task.id)) })) : _jsx("span", { className: css.progressEmpty }), _jsxs("span", { className: css.progressLegend, children: [_jsxs("span", { "data-state": "running", children: ["\u25A0 \u8FDB\u884C\u4E2D ", running] }), _jsxs("span", { "data-state": "blocked", children: ["\u25A0 \u7B49\u5F85\u4F9D\u8D56 ", blocked] }), _jsxs("span", { "data-state": "completed", children: ["\u25A0 \u5DF2\u4EA4\u4ED8 ", completed] })] }), _jsxs("span", { className: css.progressSummary, "data-state": summaryTone, children: [_jsx("span", { className: css.progressSummaryDot }), _jsx("span", { children: taskSummary(team) })] })] }));
}
function DependencyMap({ tasks }) {
    const [open, setOpen] = useState(true);
    const [hoverTaskId, setHoverTaskId] = useState(null);
    const [keyboardTaskId, setKeyboardTaskId] = useState(null);
    const [pinnedTaskId, setPinnedTaskId] = useState(null);
    const hoverTimer = useRef(null);
    const focusedTaskId = dependencyFocusTaskId(pinnedTaskId, keyboardTaskId, hoverTaskId);
    const layout = useMemo(() => compactDagLayout(tasks), [tasks]);
    const parallel = useMemo(() => usesParallelTaskGrid(tasks), [tasks]);
    const related = useMemo(() => focusedTaskId === null ? null : relatedTaskIds(focusedTaskId, tasks), [focusedTaskId, tasks]);
    const scheduleHover = (id) => {
        if (hoverTimer.current !== null) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
        if (id === null) {
            setHoverTaskId(null);
            return;
        }
        hoverTimer.current = setTimeout(() => {
            hoverTimer.current = null;
            setHoverTaskId(id);
        }, 180);
    };
    useEffect(() => () => {
        if (hoverTimer.current !== null)
            clearTimeout(hoverTimer.current);
    }, []);
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setPinnedTaskId(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => { window.removeEventListener('keydown', onKeyDown); };
    }, []);
    if (tasks.length === 0)
        return null;
    const fallbackTask = tasks.find((task) => task.state === 'blocked')
        ?? tasks.find((task) => task.state === 'running')
        ?? tasks[0];
    const detailTask = tasks.find((task) => task.id === focusedTaskId) ?? fallbackTask;
    const waitingOn = detailTask.dependencies.filter((dependency) => (tasks.find((task) => task.id === dependency)?.status !== 'completed'));
    const dependents = tasks.filter((task) => task.dependencies.includes(detailTask.id));
    return (_jsxs("section", { className: css.dependencySection, "aria-label": "\u4EFB\u52A1\u4F9D\u8D56\u94FE", "data-dependency-map": true, children: [_jsxs("header", { className: css.sectionHead, children: [_jsxs("button", { type: "button", className: css.sectionToggleTitle, onClick: () => { setOpen((current) => !current); }, "aria-expanded": open, children: [_jsx(Chevron, { open: open }), _jsx(IconBranchOutline16, {}), " ", parallel ? '并行任务' : '任务依赖'] }), _jsx("span", { className: css.sectionHint, children: pinnedTaskId === null
                            ? parallel ? '无前后依赖 · 点击查看详情' : '悬停高亮依赖链 · 点击固定'
                            : `${pinnedTaskId} 已固定 · Esc 取消` })] }), open && (_jsxs(_Fragment, { children: [_jsx("div", { className: css.dagViewport, children: _jsxs("div", { className: css.dagCanvas, "data-layout": parallel ? 'parallel' : 'dependency', style: parallel ? undefined : { width: layout.width, height: layout.height }, children: [!parallel && _jsx("svg", { className: css.dagEdges, width: layout.width, height: layout.height, "aria-hidden": true, children: layout.edges.map((edge) => {
                                        const active = related !== null && related.has(edge.from) && related.has(edge.to);
                                        return _jsx("path", { d: edge.path, "data-active": active, "data-dimmed": related !== null && !active }, `${edge.from}:${edge.to}`);
                                    }) }), layout.nodes.map(({ task, x, y }) => (_jsxs("button", { type: "button", className: css.dagNode, style: parallel
                                        ? { height: COMPACT_DAG_NODE_HEIGHT }
                                        : { left: x, top: y, width: COMPACT_DAG_NODE_WIDTH, height: COMPACT_DAG_NODE_HEIGHT }, "data-task-id": task.id, "data-state": taskTone(task.state, task.status), "data-focused": related?.has(task.id) ?? false, "data-dimmed": related !== null && !related.has(task.id), "aria-pressed": pinnedTaskId === task.id, title: `${task.id} · ${task.subject}`, onClick: () => { setPinnedTaskId((current) => current === task.id ? null : task.id); }, onMouseEnter: () => { scheduleHover(task.id); }, onMouseLeave: () => { scheduleHover(null); }, onFocus: () => { setKeyboardTaskId(task.id); }, onBlur: () => { setKeyboardTaskId(null); }, children: [_jsxs("span", { className: css.dagNodeHead, children: [_jsx("span", { className: css.dagNodeDot }), task.id] }), _jsx("span", { className: css.dagNodeLabel, children: compactTaskLabel(task.subject) }), task.state === 'running' && (_jsx("span", { className: css.dagRunningState, "aria-label": "\u8FD0\u884C\u4E2D", children: _jsx(WorkGlyph, { active: true }) }))] }, task.id)))] }) }), _jsxs("section", { className: css.taskDetail, "data-task-detail": detailTask.id, children: [_jsxs("span", { className: css.taskDetailHead, children: [_jsx("span", { className: css.taskDetailId, children: detailTask.id }), _jsx("span", { className: css.taskDetailSubject, title: detailTask.subject, children: detailTask.subject.replace(/^开发\s*/u, '') }), _jsx("span", { className: css.taskDetailBadge, "data-state": taskTone(detailTask.state, detailTask.status), children: taskStatusLabel(detailTask.status) })] }), _jsxs("span", { className: css.taskDetailLine, children: [detailTask.assignee || '待认领', " \u00B7 ", detailTask.status === 'completed'
                                        ? '已完成并交付'
                                        : detailTask.dependencies.length === 0
                                            ? '无前置，可立即开工'
                                            : waitingOn.length === 0
                                                ? '前置已就绪，可开工'
                                                : `等待 ${waitingOn.join('、')}`] }), _jsx("span", { className: css.taskDetailMeta, children: dependents.length === 0 ? '无下游任务' : `完成后解锁 ${dependents.map((task) => task.id).join('、')}` }), _jsxs("span", { className: css.taskTimes, children: [_jsxs("span", { children: ["\u4EFB\u52A1\u5F00\u59CB\uFF1A", taskTimeLabel(detailTask.startedAt)] }), detailTask.completedAt !== undefined && _jsxs("span", { children: ["\u4EFB\u52A1\u5B8C\u6210\uFF1A", taskTimeLabel(detailTask.completedAt)] })] }), detailTask.artifacts.length > 0 && (_jsxs("span", { className: css.taskArtifacts, "aria-label": "\u4EA4\u4ED8\u6587\u4EF6", children: [_jsx("span", { className: css.taskArtifactsLabel, children: "\u4EA4\u4ED8\u6587\u4EF6" }), detailTask.artifacts.map((artifact) => (_jsx("a", { className: css.taskArtifactLink, href: artifact.url, download: artifact.name, title: `下载 ${artifact.name}`, children: artifact.name }, artifact.url)))] }))] })] }))] }));
}
function TeamSection({ team, onNavigate, historic = false }) {
    const [membersOpen, setMembersOpen] = useState(true);
    const [teamSurface, setTeamSurface] = useState('tasks');
    const busyCount = team.members.filter((member) => member.activity === 'working').length;
    const assignedCount = team.tasks.filter((task) => task.assignee !== '').length;
    const completedCount = team.tasks.filter((task) => task.status === 'completed').length;
    const allCompleted = team.tasks.length > 0 && completedCount === team.tasks.length;
    const teamStartedAt = team.tasks.reduce((earliest, task) => {
        const startedAt = task.startedAt ?? task.createdAt;
        return earliest === undefined || startedAt < earliest ? startedAt : earliest;
    }, undefined);
    return (_jsxs("section", { className: css.team, "data-team-id": team.teamId, children: [_jsxs("header", { className: css.teamHead, children: [_jsx("span", { className: css.teamName, title: team.name, children: team.name }), historic && _jsx("span", { className: css.historicPill, children: "\u5DF2\u7ED3\u675F" }), _jsxs("span", { className: css.teamStats, children: [_jsxs("span", { "data-stat": "members", children: [team.members.length, " \u6210\u5458"] }), _jsxs("span", { "data-stat": "tasks", children: [completedCount, "/", team.tasks.length, " \u5B8C\u6210"] }), _jsxs("span", { "data-stat": "messages", children: [team.messageCount, " \u6D88\u606F"] })] })] }), _jsxs("div", { className: css.teamTabs, role: "tablist", "aria-label": `${team.name} 工作台`, children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": teamSurface === 'tasks', onClick: () => { setTeamSurface('tasks'); }, children: ["\u4EFB\u52A1 ", _jsx("span", { children: team.tasks.length })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": teamSurface === 'chat', onClick: () => { setTeamSurface('chat'); }, children: ["\u7FA4\u804A ", _jsx("span", { children: team.messageCount })] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": teamSurface === 'artifacts', onClick: () => { setTeamSurface('artifacts'); }, children: ["\u4EA4\u4ED8\u533A ", _jsx("span", { children: team.tasks.reduce((count, task) => count + task.artifacts.length, 0) })] })] }), teamSurface === 'chat' ? _jsx(TeamChatView, { team: team, historic: historic }) : teamSurface === 'artifacts' ? _jsx(TeamArtifactsView, { team: team }) : _jsxs("section", { className: css.delegationSection, "aria-label": "\u7EC4\u957F\u6D3E\u5DE5\u5173\u7CFB", "data-delegation-map": true, children: [_jsxs("div", { className: css.hierarchySection, "data-section": "captain", children: [_jsx("span", { className: css.hierarchyLabel, children: "\u7EC4\u957F\u6307\u6325" }), _jsxs("div", { className: css.captainNode, children: [_jsx("span", { className: css.captainAvatar, children: _jsx("img", { className: css.leadAvatar, src: LEAD_ART, alt: "", "aria-hidden": true }) }), _jsxs("span", { className: css.captainInfo, children: [_jsxs("span", { className: css.captainLine, children: [_jsx("span", { className: css.captainName, children: "\u7EC4\u957F" }), _jsx("span", { className: css.captainRole, children: "\u62C6\u89E3 \u00B7 \u6D3E\u53D1 \u00B7 \u6C47\u603B" })] }), _jsxs("span", { className: css.captainSummary, children: ["\u5DF2\u6D3E\u53D1 ", assignedCount, " \u9879\u4EFB\u52A1\u7ED9 ", team.members.length, " \u540D\u6210\u5458"] }), _jsxs("span", { className: css.captainStartedAt, children: ["\u5F00\u59CB\uFF1A", taskTimeLabel(teamStartedAt)] })] }), _jsxs("span", { className: css.captainState, "data-busy": busyCount > 0, children: [_jsx(WorkGlyph, { active: busyCount > 0 }), busyCount > 0 ? `${busyCount} 人执行中` : allCompleted ? '已收齐' : '等待回报'] })] }), _jsx(ProgressOverview, { team: team })] }), _jsxs("div", { className: css.hierarchySection, "data-section": "members", children: [_jsx("span", { className: css.hierarchyLabel, children: "\u90E8\u95E8\u6267\u884C" }), _jsxs("button", { type: "button", className: css.membersToggle, onClick: () => { setMembersOpen((current) => !current); }, "aria-expanded": membersOpen, "data-members-toggle": true, children: [_jsxs("span", { children: [_jsx(Chevron, { open: membersOpen }), "\u6210\u5458 ", team.members.length] }), _jsx("span", { children: membersOpen ? '收起' : '展开' })] }), membersOpen && _jsxs("div", { className: css.delegationTree, children: [team.members.length === 0 && _jsx("span", { className: css.emptyHint, children: "\u6682\u65E0\u6210\u5458\uFF0C\u7B49\u5F85\u7EC4\u957F\u7EC4\u5EFA\u56E2\u961F" }), team.members.map((member) => {
                                        const owned = team.tasks.filter((task) => task.assignee === member.name);
                                        const roleLabel = visibleRoleLabel(member.role);
                                        return (_jsxs("div", { className: css.memberBlock, "data-activity": member.activity, children: [_jsx("span", { className: css.memberBranch, "aria-hidden": true, children: _jsx("span", {}) }), _jsxs("button", { type: "button", className: css.memberRow, "data-activity": member.activity, onClick: () => { if (member.id !== '')
                                                        onNavigate(team.captainSessionId, member.id); }, children: [_jsxs("span", { className: css.memberAvatar, "data-unread": member.unread > 0, children: [memberArtUrl(member.name, member.role) !== null ? (_jsx("img", { className: css.memberArt, src: memberArtUrl(member.name, member.role) ?? '', alt: "", "aria-hidden": true })) : (_jsx("span", { className: css.memberInitial, style: { background: accentOf(member.id) }, children: memberInitial(member.name) })), _jsx("img", { className: css.stateArt, "data-activity": member.activity, src: ACTION_ART[member.activity], alt: "", "aria-hidden": true })] }), _jsxs("span", { className: css.memberInfo, children: [_jsxs("span", { className: css.memberLine, children: [_jsx("span", { className: css.memberName, children: member.name }), roleLabel !== '' && _jsx("span", { className: css.memberRole, children: roleLabel }), _jsxs("span", { className: css.memberState, "data-activity": member.activity, children: [_jsx(WorkGlyph, { active: member.activity === 'working' }), memberStateLabel(member, team.tasks, historic)] })] }), _jsxs("span", { className: css.memberStatusLine, children: [memberStatusText(member, team.tasks), member.soulSummary !== undefined && (_jsxs("span", { title: member.soulSummary, children: [' · SOUL v', member.soulVersion ?? member.agentVersion ?? 1] })), member.agentId !== undefined && (_jsxs("span", { title: member.selectionReason ?? '已绑定可复用 Agent 角色', children: [' · Agent ', member.agentId.slice(0, 8), member.agentVersion === undefined ? '' : ` v${member.agentVersion}`] }))] })] }), _jsx(MemberToolTrace, { member: member }), _jsxs("span", { className: css.memberCount, children: [member.done, "/", member.total] })] }), _jsxs("div", { className: css.assignmentLine, children: [_jsx("span", { className: css.assignmentLabel, children: "\u7EC4\u957F\u6D3E\u53D1" }), _jsx("span", { className: css.assignmentTasks, children: owned.length === 0
                                                                ? _jsx("span", { className: css.taskEmpty, children: "\u6682\u65E0\u4EFB\u52A1" })
                                                                : owned.map((task) => (_jsx("span", { className: css.assignmentChip, "data-state": taskTone(task.state, task.status), title: task.subject, children: task.id }, task.id))) })] })] }, member.id));
                                    })] })] }), _jsxs("div", { className: css.hierarchySection, "data-section": "tasks", children: [_jsx("span", { className: css.hierarchyLabel, children: "\u4EFB\u52A1\u94FE\u8DEF" }), _jsx(DependencyMap, { tasks: team.tasks })] })] })] }));
}
/** Legacy conversation cards may outlive their host archive. Project their
 * durable roster through the same rebuilt panel instead of a second UI. */
function historicCardTeam(data, owner) {
    return {
        workspace: '',
        teamId: data.teamId,
        name: data.teamName,
        captainSessionId: data.captainSessionId || owner,
        members: data.members.map((member) => ({
            ...member,
            status: 'removed',
            activity: 'idle',
            progress: 0,
            done: 0,
            total: 0,
            currentTask: '',
            unread: 0,
            tools: [],
        })),
        tasks: [],
        messageCount: 0,
        recentMessages: [],
        captainInbox: [],
    };
}
/** The top-right activity floater. Teams follow the current session: live
 * snapshots and historic card summaries are only shown while their captain
 * session is the one currently open. */
export function ActivityPanel({ sessionsList, openMemberSession, createToolClient }) {
    // Navigating to a member's subagent transcript is an explicit departure:
    // hide the floater immediately instead of waiting out the autocollapse
    // grace, so the panel never lingers over the member session.
    const navigateToMember = (captainSessionId, memberSessionId) => {
        setOpen(false);
        setWasActive(false);
        void openMemberSession(captainSessionId, memberSessionId);
    };
    const [open, setOpen] = useState(false);
    const [surface, setSurface] = useState('activity');
    const [openOwner, setOpenOwner] = useState();
    const [autoOpened, setAutoOpened] = useState(false);
    const [wasActive, setWasActive] = useState(false);
    const [historic, setHistoric] = useState(new Map());
    const current = useSyncExternalStore(sessionsList.subscribe, sessionsList.getSnapshot).current;
    const monitorTargets = useSyncExternalStore(subscribeActivityMonitorTargets, getActivityMonitorTargetsSnapshot);
    const { teams, archivedTeams, controlPlaneEnabled } = useSyncExternalStore(subscribeActivitySnapshots, getActivitySnapshotsSnapshot);
    const currentTargets = useMemo(() => current === undefined ? [] : monitorTargets.filter((target) => target.sessionId === current), [current, monitorTargets]);
    const currentRef = useRef(current);
    useEffect(() => { currentRef.current = current; }, [current]);
    const mountedAtRef = useRef(performance.now());
    // Keep an explicitly opened panel mounted across Session switches so the
    // newly selected Session can immediately show its own data or empty state.
    const expanded = open;
    // The activity panel is a body portal, so announce its open state on body.
    // CSS can then make the conversation column yield space without knowing the
    // host shell's hashed module class names. Narrow viewports keep overlay mode.
    useLayoutEffect(() => {
        const root = document.documentElement;
        if (expanded)
            root.setAttribute(PANEL_OPEN_ATTRIBUTE, '');
        else
            root.removeAttribute(PANEL_OPEN_ATTRIBUTE);
        return () => { root.removeAttribute(PANEL_OPEN_ATTRIBUTE); };
    }, [expanded]);
    useEffect(() => {
        // Every selected DSH session can own a durable team. `pollAll` recovers
        // teams created before the conversation-card renderer existed.
        const controller = startActivityPolling(currentTargets, { pollAll: current !== undefined });
        return () => { controller.stop(); };
    }, [current, currentTargets]);
    useEffect(() => {
        const onOpenPanel = (event) => {
            const detail = event.detail;
            // Cards retain their captain session even while the host Session list
            // is settling after a route change. Prefer that durable owner so a
            // user's first click is never discarded during the transition.
            const cardOwner = detail?.captainSessionId;
            const owner = cardOwner !== undefined && cardOwner !== ''
                ? cardOwner
                : currentRef.current;
            if (owner === undefined)
                return;
            setOpenOwner(owner);
            setSurface('activity');
            setOpen(true);
            if (detail?.teamId !== undefined) {
                // A card from a log that predates captainSessionId belongs to the
                // session that activated it (the current one at injection time).
                const teamKey = `${owner}:${detail.teamId}`;
                setHistoric((previous) => {
                    const next = new Map(previous);
                    next.set(teamKey, { data: detail, owner });
                    return next;
                });
            }
        };
        window.addEventListener(OPEN_PANEL_EVENT, onOpenPanel);
        return () => {
            window.removeEventListener(OPEN_PANEL_EVENT, onOpenPanel);
        };
    }, []);
    const visibleTeams = useMemo(() => current === undefined ? [] : teams.filter((team) => team.captainSessionId === current), [current, teams]);
    const visibleHistoric = useMemo(() => [...historic.values()].filter(({ data, owner }) => owner === current &&
        !visibleTeams.some((live) => live.teamId === data.teamId && live.captainSessionId === owner)
        && !archivedTeams.some((archived) => archived.captainSessionId === owner && archived.teamId === data.teamId)), [current, historic, visibleTeams, archivedTeams]);
    const visibleArchived = useMemo(() => current === undefined ? [] : archivedTeams.filter((team) => team.captainSessionId === current &&
        !visibleTeams.some((live) => live.captainSessionId === team.captainSessionId && live.teamId === team.teamId)), [current, archivedTeams, visibleTeams]);
    const visibleCount = visibleTeams.length + visibleArchived.length + visibleHistoric.length;
    useEffect(() => {
        if (visibleCount > 0) {
            setWasActive(true);
            // Auto-expand only after the page-settle window: opening (and its
            // main-column yield) right after load reads as a whole-page flicker.
            const settled = performance.now() - mountedAtRef.current >= AUTO_OPEN_SETTLE_MS;
            if (!autoOpened && settled) {
                setOpenOwner(current);
                setOpen(true);
                setAutoOpened(true);
            }
            return;
        }
        if (!wasActive)
            return;
        const timer = setTimeout(() => {
            setOpen(false);
            setOpenOwner(undefined);
            setWasActive(false);
            // Re-arm auto-expand: a later activity (new team, new session) may
            // open the panel on its own again.
            setAutoOpened(false);
        }, AUTOCLOSE_GRACE_MS);
        return () => { clearTimeout(timer); };
    }, [visibleCount, autoOpened, wasActive]);
    const busy = useMemo(() => visibleTeams.some((team) => team.members.some((member) => member.activity === 'working')), [visibleTeams]);
    const hasTeams = visibleCount > 0;
    const toolClient = useMemo(() => current === undefined ? undefined : createToolClient(current), [createToolClient, current]);
    useEffect(() => {
        if (!controlPlaneEnabled && surface !== 'activity')
            setSurface('activity');
    }, [controlPlaneEnabled, surface]);
    return (_jsxs(_Fragment, { children: [!expanded && (_jsx(CollapsedBadge, { count: visibleCount, busy: busy, onClick: () => {
                    if (current === undefined)
                        return;
                    setOpenOwner(current);
                    setOpen(true);
                } })), expanded && (_jsxs("aside", { className: css.panel, "data-agent-teams-activity": true, children: [_jsxs("header", { className: css.panelHead, children: [_jsxs("span", { className: css.panelTitle, children: ["Agent Teams", _jsx("span", { className: css.panelDot, "data-busy": busy, "aria-hidden": true })] }), _jsx("span", { className: css.panelActions, children: _jsx("button", { type: "button", className: css.closeButton, onClick: () => {
                                        setOpen(false);
                                        setOpenOwner(undefined);
                                    }, "aria-label": "\u5173\u95ED", children: _jsx(IconCloseOutline16, {}) }) })] }), _jsxs("div", { className: css.surfaceTabs, role: "tablist", "aria-label": "Agent Teams \u89C6\u56FE", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": surface === 'activity', onClick: () => { setSurface('activity'); }, children: "\u6D3B\u52A8" }), controlPlaneEnabled && _jsx("button", { type: "button", role: "tab", "aria-selected": surface === 'tools', onClick: () => { setSurface('tools'); }, children: "\u5DE5\u5177\u5E93" }), controlPlaneEnabled && _jsx("button", { type: "button", role: "tab", "aria-selected": surface === 'agents', onClick: () => { setSurface('agents'); }, children: "\u6211\u7684 Agent" })] }), surface === 'activity' ? _jsx("div", { className: css.teams, children: visibleCount === 0
                            ? _jsx("span", { className: css.emptyHint, children: "\u6682\u65E0\u56E2\u961F\u6D3B\u52A8" })
                            : (_jsx(_Fragment, { children: [
                                    ...visibleTeams.map((team) => ({ key: team.teamId, content: _jsx(TeamSection, { team: team, onNavigate: navigateToMember }) })),
                                    ...visibleArchived.map((team) => ({
                                        key: `${team.captainSessionId}:${team.teamId}`,
                                        content: (_jsx("div", { "data-team-id": team.teamId, "data-historic": true, className: css.archivedWrap, children: _jsx(TeamSection, { team: team, onNavigate: navigateToMember, historic: true }) })),
                                    })),
                                    ...visibleHistoric.map(({ data: team, owner }) => {
                                        const teamKey = `${owner}:${team.teamId}`;
                                        return { key: teamKey, content: _jsx(TeamSection, { team: historicCardTeam(team, owner), onNavigate: navigateToMember, historic: true }) };
                                    }),
                                ].map(({ key, content }, index) => (_jsxs(Fragment, { children: [index > 0 && _jsx("div", { className: css.teamDivider, "aria-label": "\u72EC\u7ACB\u56E2\u961F\u5206\u9694", children: _jsx("span", { children: "\u72EC\u7ACB\u56E2\u961F" }) }), content] }, key))) })) }) : surface === 'agents' && toolClient !== undefined
                        ? _jsx("div", { className: css.toolSurface, children: _jsx(AgentProfilesView, { client: toolClient }) })
                        : current === undefined || toolClient === undefined
                            ? _jsx("div", { className: css.emptyHint, children: "\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A Agent \u4F1A\u8BDD" })
                            : _jsx("div", { className: css.toolSurface, children: _jsx(ToolLibraryView, { sessionId: current, client: toolClient }) })] }))] }));
}
