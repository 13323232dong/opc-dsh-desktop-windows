/**
 * Shared avatar artwork lookup for the activity panel and the conversation
 * card. Each common department role has its own generated avatar so a team
 * stays recognizable at the small sizes used by the workbench.
 * @module dsh-agent-teams/client/artwork
 */
/** Artwork route prefix served by the plugin host half. */
export const ART_BASE = '/plugins/dsh-agent-teams/assets/';
const AVATAR_BASE = '/plugins/dsh-agent-teams/avatars/';
/** Role artwork per role keyword. More specific roles must come first. */
const ROLE_ART = [
    [/digital.?human|avatar.?producer|数字人|虚拟人/, 'digital-human-producer.png'],
    [/compliance|legal|governance|合规|法务|风控/, 'compliance-reviewer.png'],
    [/customer.?service|support|客服|售后/, 'customer-service.png'],
    [/comment.?ops|community|评论运营|社群/, 'comment-ops.png'],
    [/competitor|competitive|radar|竞品|雷达/, 'competitor-radar.png'],
    [/creative.?planner|creative.?strategy|策划|创意/, 'creative-planner.png'],
    [/video|film|producer|剪辑|视频|制片/, 'video-producer.png'],
    [/voice|tts|speech|配音|语音/, 'voice-tts.png'],
    [/topic|editor|选题|编辑/, 'topic-editor.png'],
    [/publisher|publish|release|distribution|发布|分发/, 'publisher.png'],
    [/asset|library|素材|资产/, 'asset-manager.png'],
    [/growth|acquisition|增长|投放/, 'growth-analyst.png'],
    [/data.?analyst|data|数据分析/, 'data-analyst.png'],
    [/research|analys|investig|explor|study|研究|分析|调查|探索|调研/, 'researcher.png'],
    [/script|copywriter|writer|文案|编剧|写作|撰写/, 'scriptwriter.png'],
    [/review|audit|quality|\bqa\b|test|verif|审查|审核|测试|质量/, 'reviewer.png'],
    [/design|\bui\b|\bux\b|front|theme|accessib|设计|前端|主题/, 'designer.png'],
    [/operations|\bops\b|运营|流程/, 'operations.png'],
    [/engineer|dev\b|server|backend|\bapi\b|runtime|watcher|contract|工程|后端|服务|接口|开发|代码|编程|技术/, 'tech-checker.png'],
];
/** Captain artwork (always the dedicated captain avatar). */
export const LEAD_ART = `${AVATAR_BASE}captain.png`;
/** Status action artwork per member activity. */
export const ACTION_ART = {
    working: `${ART_BASE}action-working.png`,
    idle: `${ART_BASE}action-sleeping.png`,
    unknown: `${ART_BASE}action-thinking.png`,
};
/**
 * Member artwork URL, or null when no role matches (initial-letter fallback).
 * @param name - the member's display name.
 * @param role - the member's role text.
 * @returns the artwork URL, or null when unmatched.
 */
export function memberArtUrl(name, role) {
    const identity = `${name} ${role}`.toLowerCase();
    for (const [pattern, art] of ROLE_ART) {
        if (pattern.test(identity))
            return `${AVATAR_BASE}${art}`;
    }
    return null;
}
