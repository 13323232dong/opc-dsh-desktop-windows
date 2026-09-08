/** Display-only projections for the team-visible chat log. */
const CHAT_KIND_LABELS = {
    message: '协作消息',
    status: '进度同步',
    discussion: '任务讨论',
    assignment: '任务分派',
    objection: '反对意见',
    help: '请求协助',
    decision: '决策结论',
    tool: '工具调用',
    artifact: '产物交付',
    approval: '审批请求',
    system: '系统动态',
    summary: '组长总结',
};
/** Human-readable, non-technical label for one public message type. */
export function teamChatMessageLabel(kind) {
    return CHAT_KIND_LABELS[kind];
}
function naturalMentionName(value) {
    const name = value.trim().replace(/^@+/u, '');
    return name === 'captain' ? '组长' : name;
}
/** Resolve compact, user-facing @ recipients without changing message delivery. */
export function teamChatMentionNames(message) {
    const explicit = message.mentions?.filter(value => value.trim() !== '') ?? [];
    const recipients = explicit.length > 0
        ? explicit
        : message.to !== undefined && message.to !== message.from
            ? [message.to]
            : [];
    const sender = message.from === undefined ? '' : naturalMentionName(message.from);
    return [...new Set(recipients.map(naturalMentionName).filter(name => name !== '' && name !== sender))];
}
/** Keep a bounded tail of chronological messages for the compact workbench. */
export function displayChatMessages(messages, maximum = 8) {
    return messages.slice(-Math.max(0, maximum));
}
