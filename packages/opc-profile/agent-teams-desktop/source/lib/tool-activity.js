/**
 * Safe projection of durable DSH tool events for the Agent Teams workbench.
 * Tool arguments and complete outputs are intentionally never exposed here.
 */
const TOOL_LABELS = {
    web_search: '全网热点搜索',
    web_fetch: '网页内容读取',
    image_gen: 'AI 生图',
    generate_image: 'AI 生图',
    agent_teams_claim_task: '认领团队任务',
    agent_teams_update_task: '更新团队任务',
    agent_teams_send_message: '团队沟通',
    agent_teams_status: '查询团队状态',
};
function toolLabel(name) {
    return TOOL_LABELS[name] ?? name.replaceAll('_', ' ');
}
function asToolCall(event) {
    if (typeof event !== 'object' || event === null)
        return undefined;
    const candidate = event;
    if (candidate.type !== 'tool/call' || typeof candidate.time !== 'number' || typeof candidate.data !== 'object' || candidate.data === null)
        return undefined;
    return candidate;
}
function asToolResult(event) {
    if (typeof event !== 'object' || event === null)
        return undefined;
    const candidate = event;
    if (candidate.type !== 'tool/result' || typeof candidate.time !== 'number' || typeof candidate.data !== 'object' || candidate.data === null)
        return undefined;
    return candidate;
}
function resultError(result) {
    const message = result.data.message;
    if (message?.source?.kind !== 'tool' || typeof message.source.callId !== 'string')
        return undefined;
    const blocks = message.content;
    if (!Array.isArray(blocks))
        return undefined;
    for (const block of blocks) {
        if (typeof block !== 'object' || block === null || block.type !== 'tool-result' || block.isError !== true)
            continue;
        const content = block.content;
        if (!Array.isArray(content))
            return '工具调用失败';
        const text = content.find((item) => (typeof item === 'object' && item !== null && item.type === 'text' && typeof item.text === 'string'))?.text;
        return text === undefined ? '工具调用失败' : text.replace(/\s+/gu, ' ').trim().slice(0, 160);
    }
    return undefined;
}
function successfulToolResult(result) {
    const blocks = result.data.message?.content;
    return result.data.message?.source?.kind === 'tool'
        && typeof result.data.message.source.callId === 'string'
        && Array.isArray(blocks)
        && blocks.some(block => (typeof block === 'object'
            && block !== null
            && block.type === 'tool-result'
            && block.isError !== true));
}
const FILE_MUTATION_TOOLS = new Set(['write', 'edit', 'str_replace_editor']);
/** Extract replay-safe paths from successful file mutation calls. */
export function producedFilePaths(events) {
    const calls = new Map();
    const paths = [];
    const seen = new Set();
    for (const event of events) {
        const call = asToolCall(event);
        if (call !== undefined && typeof call.data.callId === 'string' && typeof call.data.name === 'string') {
            calls.set(call.data.callId, { name: call.data.name, arguments: call.data.arguments });
            continue;
        }
        const result = asToolResult(event);
        if (result === undefined || !successfulToolResult(result))
            continue;
        const callId = result.data.message?.source?.callId;
        if (typeof callId !== 'string')
            continue;
        const callInfo = calls.get(callId);
        if (callInfo === undefined || !FILE_MUTATION_TOOLS.has(callInfo.name))
            continue;
        try {
            const parsed = typeof callInfo.arguments === 'string'
                ? JSON.parse(callInfo.arguments)
                : callInfo.arguments;
            if (typeof parsed !== 'object' || parsed === null)
                continue;
            const candidate = parsed;
            const path = typeof candidate.file_path === 'string'
                ? candidate.file_path.trim()
                : typeof candidate.path === 'string' && candidate.command !== 'view'
                    ? candidate.path.trim()
                    : '';
            if (path === '' || seen.has(path))
                continue;
            seen.add(path);
            paths.push(path);
        }
        catch {
            continue;
        }
    }
    return paths;
}
/** Aggregate completed tool calls into a minimal, non-sensitive UI view. */
export function summarizeToolActivity(events) {
    const calls = new Map();
    const summaries = new Map();
    for (const event of events) {
        const call = asToolCall(event);
        if (call !== undefined && typeof call.data.callId === 'string' && call.data.callId !== '' && typeof call.data.name === 'string' && call.data.name !== '') {
            calls.set(call.data.callId, { id: call.data.name, time: call.time });
            continue;
        }
        const result = asToolResult(event);
        if (result === undefined || result.data.message?.source?.kind !== 'tool' || typeof result.data.message.source.callId !== 'string')
            continue;
        const callInfo = calls.get(result.data.message.source.callId);
        if (callInfo === undefined)
            continue;
        const error = resultError(result);
        const previous = summaries.get(callInfo.id) ?? { calls: 0, failures: 0, lastAt: callInfo.time };
        summaries.set(callInfo.id, {
            calls: previous.calls + 1,
            failures: previous.failures + (error === undefined ? 0 : 1),
            lastAt: result.time,
            ...(error === undefined ? {} : { lastError: error }),
        });
    }
    return [...summaries.entries()].map(([id, value]) => ({ id, label: toolLabel(id), ...value }));
}
