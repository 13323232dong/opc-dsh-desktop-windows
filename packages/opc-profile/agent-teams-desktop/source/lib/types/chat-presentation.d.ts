import type { TeamChatMessage, TeamChatMessageKind } from './types.ts';
/** Convert internal/tool-heavy text into a safe, user-facing office update. */
export declare function summarizeTeamChatContent(content: string, kind: TeamChatMessageKind): string;
export interface DisplayChatMessage extends TeamChatMessage {
    readonly displayContent?: string;
    readonly mergedIds?: readonly string[];
}
/** Collapse adjacent progress noise while retaining the newest sequence. */
export declare function mergeDisplayMessages(messages: readonly DisplayChatMessage[]): readonly DisplayChatMessage[];
