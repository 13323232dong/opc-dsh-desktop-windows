import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';

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
    if (!isInterviewSession(session) || inputActions === undefined)
        return null;
    const send = (text) => {
        inputActions.setDraft(text);
        inputActions.submit();
    };
    return _jsxs('section', { className: 'opc-interview-guide', 'aria-label': '访谈引导', style: { margin: '12px auto 0', maxWidth: 720, padding: '16px 18px', border: '1px solid var(--dsw-alias-border-l2, #dfe5ee)', borderRadius: 12, background: 'var(--dsw-alias-bg-raised, #fff)' }, children: [
            _jsxs('div', { className: 'opc-interview-guide-copy', style: { display: 'grid', gap: 4 }, children: [
                    _jsx('span', { className: 'opc-interview-guide-kicker', style: { color: 'var(--dsw-alias-label-tertiary, #68758a)', fontSize: 12 }, children: 'Evan 超级管家 · 首次引导' }),
                    _jsx('strong', { style: { fontSize: 17 }, children: '我们先认识一下' }),
                    _jsx('p', { style: { margin: 0, color: 'var(--dsw-alias-label-secondary, #596579)', fontSize: 13 }, children: '边聊边了解你的生意，也可以随时跳过，之后再继续。' }),
                ] }),
            _jsx('div', { className: 'opc-interview-guide-actions', style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }, children: ACTIONS.map(([label, text]) => _jsx('button', { type: 'button', onClick: () => send(text), style: { border: '1px solid var(--dsw-alias-border-l2, #dfe5ee)', borderRadius: 8, padding: '8px 11px', background: 'var(--dsw-alias-bg-base, #fff)', cursor: 'pointer' }, children: label }, label)) }),
            _jsx('button', { type: 'button', className: 'opc-interview-guide-skip', onClick: () => send('先跳过访谈，之后我会在这个会话里继续。'), style: { marginTop: 10, border: 0, padding: 0, background: 'transparent', color: 'var(--dsw-alias-label-tertiary, #68758a)', cursor: 'pointer', fontSize: 12 }, children: '稍后继续' }),
        ] });
}
