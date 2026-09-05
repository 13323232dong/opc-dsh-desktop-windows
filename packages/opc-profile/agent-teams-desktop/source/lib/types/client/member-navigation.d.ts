import type { SessionId, SubagentAddress } from '@deepseek-ai/dsh-client-runtime/client';
export interface MemberSubagentNavigator {
    refreshSubagents(parentSessionId: SessionId): Promise<void>;
    subagentAddress(sessionId: SessionId): SubagentAddress | undefined;
    /** Resolve a child from any already-loaded catalog when no retained address exists. */
    navigationAddress?(sessionId: SessionId): SubagentAddress | undefined;
    openSubagent(address: SubagentAddress): void;
}
/** Open a member only through the platform's parent-owned subagent route. */
export declare function openMemberSubagent(sessions: MemberSubagentNavigator, captainSessionId: SessionId, memberSessionId: SessionId): Promise<boolean>;
