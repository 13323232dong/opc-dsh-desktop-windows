const MAX_DISPLAY_LENGTH = 56;
function clean(value) {
    return value
        .replace(/```[\s\S]*?```/gu, ' ')
        .replace(/\{[^{}]{0,600}\}/gu, ' ')
        .replace(/\/?(?:Users|home|var|tmp)\/[^\s，。；;]+/gu, ' ')
        .replace(/[*#`_>-]+/gu, ' ')
        .replace(/(?:输出文件|保存路径|文件路径)[：:]?[^。！？\n]*/gu, ' ')
        .replace(/(?:任务|task)[ _-]?(?:id|编号)\s*[:：]?\s*[a-z0-9_-]+/giu, ' ')
        .replace(/(?:请更新|请调用|调用工具|tool(?: call)?|request_id)\s*[:：]?[^。！？\n]*/giu, ' ')
        .replace(/任务已完成[！!]?/gu, '')
        .replace(/\s+/gu, ' ')
        .trim();
}
function truncate(value) {
    return value.length <= MAX_DISPLAY_LENGTH ? value : `${value.slice(0, MAX_DISPLAY_LENGTH - 1).trim()}…`;
}
function assignmentUpdate(content) {
    if (!/(?:任务已创建|新任务|立即开始任务|你的任务|请(?:立即|尽快)[^。]{0,30}(?:任务|审核|脚本|图片|视频))/u.test(content))
        return undefined;
    const role = content.match(/(热点(?:分析师|研究员|调研员)|脚本(?:策划师|撰写师|编剧)|内容审核员|审核员|生图设计师|视频制作师)/u)?.[1];
    if (role?.startsWith('热点'))
        return `${role}，先去摸一下最近的热点，有发现就在群里说。`;
    if (role?.includes('脚本') || role === '编剧')
        return `${role}，方向已经接上了，接下来把脚本落下来。`;
    if (role?.includes('审核'))
        return `${role}，这版该你把关了，重点看看有没有风险。`;
    if (role?.includes('生图'))
        return `${role}，脚本已经接上了，接下来把参考图做出来。`;
    if (role?.includes('视频'))
        return `${role}，素材已经齐了，接下来把成片做出来。`;
    const subject = content.match(/(?:任务[^「“\n]{0,24})[「“]([^」”\n]{2,36})[」”]/u)?.[1];
    return subject === undefined ? undefined : `这一步先做“${truncate(subject)}”，有进展就在群里说。`;
}
function reportUpdate(content) {
    if (/(?:脚本已完成|完成了?脚本|脚本.*(?:写好|整理好))/u.test(content)) {
        return '脚本我写好了，重点内容和拍摄节奏都已经整理好。';
    }
    if (/(?:审核|审查)/u.test(content) && /(?:已完成|结论|评分)/u.test(content)) {
        return /(?:较高|高风险|需修改|不建议发布|方可发布)/u.test(content)
            ? '我审完了：这版还有合规风险，改完再发更稳妥。'
            : '我审完了：整体没大问题，几个细节建议已经标出来了。';
    }
    const recommendation = content.match(/推荐(?:最佳)?选题[：:]\s*[「“"]([^」”"]{2,48})/u)?.[1];
    if (recommendation !== undefined)
        return truncate(`我查了一圈，建议先做“${recommendation}”。`);
    if (/热点/u.test(content) && /(?:核心发现|已完成|分析好了|摸清)/u.test(content)) {
        return '热点我摸清了，最值得跟的方向已经整理好了。';
    }
    return undefined;
}
/** Convert internal/tool-heavy text into a safe, user-facing office update. */
export function summarizeTeamChatContent(content, kind) {
    const normalized = content.replace(/\r/gu, '').trim();
    if (kind === 'tool' || /(?:insufficient balance|rate limit|quota|error:|exception|failed)/iu.test(normalized)) {
        return '这个工具这次没跑通，我先不硬编结果，换一种方式继续。';
    }
    if (/(?:completed|已完成)/iu.test(normalized) && /(?:无法重新?claim|重新分配任务|stale attempt)/iu.test(normalized)) {
        return '这项任务已经结束了，我先不重复开工；要调整的话得重新安排。';
    }
    const assignment = assignmentUpdate(normalized);
    if (assignment !== undefined)
        return assignment;
    const report = reportUpdate(normalized);
    if (report !== undefined)
        return report;
    const cleaned = clean(normalized).replace(/^(?:队长|组长)[，,：:]?\s*/u, '');
    const firstSentence = cleaned.split(/[。！？\n]+/u).find(sentence => sentence.trim().length > 3)?.trim() ?? cleaned;
    const compact = truncate(firstSentence);
    if (compact === '')
        return kind === 'summary' ? '这一轮工作收齐了，我来汇总下一步。' : '我正在处理这一步，完成后马上同步。';
    // Preserve a short ASCII status verbatim so mailbox and chat records keep
    // the same concise operational token (for example a delivery fallback).
    if (/^[\x20-\x7e]+$/u.test(compact) && compact === normalized)
        return compact;
    return /[。！？]$/u.test(compact) ? compact : `${compact}。`;
}
/** Collapse adjacent progress noise while retaining the newest sequence. */
export function mergeDisplayMessages(messages) {
    const result = [];
    for (const message of messages) {
        const previous = result.at(-1);
        if (previous !== undefined && previous.from === message.from && previous.kind === 'status' && message.kind === 'status') {
            result[result.length - 1] = {
                ...message,
                displayContent: message.displayContent ?? summarizeTeamChatContent(message.content, message.kind),
                mergedIds: [...(previous.mergedIds ?? [previous.id]), message.id],
            };
        }
        else
            result.push(message);
    }
    return result;
}
