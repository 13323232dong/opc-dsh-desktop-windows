import React from 'react';
export type ToolIconKey = 'douyin-publish' | 'operations-inspiration' | 'video' | 'design-image' | 'voice' | 'feishu-document' | 'compliance-review' | 'asset-management' | 'material-matcher' | 'mobile-control' | 'computer-control' | 'web' | 'search' | 'agent-team' | 'tool';
export interface ToolIndicatorInput {
    readonly id: string;
    readonly label: string;
    readonly calls: number;
    readonly failures: number;
    readonly lastAt: number;
    readonly lastError?: string;
}
export interface ToolIndicator {
    readonly iconKey: ToolIconKey;
    readonly representativeId: string;
    readonly labels: readonly string[];
    readonly calls: number;
    readonly failures: number;
    readonly lastAt: number;
    readonly lastError?: string;
}
export declare function toolIconKey(toolId: string, groupIconKey?: string): ToolIconKey;
/** Merge tools that would otherwise render as repeated identical icons. */
export declare function groupToolIndicators(tools: readonly ToolIndicatorInput[]): readonly ToolIndicator[];
export declare function ToolIcon({ toolId, groupIconKey, size }: {
    readonly toolId: string;
    readonly groupIconKey?: string;
    readonly size?: number;
}): React.JSX.Element;
