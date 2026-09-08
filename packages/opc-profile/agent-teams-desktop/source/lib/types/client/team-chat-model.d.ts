/** Display-only projections for the team-visible chat log. */
export type TeamChatDisplayKind = 'message' | 'status' | 'discussion' | 'assignment' | 'objection' | 'help' | 'decision' | 'tool' | 'artifact' | 'approval' | 'system' | 'summary';
export interface TeamChatDisplayMessage {
    readonly id: string;
    readonly kind: TeamChatDisplayKind;
    readonly from?: string;
    readonly to?: string;
    readonly mentions?: readonly string[];
}
/** Human-readable, non-technical label for one public message type. */
export declare function teamChatMessageLabel(kind: TeamChatDisplayKind): string;
/** Resolve compact, user-facing @ recipients without changing message delivery. */
export declare function teamChatMentionNames(message: TeamChatDisplayMessage): readonly string[];
/** Keep a bounded tail of chronological messages for the compact workbench. */
export declare function displayChatMessages<T extends TeamChatDisplayMessage>(messages: readonly T[], maximum?: number): readonly T[];
