import { jsx as _jsx } from "react/jsx-runtime";
import { Archive, AudioLines, Bot, Clapperboard, FileCheck2, FileText, Globe2, Image, Lightbulb, MonitorCog, Search, Send, Smartphone, Video, Wrench } from 'lucide-react';
const ICONS = {
    'douyin-publish': Send,
    'operations-inspiration': Lightbulb,
    video: Video,
    'design-image': Image,
    voice: AudioLines,
    'feishu-document': FileText,
    'compliance-review': FileCheck2,
    'asset-management': Archive,
    'material-matcher': Clapperboard,
    'mobile-control': Smartphone,
    'computer-control': MonitorCog,
    web: Globe2,
    search: Search,
    'agent-team': Bot,
    tool: Wrench,
};
const SUPPORTED = new Set(Object.keys(ICONS));
export function toolIconKey(toolId, groupIconKey) {
    if (groupIconKey !== undefined && SUPPORTED.has(groupIconKey))
        return groupIconKey;
    if (toolId.startsWith('douyin.') || toolId.startsWith('douyin_'))
        return 'douyin-publish';
    if (toolId.startsWith('inspiration.'))
        return 'operations-inspiration';
    if (toolId.startsWith('seedance.') || toolId.startsWith('h3.'))
        return 'video';
    if (toolId.startsWith('design.') || toolId === 'image_gen' || toolId === 'generate_image')
        return 'design-image';
    if (toolId.startsWith('voice-clone.') || toolId.startsWith('speech.'))
        return 'voice';
    if (toolId.startsWith('feishu.'))
        return 'feishu-document';
    if (toolId.startsWith('publish-precheck.'))
        return 'compliance-review';
    if (toolId.startsWith('assets.') || toolId.startsWith('assets_'))
        return 'asset-management';
    if (toolId.startsWith('material.'))
        return 'material-matcher';
    if (toolId.startsWith('mobile.') || toolId.startsWith('mobile_') || toolId.startsWith('wechat_') || toolId.startsWith('wechat.'))
        return 'mobile-control';
    if (toolId.startsWith('computer_') || toolId.startsWith('computer.'))
        return 'computer-control';
    if (toolId === 'web_search')
        return 'web';
    if (toolId === 'web_fetch')
        return 'search';
    if (toolId.startsWith('agent_teams_'))
        return 'agent-team';
    return 'tool';
}
/** Merge tools that would otherwise render as repeated identical icons. */
export function groupToolIndicators(tools) {
    const groups = new Map();
    for (const tool of tools) {
        const iconKey = toolIconKey(tool.id);
        const previous = groups.get(iconKey);
        if (previous === undefined) {
            groups.set(iconKey, {
                iconKey,
                representativeId: tool.id,
                labels: [tool.label],
                calls: tool.calls,
                failures: tool.failures,
                lastAt: tool.lastAt,
                ...(tool.lastError === undefined ? {} : { lastError: tool.lastError }),
            });
            continue;
        }
        const newest = tool.lastAt >= previous.lastAt;
        groups.set(iconKey, {
            iconKey,
            representativeId: newest ? tool.id : previous.representativeId,
            labels: previous.labels.includes(tool.label) ? previous.labels : [...previous.labels, tool.label],
            calls: previous.calls + tool.calls,
            failures: previous.failures + tool.failures,
            lastAt: Math.max(previous.lastAt, tool.lastAt),
            ...newest && tool.lastError !== undefined
                ? { lastError: tool.lastError }
                : previous.lastError === undefined ? {} : { lastError: previous.lastError },
        });
    }
    return [...groups.values()];
}
export function ToolIcon({ toolId, groupIconKey, size = 15 }) {
    const Icon = ICONS[toolIconKey(toolId, groupIconKey)];
    return _jsx(Icon, { size: size, strokeWidth: 1.9, "aria-hidden": "true" });
}
