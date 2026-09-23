import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState } from 'react';

const ACTIONS = [
    ['认识 Evan', '先用简单的话介绍你能帮我做什么。'],
    ['认识我的生意', '请用一问一答了解我的称呼、行业和主营业务。'],
    ['建立第二大脑', '请介绍本地第二大脑，征得我同意后再创建。'],
    ['完善公司资料', '请继续帮我补充公司资料，每次只问一个问题。'],
];

function isInterviewSession(session) {
    const cwd = typeof session?.cwd === 'string' ? session.cwd.replaceAll('\\', '/') : '';
    return cwd.endsWith('/访谈') || session?.title === '访谈';
}

export function InterviewGuidePanel({ session, inputActions }) {
    const [visible, setVisible] = useState(true);
    if (!isInterviewSession(session) || inputActions === undefined)
        return null;
    if (!visible)
        return null;
    const send = (text) => {
        setVisible(false);
        inputActions.setDraft(text);
        inputActions.submit();
    };
    return _jsxs('section', { className: 'opc-interview-guide', 'aria-label': '访谈引导', style: { position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 'clamp(28px, 8vw, 96px) 24px', background: '#f7f8fa', color: '#1d2736' }, children: [
            _jsx('button', { type: 'button', 'aria-label': '进入访谈对话', onClick: () => setVisible(false), style: { position: 'absolute', top: 24, right: 28, border: '1px solid #d8dee8', borderRadius: 8, padding: '8px 12px', background: '#fff', color: '#596579', cursor: 'pointer' }, children: '进入对话' }),
            _jsxs('div', { className: 'opc-interview-guide-content', style: { width: 'min(720px, 100%)', display: 'grid', gap: 24 }, children: [
                    _jsxs('div', { className: 'opc-interview-guide-copy', style: { display: 'grid', gap: 10 }, children: [
                            _jsx('span', { className: 'opc-interview-guide-kicker', style: { color: '#6b7484', fontSize: 13, letterSpacing: '0.08em' }, children: 'EVAN 超级管家 · 首次引导' }),
                            _jsx('strong', { style: { fontSize: 'clamp(30px, 5vw, 52px)', lineHeight: 1.1, fontWeight: 650 }, children: '我们先认识一下' }),
                            _jsx('p', { style: { margin: 0, maxWidth: 540, color: '#596579', fontSize: 17, lineHeight: 1.6 }, children: '我会边听边了解你的生意，帮你建立可持续使用的工作资料。每一步都可以跳过，之后再继续。' }),
                        ] }),
                    _jsxs('div', { className: 'opc-interview-guide-actions', style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: ACTIONS.map(([label, text]) => _jsxs('button', { type: 'button', onClick: () => send(text), style: { minHeight: 78, display: 'grid', justifyItems: 'start', gap: 6, textAlign: 'left', border: '1px solid #d8dee8', borderRadius: 10, padding: '16px 18px', background: '#fff', color: '#1d2736', cursor: 'pointer' }, children: [_jsx('strong', { style: { fontSize: 15 }, children: label }), _jsx('span', { style: { color: '#6b7484', fontSize: 12 }, children: '点击开始这一段' })] }, label)) }),
                    _jsx('button', { type: 'button', className: 'opc-interview-guide-skip', onClick: () => setVisible(false), style: { justifySelf: 'start', border: 0, padding: 0, background: 'transparent', color: '#6b7484', cursor: 'pointer', fontSize: 13 }, children: '稍后继续，先进入工作台' }),
                ] }),
        ] });
}
