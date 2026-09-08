import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { Archive, Brain, Check, RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react';
import css from './AgentProfilesView.module.css';
const TRACK_LABEL = {
    user_identity: '用户身份', company: '公司记忆', industry: '行业经验', recent_plan: '近期计划', activity_log: '运行日志',
};
const STATUS_LABEL = {
    suggested: '待确认', active: '已生效', archived: '已归档', rejected: '已拒绝',
};
export function SharedMemoryView({ client }) {
    const [memories, setMemories] = useState([]);
    const [skills, setSkills] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null);
    const load = () => {
        setLoading(true);
        setMessage(null);
        void Promise.all([client.listSharedMemories(), client.listSkillCandidates()])
            .then(([nextMemories, nextSkills]) => { setMemories(nextMemories); setSkills(nextSkills); })
            .catch(() => { setMemories([]); setSkills([]); })
            .finally(() => setLoading(false));
    };
    useEffect(load, [client]);
    const visible = useMemo(() => filter === 'all' ? memories : memories.filter(item => item.status === filter), [filter, memories]);
    const decideMemory = async (memory, decision) => {
        setBusyId(memory.id);
        setMessage(null);
        try {
            const next = await client.decideSharedMemory(memory.id, decision, memory.version);
            setMemories(items => items.map(item => item.id === next.id ? next : item));
        }
        catch {
            setMessage('记忆状态已变化，请刷新后重试');
        }
        finally {
            setBusyId(null);
        }
    };
    const decideSkill = async (skill, decision) => {
        setBusyId(skill.id);
        setMessage(null);
        try {
            const next = await client.decideSkillCandidate(skill.id, decision, skill.version);
            setSkills(items => items.map(item => item.id === next.id ? next : item));
        }
        catch {
            setMessage('Skill 候选状态已变化，请刷新后重试');
        }
        finally {
            setBusyId(null);
        }
    };
    return _jsxs("section", { className: css.sharedRoot, "aria-label": "CEO \u5171\u4EAB\u8BB0\u5FC6", children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { children: [_jsx("strong", { children: "CEO \u5171\u4EAB\u8BB0\u5FC6" }), _jsx("span", { children: "\u7EC4\u957F\u5171\u4EAB\uFF1B\u90E8\u95E8 Agent \u7684\u4E13\u4E1A\u8BB0\u5FC6\u4ECD\u5F7C\u6B64\u9694\u79BB" })] }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": "\u5237\u65B0\u5171\u4EAB\u8BB0\u5FC6", title: "\u5237\u65B0\u5171\u4EAB\u8BB0\u5FC6", onClick: load, children: _jsx(RefreshCw, { size: 14 }) })] }), _jsx("div", { className: css.filterBar, role: "tablist", "aria-label": "\u8BB0\u5FC6\u72B6\u6001", children: ['all', 'suggested', 'active', 'archived'].map(status => _jsx("button", { type: "button", role: "tab", "aria-selected": filter === status, onClick: () => setFilter(status), children: status === 'all' ? '全部' : STATUS_LABEL[status] }, status)) }), loading ? _jsx("div", { className: css.empty, children: "\u6B63\u5728\u8BFB\u53D6 CEO \u5171\u4EAB\u8BB0\u5FC6..." }) : visible.length === 0 ? _jsxs("div", { className: css.empty, children: [_jsx(Brain, { size: 22 }), _jsx("span", { children: "\u6682\u65E0\u6B64\u7C7B\u8BB0\u5FC6" }), _jsx("small", { children: "Agent \u63D0\u51FA\u7684\u957F\u671F\u4E8B\u5B9E\u4F1A\u5148\u8FDB\u5165\u5F85\u786E\u8BA4\u5217\u8868\u3002" })] }) : _jsx("div", { className: css.sharedList, children: visible.map(memory => _jsxs("article", { className: css.sharedItem, "data-status": memory.status, children: [_jsxs("div", { className: css.sharedMeta, children: [_jsx("strong", { children: TRACK_LABEL[memory.track] }), _jsxs("span", { children: [STATUS_LABEL[memory.status], " \u00B7 \u547D\u4E2D ", memory.occurrenceCount, " \u6B21 \u00B7 \u91CD\u8981\u5EA6 ", memory.importance] })] }), _jsx("p", { children: memory.content }), _jsxs("div", { className: css.actionRow, children: [memory.status === 'suggested' && _jsxs(_Fragment, { children: [_jsxs("button", { type: "button", disabled: busyId === memory.id, onClick: () => { void decideMemory(memory, 'accepted'); }, children: [_jsx(Check, { size: 12 }), "\u63A5\u53D7"] }), _jsxs("button", { type: "button", disabled: busyId === memory.id, onClick: () => { void decideMemory(memory, 'rejected'); }, children: [_jsx(X, { size: 12 }), "\u62D2\u7EDD"] })] }), memory.status === 'active' && _jsxs("button", { type: "button", disabled: busyId === memory.id, onClick: () => { void decideMemory(memory, 'archived'); }, children: [_jsx(Archive, { size: 12 }), "\u5F52\u6863"] }), memory.status === 'archived' && _jsxs("button", { type: "button", disabled: busyId === memory.id, onClick: () => { void decideMemory(memory, 'accepted'); }, children: [_jsx(RotateCcw, { size: 12 }), "\u6062\u590D"] })] })] }, memory.id)) }), _jsxs("section", { className: css.skillCandidates, "aria-label": "Skill \u5019\u9009", children: [_jsxs("h4", { children: [_jsx(Sparkles, { size: 13 }), "Skill \u5019\u9009"] }), skills.length === 0 ? _jsx("p", { children: "\u91CD\u590D\u51FA\u73B0\u7684\u53EF\u590D\u7528\u6210\u529F\u65B9\u6CD5\u4F1A\u5728\u8FD9\u91CC\u7B49\u5F85\u786E\u8BA4\u3002" }) : skills.map(skill => _jsxs("article", { className: css.skillItem, "data-status": skill.status, children: [_jsxs("div", { children: [_jsx("strong", { children: skill.name }), _jsxs("small", { children: [skill.status === 'pending' ? '待确认' : skill.status === 'approved' ? '已批准' : '已拒绝', " \u00B7 \u91CD\u590D ", skill.occurrenceCount, " \u6B21"] })] }), _jsx("p", { children: skill.description }), skill.status === 'pending' && _jsxs("div", { className: css.actionRow, children: [_jsxs("button", { type: "button", disabled: busyId === skill.id, onClick: () => { void decideSkill(skill, 'approved'); }, children: [_jsx(Check, { size: 12 }), "\u6279\u51C6"] }), _jsxs("button", { type: "button", disabled: busyId === skill.id, onClick: () => { void decideSkill(skill, 'rejected'); }, children: [_jsx(X, { size: 12 }), "\u62D2\u7EDD"] })] })] }, skill.id))] }), message && _jsx("div", { className: css.error, role: "alert", children: message })] });
}
