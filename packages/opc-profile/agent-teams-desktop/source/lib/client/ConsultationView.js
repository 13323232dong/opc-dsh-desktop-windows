import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import css from './ActivityPanel.module.css';
const statusLabel = {
    queued: '等待顾问回复', answering: '顾问回复中', awaiting_captain: '已交队长判断',
    accepted: '队长已采纳', revised: '队长改写后采纳', rejected: '队长未采纳', cancelled: '已取消',
};
function endpoint(team, member) {
    return `/plugins/dsh-agent-teams/consultations?workspace=${encodeURIComponent(team.workspace)}&teamId=${encodeURIComponent(team.teamId)}&sessionId=${encodeURIComponent(member.id)}`;
}
/** Private manager consultation history for one selected department Agent. */
export function ConsultationView({ team, member }) {
    const [items, setItems] = useState([]);
    const [question, setQuestion] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const task = useMemo(() => team.tasks.find(item => item.assignee === member.name && item.state === 'running')
        ?? team.tasks.find(item => item.assignee === member.name), [team.tasks, member.name]);
    const refresh = () => {
        void fetch(endpoint(team, member), { cache: 'no-store' }).then(async (response) => {
            if (!response.ok)
                throw new Error('无法加载沟通记录');
            const body = await response.json();
            setItems((body.consultations ?? []).filter(item => item.memberId === member.id));
        }).catch(() => { setError('沟通记录暂时无法加载'); });
    };
    useEffect(() => { refresh(); }, [team.teamId, team.workspace, member.id]);
    useEffect(() => { const timer = window.setInterval(refresh, 2_000); return () => { window.clearInterval(timer); }; }, [team.teamId, team.workspace, member.id]);
    const submit = () => {
        const text = question.trim();
        if (text === '' || busy)
            return;
        setBusy(true);
        setError(null);
        void fetch(endpoint(team, member), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: text, ...(task === undefined ? {} : { taskId: task.id }) }) })
            .then(async (response) => { if (!response.ok)
            throw new Error((await response.json()).error ?? '发送失败'); setQuestion(''); refresh(); })
            .catch(error => { setError(error instanceof Error ? error.message : '发送失败'); }).finally(() => { setBusy(false); });
    };
    const requestPause = () => {
        if (task === undefined || busy)
            return;
        setBusy(true);
        setError(null);
        void fetch(endpoint(team, member), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'pause', taskId: task.id }) })
            .then(async (response) => { if (!response.ok)
            throw new Error((await response.json()).error ?? '暂停请求失败'); refresh(); })
            .catch(error => { setError(error instanceof Error ? error.message : '暂停请求失败'); }).finally(() => { setBusy(false); });
    };
    const latest = items.at(-1);
    const communication = busy ? '顾问回复中' : latest === undefined ? '可咨询' : (statusLabel[latest.status] ?? '处理中');
    return _jsxs("section", { className: css.consultationSurface, "aria-label": `${member.name} 的老板直聊`, children: [_jsxs("header", { children: [_jsxs("strong", { children: ["\u8001\u677F\u76F4\u804A \u00B7 ", member.name] }), _jsx("span", { children: "\u54A8\u8BE2\u4E0D\u4F1A\u76F4\u63A5\u6539\u52A8\u4EFB\u52A1" })] }), _jsxs("div", { className: css.consultationState, children: ["\u6267\u884C\u7EBF\u7A0B\uFF1A", member.activity === 'working' ? `正在完成 ${task?.id ?? '任务'}` : '当前空闲', " \u00B7 \u6C9F\u901A\u7EBF\u7A0B\uFF1A", communication] }), member.activity === 'working' && task !== undefined && _jsx("button", { type: "button", className: css.consultationPause, disabled: busy, onClick: requestPause, children: "\u6682\u505C\u5F53\u524D\u4EFB\u52A1\u5E76\u4EA4\u961F\u957F\u5904\u7406" }), member.tools.filter(tool => tool.failures > 0).map(tool => _jsxs("button", { type: "button", className: css.consultationError, onClick: () => { setQuestion(`请分析工具「${tool.label}」最近失败的原因，以及是否应该重试或改用其他工具。错误：${tool.lastError ?? '未提供'}。`); }, children: ["\u95EE\u8FD9\u4E2A\u62A5\u9519\uFF1A", tool.label] }, tool.id)), _jsx("ol", { className: css.consultationList, children: items.map(item => _jsxs("li", { children: [_jsxs("strong", { children: ["\u8001\u677F", item.kind === 'pause_request' ? ' · 暂停请求' : ''] }), _jsx("p", { children: item.question }), _jsxs("strong", { children: [member.name, " \u7684\u5EFA\u8BAE \u00B7 ", statusLabel[item.status] ?? item.status] }), _jsx("p", { children: item.answer ?? (item.status === 'awaiting_captain' ? '已交给队长处理。' : '正在整理建议…') }), item.decision && _jsxs("p", { children: ["\u961F\u957F\u51B3\u5B9A\uFF1A", item.decision] })] }, item.consultationId)) }), error && _jsx("p", { className: css.consultationError, children: error }), _jsxs("div", { className: css.consultationComposer, children: [_jsx("textarea", { value: question, onChange: event => { setQuestion(event.target.value); }, placeholder: "\u4F8B\u5982\uFF1A\u4E3A\u4EC0\u4E48\u70ED\u70B9\u641C\u7D22\u5931\u8D25\uFF1F\u662F\u5426\u5E94\u8BE5\u6362\u5DE5\u5177\uFF1F", maxLength: 4000 }), _jsx("button", { type: "button", disabled: busy || question.trim() === '', onClick: submit, children: "\u54A8\u8BE2" })] })] });
}
