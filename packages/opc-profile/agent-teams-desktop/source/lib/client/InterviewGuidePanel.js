import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ACTIONS = [
    ['认识 Evan', '先用简单的话介绍你能帮我做什么。'],
    ['认识我的生意', '请用一问一答了解我的称呼、行业和主营业务。'],
    ['建立第二大脑', '请介绍本地第二大脑，征得我同意后再创建。'],
    ['完善公司资料', '请继续帮我补充公司资料，每次只问一个问题。'],
];
// The host keeps one action object per session. Weak keys survive slot remounts
// without persisting user identity or keeping closed sessions in memory.
const dismissed = new WeakSet();
const controlStyle = { border: '1px solid #d8dee8', borderRadius: 10, padding: '12px 16px', background: '#fff', color: '#1d2736', cursor: 'pointer' };

function isInterviewSession(summary) {
    const cwd = typeof summary?.cwd === 'string' ? summary.cwd.replaceAll('\\', '/') : '';
    return cwd.endsWith('/访谈') || summary?.title === '访谈';
}

export function InterviewGuidePanel({ sessionId, inputActions, input, useSessions }) {
    const summary = useSessions(state => state.byId[sessionId]);
    const [, refresh] = useState(0);
    const [error, setError] = useState('');
    const panelRef = useRef(null);
    const eligible = isInterviewSession(summary) && inputActions !== undefined;
    const visible = eligible && !dismissed.has(inputActions);
    useEffect(() => {
        if (!visible) return;
        const previous = document.activeElement;
        panelRef.current?.querySelector('button')?.focus();
        return () => { if (previous?.isConnected) previous.focus?.(); };
    }, [visible, sessionId]);
    if (!eligible) return null;
    const close = () => {
        dismissed.add(inputActions);
        setError('');
        refresh(value => value + 1);
    };
    if (!visible) return _jsx('button', {
        type: 'button', style: controlStyle,
        onClick: () => { dismissed.delete(inputActions); refresh(value => value + 1); },
        children: '继续访谈引导',
    });
    const hasDraft = Boolean(input?.draft?.trim() || input?.imageIds?.length);
    const busy = !input || input.phase !== 'plain';
    const disabled = hasDraft || busy;
    const send = (text) => {
        if (disabled) return;
        try {
            inputActions.setDraft(text);
            inputActions.submit();
            // submit is dispatch-only. Network errors remain visible in the
            // original composer; this does not claim delivery or AI success.
            close();
        } catch {
            setError('暂时无法提交，请进入对话检查输入内容后重试。');
        }
    };
    const onKeyDown = event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key !== 'Tab') return;
        const controls = [...panelRef.current.querySelectorAll('button:not(:disabled)')];
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    return createPortal(_jsxs('section', {
        ref: panelRef, role: 'dialog', 'aria-modal': true, 'aria-label': '访谈引导',
        className: 'opc-interview-guide', onKeyDown,
        style: { position: 'fixed', inset: 0, zIndex: 2147483647, boxSizing: 'border-box', overflowY: 'auto', padding: '72px 24px 32px', background: '#f7f8fa', color: '#1d2736' },
        children: [
            _jsx('button', { type: 'button', onClick: close, style: { ...controlStyle, position: 'absolute', top: 20, right: 24 }, children: '进入对话' }),
            _jsxs('div', { style: { maxWidth: 720, minHeight: 'calc(100% - 32px)', margin: '0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }, children: [
                _jsxs('header', { style: { display: 'grid', gap: 12 }, children: [
                    _jsx('span', { style: { color: '#6b7484', fontSize: 13, letterSpacing: '0.08em' }, children: 'Evan超级管家 · 首次引导' }),
                    _jsx('h1', { style: { margin: 0, fontSize: 'clamp(30px, 5vw, 52px)', lineHeight: 1.15, fontWeight: 650 }, children: '我们先认识一下' }),
                    _jsx('p', { style: { margin: 0, maxWidth: 560, color: '#596579', fontSize: 17, lineHeight: 1.7 }, children: '我会边听边了解你的生意，帮你建立可持续使用的工作资料。选择一段开始，也可以进入对话自由输入或使用语音。' }),
                ] }),
                _jsx('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 12 }, children: ACTIONS.map(([label, text], index) => _jsxs('button', {
                    type: 'button', disabled, onClick: () => send(text),
                    style: { ...controlStyle, minHeight: 84, display: 'grid', gap: 8, textAlign: 'left', opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' },
                    children: [_jsx('strong', { style: { fontSize: 16 }, children: label }), _jsx('span', { style: { color: '#6b7484', fontSize: 12 }, children: `${index + 1} / 4 · 点击开始这一段` })],
                }, label)) }),
                disabled && _jsx('p', { role: 'status', children: hasDraft ? '已有未发送的内容，请先进入对话处理。' : '输入框正在处理请求，请进入对话查看进度。' }),
                error && _jsx('p', { role: 'alert', style: { color: '#a32222' }, children: error }),
                _jsx('button', { type: 'button', onClick: close, style: { border: 0, background: 'transparent', padding: '12px 0', alignSelf: 'flex-start', color: '#596579', cursor: 'pointer' }, children: '稍后继续，先进入对话' }),
            ] }),
        ],
    }), document.body);
}
