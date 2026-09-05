import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, MessageCircle, RefreshCw } from 'lucide-react';
import { loadTeamChatPage } from "./activity-monitor.js";
import { memberArtUrl, LEAD_ART } from "./artwork.js";
import { teamChatMentionNames, teamChatMessageLabel } from "./team-chat-model.js";
import { mergeDisplayMessages, summarizeTeamChatContent } from "../chat-presentation.js";
import css from './ActivityPanel.module.css';
function timeLabel(value) {
    return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}
function roleOf(team, name) {
    if (name === 'captain')
        return '组长';
    const role = team.members.find(member => member.name === name)?.role?.trim() ?? '';
    return /\p{Script=Han}/u.test(role) ? role : '';
}
function avatarOf(team, name) {
    if (name === 'captain')
        return LEAD_ART;
    const member = team.members.find(item => item.name === name);
    return member === undefined ? null : memberArtUrl(member.name, member.role);
}
function copyText(value) {
    void navigator.clipboard?.writeText(value);
}
function noteworthyKind(kind) {
    return kind === 'objection' || kind === 'decision' || kind === 'summary' || kind === 'approval';
}
function ChatMessage({ team, message }) {
    const avatar = avatarOf(team, message.from);
    const system = message.kind === 'system';
    const [detailsOpen, setDetailsOpen] = useState(false);
    const displayContent = message.displayContent ?? summarizeTeamChatContent(message.content, message.kind);
    const mentionNames = teamChatMentionNames(message);
    const task = message.taskId === undefined ? undefined : team.tasks.find(item => item.id === message.taskId);
    return (_jsx("li", { className: css.chatRow, "data-kind": message.kind, "data-system": system, children: system ? _jsxs("div", { className: css.chatSystemEvent, children: [_jsx("span", { children: displayContent }), _jsx("time", { children: timeLabel(message.ts) })] }) : (_jsxs("div", { className: css.chatMessageBody, children: [_jsx("span", { className: css.chatAvatar, children: avatar ? _jsx("img", { src: avatar, alt: "", "aria-hidden": true }) : _jsx("span", { children: message.from.slice(0, 1).toUpperCase() }) }), _jsxs("div", { className: css.chatMessageMain, children: [_jsxs("div", { className: css.chatAuthor, children: [_jsx("strong", { children: message.from === 'captain' ? '组长' : message.from }), roleOf(team, message.from) !== '' && _jsx("span", { children: roleOf(team, message.from) }), _jsx("time", { children: timeLabel(message.ts) })] }), message.replyTo && _jsx("div", { className: css.chatReply, children: "\u63A5\u7740\u4E0A\u4E00\u6761\u8BF4" }), _jsxs("button", { type: "button", className: css.chatBubble, "data-kind": message.kind, "aria-expanded": detailsOpen, onClick: () => { setDetailsOpen(value => !value); }, title: "\u67E5\u770B\u534F\u4F5C\u8BE6\u60C5", children: [noteworthyKind(message.kind) && _jsx("span", { className: css.chatKind, children: teamChatMessageLabel(message.kind) }), _jsxs("span", { children: [mentionNames.length > 0 && _jsxs("span", { className: css.chatInlineMentions, children: [mentionNames.map(name => `@${name}`).join(' '), " "] }), displayContent] }), message.taskId && _jsxs("span", { className: css.chatTaskTag, children: [_jsx("span", { children: message.taskId }), _jsx(Copy, { size: 11 })] })] }), detailsOpen && _jsxs("div", { className: css.chatDetails, "aria-label": "\u534F\u4F5C\u8BE6\u60C5", children: [task !== undefined && _jsxs("span", { children: ["\u5173\u8054\u4EFB\u52A1\uFF1A", task.subject] }), _jsxs("span", { children: ["\u5F53\u524D\u73AF\u8282\uFF1A", teamChatMessageLabel(message.kind)] }), message.mergedIds !== undefined && _jsxs("span", { children: ["\u5408\u5E76\u4E86 ", message.mergedIds.length, " \u6761\u8FDB\u5EA6\u540C\u6B65"] }), message.taskId && _jsxs("button", { type: "button", onClick: () => { copyText(message.taskId); }, title: "\u590D\u5236 Task ID", children: ["\u590D\u5236 ", message.taskId] })] })] })] })) }));
}
export function TeamChatView({ team, historic = false }) {
    const [messages, setMessages] = useState(team.recentMessages ?? []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshToken, setRefreshToken] = useState(0);
    useEffect(() => {
        let cancelled = false;
        if (historic || team.workspace === '') {
            setMessages(team.recentMessages ?? []);
            return () => { cancelled = true; };
        }
        setLoading(true);
        setError(null);
        void (async () => {
            try {
                let cursor = 0;
                const loaded = [];
                let hasMore = true;
                while (hasMore && !cancelled) {
                    const page = await loadTeamChatPage(team, cursor, 100);
                    loaded.push(...page.messages);
                    hasMore = page.hasMore;
                    cursor = page.nextCursor === undefined ? cursor : Number(page.nextCursor);
                    if (!Number.isSafeInteger(cursor) || cursor < 0)
                        break;
                }
                if (!cancelled)
                    setMessages(loaded);
            }
            catch {
                if (!cancelled) {
                    setMessages(team.recentMessages ?? []);
                    setError('完整群聊暂时无法加载，当前显示最近动态');
                }
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [team.teamId, team.workspace, team.chatCursor, historic, refreshToken]);
    const uniqueMessages = useMemo(() => {
        const map = new Map();
        for (const message of messages)
            map.set(message.id, message);
        return mergeDisplayMessages([...map.values()].sort((left, right) => left.seq - right.seq));
    }, [messages]);
    return (_jsxs("section", { className: css.chatSurface, "aria-label": "AI \u56E2\u961F\u5DE5\u4F5C\u5B9E\u51B5", "data-read-only-chat": true, children: [_jsxs("header", { className: css.chatSurfaceHead, children: [_jsxs("div", { children: [_jsx("strong", { children: "AI \u56E2\u961F\u5DE5\u4F5C\u5B9E\u51B5" }), _jsx("span", { children: "\u53EA\u8BFB\u5C55\u793A \u00B7 Agent \u4E4B\u95F4\u7684\u4EFB\u52A1\u534F\u4F5C" })] }), _jsx("button", { type: "button", className: css.chatIconButton, "aria-label": "\u5237\u65B0\u7FA4\u804A", title: "\u5237\u65B0\u7FA4\u804A", onClick: () => { setRefreshToken(value => value + 1); }, children: _jsx(RefreshCw, { size: 13 }) })] }), _jsxs("div", { className: css.chatNotice, children: [_jsx(MessageCircle, { size: 13 }), " \u7528\u6237\u6307\u4EE4\u4ECD\u5728 DSH \u4E3B\u5BF9\u8BDD\u6846\u4E2D\uFF0C\u7FA4\u804A\u4E0D\u63A5\u53D7\u8F93\u5165"] }), loading && _jsx("div", { className: css.chatLoading, children: "\u6B63\u5728\u52A0\u8F7D\u5B8C\u6574\u534F\u4F5C\u8BB0\u5F55\u2026" }), error && _jsx("div", { className: css.chatError, role: "status", children: error }), uniqueMessages.length === 0 ? _jsx("div", { className: css.chatEmpty, children: "\u7B49\u5F85 Agent \u4EA7\u751F\u534F\u4F5C\u52A8\u6001" }) : (_jsx("ol", { className: css.chatList, children: uniqueMessages.map(message => _jsx(ChatMessage, { team: team, message: message }, message.id)) }))] }));
}
export function TeamArtifactsView({ team }) {
    const artifactsByUrl = new Map();
    for (const artifact of team.artifacts ?? [])
        artifactsByUrl.set(artifact.url, { ...artifact, taskId: '', subject: '团队协作交付' });
    for (const task of team.tasks) {
        for (const artifact of task.artifacts)
            artifactsByUrl.set(artifact.url, { ...artifact, taskId: task.id, subject: task.subject });
    }
    const artifacts = [...artifactsByUrl.values()];
    if (artifacts.length === 0)
        return _jsx("div", { className: css.artifactEmpty, children: "\u4EFB\u52A1\u5B8C\u6210\u540E\uFF0C\u4EA4\u4ED8\u6587\u4EF6\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC" });
    return _jsxs("section", { className: css.artifactsSurface, "aria-label": "\u56E2\u961F\u4EA4\u4ED8\u533A", children: [_jsxs("header", { className: css.artifactHead, children: [_jsx("strong", { children: "\u4EFB\u52A1\u4EA4\u4ED8" }), _jsxs("span", { children: [artifacts.length, " \u4E2A\u6587\u4EF6"] })] }), _jsx("ul", { className: css.artifactList, children: artifacts.map(artifact => _jsxs("li", { className: css.artifactCard, children: [_jsxs("div", { children: [_jsx("strong", { title: artifact.name, children: artifact.name }), _jsx("span", { children: artifact.taskId === '' ? artifact.subject : `${artifact.taskId} · ${artifact.subject}` })] }), _jsx("a", { href: artifact.url, download: artifact.name, className: css.artifactDownload, "aria-label": `下载 ${artifact.name}`, title: `下载 ${artifact.name}`, children: _jsx(Download, { size: 14 }) })] }, `${artifact.taskId}:${artifact.url}`)) })] });
}
