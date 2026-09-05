import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Ban, Bot, Brain, CheckCircle2, CircleDot, Pencil, RefreshCw, Save, X } from 'lucide-react';
import css from './AgentProfilesView.module.css';
import { SharedMemoryView } from "./SharedMemoryView.js";
function percent(value) {
    return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}
function visibleRoleLabel(role) {
    const value = role.trim();
    return /\p{Script=Han}/u.test(value) ? value : '';
}
function lines(values) { return values.join('\n'); }
function toLines(value) { return value.split(/\r?\n/u).map(item => item.trim()).filter(Boolean); }
function toDraft(profile) {
    const version = profile.version;
    return {
        name: profile.name, description: profile.description, role: profile.role, industry: profile.industry ?? null, tags: profile.tags,
        persona: version?.persona ?? '', soulMarkdown: version?.soulMarkdown ?? null, soulSummary: version?.soulSummary ?? null,
        responsibilities: version?.responsibilities ?? [], preferredTools: version?.preferredTools ?? [],
        operatingRules: version?.operatingRules ?? [], avoidanceRules: version?.avoidanceRules ?? [], modelRoute: version?.modelRoute ?? null,
    };
}
export function AgentProfilesView({ client }) {
    const [surface, setSurface] = useState('profiles');
    const [profiles, setProfiles] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [memories, setMemories] = useState([]);
    const [memoriesLoading, setMemoriesLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState(null);
    const load = () => {
        setLoading(true);
        setMessage(null);
        void client.listAgentProfiles('active').then(next => {
            setProfiles(next);
            setSelected(current => current === null ? next[0] ?? null : next.find(item => item.id === current.id) ?? next[0] ?? null);
        }).catch(() => { setProfiles([]); setSelected(null); }).finally(() => setLoading(false));
    };
    useEffect(load, [client]);
    useEffect(() => {
        if (selected === null) {
            setMemories([]);
            return;
        }
        setMemoriesLoading(true);
        void client.listAgentMemories(selected.id).then(setMemories).catch(() => setMessage('角色记忆暂时无法加载')).finally(() => setMemoriesLoading(false));
    }, [client, selected?.id]);
    const disable = async () => {
        if (selected === null)
            return;
        try {
            await client.disableAgentProfile(selected.id);
            setProfiles(items => items.filter(item => item.id !== selected.id));
            setSelected(null);
        }
        catch {
            setMessage('停用 Agent 失败，请稍后重试');
        }
    };
    const disableMemory = async (memoryId) => {
        if (selected === null)
            return;
        try {
            await client.disableAgentMemory(selected.id, memoryId);
            setMemories(items => items.map(item => item.id === memoryId ? { ...item, status: 'disabled' } : item));
        }
        catch {
            setMessage('停用记忆失败，请稍后重试');
        }
    };
    if (loading)
        return _jsx("div", { className: css.empty, children: "\u6B63\u5728\u8BFB\u53D6\u6210\u957F Agent..." });
    return _jsxs("div", { className: css.root, "aria-label": "\u6211\u7684 Agent", children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { children: [_jsx("strong", { children: "\u6211\u7684 Agent" }), _jsx("span", { children: "\u4EFB\u52A1\u4E2D\u6210\u957F\u5E76\u53EF\u590D\u7528\u7684\u79DF\u6237\u79C1\u6709\u89D2\u8272" })] }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u5237\u65B0 Agent", title: "\u5237\u65B0 Agent", onClick: load, children: _jsx(RefreshCw, { size: 14 }) })] }), _jsxs("div", { className: css.surfaceTabs, role: "tablist", "aria-label": "Agent \u8BB0\u5FC6\u89C6\u56FE", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": surface === 'profiles', onClick: () => setSurface('profiles'), children: "\u89D2\u8272\u5E93" }), _jsx("button", { type: "button", role: "tab", "aria-selected": surface === 'memory', onClick: () => setSurface('memory'), children: "CEO \u8BB0\u5FC6" })] }), surface === 'memory' ? _jsx(SharedMemoryView, { client: client }) : profiles.length === 0 ? _jsxs("div", { className: css.empty, children: [_jsx(Bot, { size: 22 }), _jsx("span", { children: "\u8FD8\u6CA1\u6709\u6210\u957F Agent" }), _jsx("small", { children: "\u5F53\u4EFB\u52A1\u627E\u4E0D\u5230\u5408\u9002\u89D2\u8272\u65F6\uFF0CAgent \u4F1A\u81EA\u52A8\u521B\u5EFA\u5E76\u53D1\u5E03\u3002" })] }) : _jsxs(_Fragment, { children: [_jsx("div", { className: css.list, children: profiles.map(profile => _jsxs("button", { type: "button", className: css.card, "data-selected": selected?.id === profile.id, onClick: () => { setSelected(profile); setEditing(false); setDraft(null); }, children: [_jsx("span", { className: css.avatar, children: _jsx(Bot, { size: 15 }) }), _jsxs("span", { className: css.identity, children: [_jsx("strong", { children: profile.name }), (visibleRoleLabel(profile.role) !== '' || profile.industry) && _jsxs("small", { children: [visibleRoleLabel(profile.role), profile.industry ? `${visibleRoleLabel(profile.role) !== '' ? ' · ' : ''}${profile.industry}` : ''] })] }), _jsxs("span", { className: css.status, children: [_jsx(CircleDot, { size: 10 }), "\u6D3B\u8DC3"] })] }, profile.id)) }), selected !== null && _jsxs("section", { className: css.detail, "aria-label": `Agent 详情：${selected.name}`, children: [_jsxs("div", { className: css.detailTitle, children: [_jsxs("div", { children: [_jsx("strong", { children: selected.name }), _jsxs("small", { children: ["\u7248\u672C v", selected.currentVersion, " \u00B7 \u4F7F\u7528 ", selected.usageCount, " \u6B21 \u00B7 \u6210\u529F\u7387 ", percent(selected.successRate)] })] }), _jsxs("div", { className: css.detailActions, children: [_jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u7F16\u8F91 Agent", title: "\u7F16\u8F91 Agent", onClick: () => { setDraft(toDraft(selected)); setEditing(true); setMessage(null); }, children: _jsx(Pencil, { size: 14 }) }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u505C\u7528 Agent", title: "\u505C\u7528 Agent", onClick: () => { void disable(); }, children: _jsx(Ban, { size: 14 }) })] })] }), editing && draft !== null ? _jsx(ProfileEditor, { profile: selected, draft: draft, saving: saving, onChange: setDraft, onCancel: () => { setEditing(false); setDraft(null); }, onSave: () => {
                                    setSaving(true);
                                    setMessage(null);
                                    void client.updateAgentProfile(selected.id, draft).then(updated => {
                                        setProfiles(items => items.map(item => item.id === updated.id ? updated : item));
                                        setSelected(updated);
                                        setEditing(false);
                                        setDraft(null);
                                    }).catch(() => setMessage('保存 Agent 配置失败，请检查模型格式或稍后重试')).finally(() => setSaving(false));
                                } }) : _jsxs(_Fragment, { children: [_jsx("p", { children: selected.description }), _jsx("div", { className: css.tags, children: selected.tags.map(tag => _jsx("span", { children: tag }, tag)) }), selected.version && _jsxs("div", { className: css.sections, children: [_jsxs("div", { children: [_jsx("h4", { children: "\u6A21\u578B" }), _jsx("p", { className: css.soulSummary, children: selected.version.modelRoute ?? '跟随当前组长模型' })] }), _jsxs("div", { children: [_jsxs("h4", { children: ["SOUL \u4EBA\u683C \u00B7 v", selected.version.version] }), _jsx("p", { className: css.soulSummary, children: selected.version.soulSummary ?? selected.version.persona })] }), _jsxs("div", { children: [_jsx("h4", { children: "\u804C\u8D23" }), _jsx("ul", { children: selected.version.responsibilities.map(item => _jsx("li", { children: item }, item)) })] }), _jsxs("div", { children: [_jsx("h4", { children: "\u8FD0\u884C\u89C4\u5219" }), _jsx("ul", { children: selected.version.operatingRules.map(item => _jsx("li", { children: item }, item)) })] }), _jsxs("div", { children: [_jsx("h4", { children: "\u907F\u8BA9\u89C4\u5219" }), _jsx("ul", { children: selected.version.avoidanceRules.map(item => _jsx("li", { children: item }, item)) })] })] })] }), _jsxs("section", { className: css.memories, "aria-label": "\u6211\u7684\u8BB0\u5FC6", children: [_jsxs("h4", { children: [_jsx(Brain, { size: 13 }), "\u6211\u7684\u8BB0\u5FC6"] }), memoriesLoading ? _jsx("p", { children: "\u6B63\u5728\u8BFB\u53D6\u89D2\u8272\u8BB0\u5FC6..." }) : memories.length === 0 ? _jsx("p", { children: "\u6682\u65E0\u53EF\u67E5\u770B\u7684\u89D2\u8272\u8BB0\u5FC6\u3002" }) : _jsx("div", { className: css.memoryList, children: memories.map(memory => _jsxs("article", { className: css.memory, "data-status": memory.status, children: [_jsxs("div", { children: [_jsx("strong", { children: memoryLabel(memory.type) }), _jsxs("small", { children: ["\u547D\u4E2D ", memory.occurrenceCount, " \u6B21 \u00B7 \u5F15\u7528 ", memory.usageCount, " \u6B21", memory.sourceRunId ? ` · Run ${memory.sourceRunId.slice(0, 8)}` : ''] })] }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u505C\u7528\u8BB0\u5FC6", title: "\u505C\u7528\u8BB0\u5FC6", disabled: memory.status === 'disabled', onClick: () => { void disableMemory(memory.id); }, children: _jsx(Ban, { size: 13 }) }), _jsx("p", { children: memory.content })] }, memory.id)) })] }), _jsxs("div", { className: css.confirm, children: [_jsx(CheckCircle2, { size: 14 }), "\u4FDD\u5B58\u4F1A\u751F\u6210\u65B0\u7248\u672C\uFF0C\u53EA\u5F71\u54CD\u540E\u7EED\u4EFB\u52A1\uFF1B\u6B63\u5728\u6267\u884C\u7684\u56E2\u961F\u6210\u5458\u7EE7\u7EED\u4F7F\u7528\u539F\u7248\u672C\u3002"] })] })] }), message && _jsx("div", { className: css.error, role: "alert", children: message })] });
}
function ProfileEditor({ profile, draft, saving, onChange, onCancel, onSave }) {
    const update = (changes) => onChange({ ...draft, ...changes });
    return _jsxs("form", { className: css.editor, "aria-label": `编辑 Agent：${profile.name}`, onSubmit: event => { event.preventDefault(); onSave(); }, children: [_jsxs("label", { children: ["\u540D\u79F0", _jsx("input", { value: draft.name, maxLength: 80, onChange: event => update({ name: event.target.value }) })] }), _jsxs("label", { children: ["\u5C97\u4F4D", _jsx("input", { value: draft.role, maxLength: 160, onChange: event => update({ role: event.target.value }) })] }), _jsxs("label", { children: ["\u7B80\u4ECB", _jsx("textarea", { value: draft.description, maxLength: 500, onChange: event => update({ description: event.target.value }) })] }), _jsxs("label", { children: ["\u6A21\u578B ", _jsx("small", { children: "\u670D\u52A1\u5546/\u6A21\u578B" }), _jsx("input", { value: draft.modelRoute ?? '', placeholder: "deepseek-official/deepseek-v4-flash", onChange: event => update({ modelRoute: event.target.value.trim() || null }) })] }), _jsxs("label", { children: ["\u4EBA\u683C", _jsx("textarea", { value: draft.persona, maxLength: 12000, onChange: event => update({ persona: event.target.value }) })] }), _jsxs("label", { children: ["\u804C\u8D23 ", _jsx("small", { children: "\u6BCF\u884C\u4E00\u6761" }), _jsx("textarea", { value: lines(draft.responsibilities), onChange: event => update({ responsibilities: toLines(event.target.value) }) })] }), _jsxs("label", { children: ["\u5E38\u7528\u5DE5\u5177 ", _jsx("small", { children: "\u9017\u53F7\u5206\u9694" }), _jsx("input", { value: draft.preferredTools.join(', '), onChange: event => update({ preferredTools: event.target.value.split(',').map(item => item.trim()).filter(Boolean) }) })] }), _jsxs("label", { children: ["\u6267\u884C\u89C4\u5219 ", _jsx("small", { children: "\u6BCF\u884C\u4E00\u6761" }), _jsx("textarea", { value: lines(draft.operatingRules), onChange: event => update({ operatingRules: toLines(event.target.value) }) })] }), _jsxs("label", { children: ["\u907F\u8BA9\u89C4\u5219 ", _jsx("small", { children: "\u6BCF\u884C\u4E00\u6761" }), _jsx("textarea", { value: lines(draft.avoidanceRules), onChange: event => update({ avoidanceRules: toLines(event.target.value) }) })] }), _jsxs("div", { className: css.editorActions, children: [_jsxs("button", { type: "button", onClick: onCancel, disabled: saving, children: [_jsx(X, { size: 13 }), "\u53D6\u6D88"] }), _jsxs("button", { type: "submit", disabled: saving || draft.name.trim() === '' || draft.role.trim() === '' || draft.persona.trim() === '', children: [_jsx(Save, { size: 13 }), saving ? '保存中' : '保存新版本'] })] })] });
}
function memoryLabel(type) {
    return { best_practice: '已掌握的长期做法', role_preference: '角色偏好', risk_avoidance: '风险规避', task_log: '任务日志', failure_reflection: '失败反思' }[type];
}
