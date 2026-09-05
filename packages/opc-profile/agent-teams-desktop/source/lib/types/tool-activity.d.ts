/**
 * Safe projection of durable DSH tool events for the Agent Teams workbench.
 * Tool arguments and complete outputs are intentionally never exposed here.
 */
export interface ToolActivity {
    readonly id: string;
    readonly label: string;
    readonly calls: number;
    readonly failures: number;
    readonly lastAt: number;
    readonly lastError?: string;
}
/** Extract replay-safe paths from successful file mutation calls. */
export declare function producedFilePaths(events: readonly unknown[]): readonly string[];
/** Aggregate completed tool calls into a minimal, non-sensitive UI view. */
export declare function summarizeToolActivity(events: readonly unknown[]): readonly ToolActivity[];
