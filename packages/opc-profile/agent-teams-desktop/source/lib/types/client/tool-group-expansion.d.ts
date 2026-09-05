export interface ToolGroupExpansionState {
    readonly sessionId: string;
    readonly expandedGroupIds: readonly string[];
}
export declare function createToolGroupExpansionState(sessionId: string, groupIds: readonly string[], selectedGroupId?: string): ToolGroupExpansionState;
export declare function reconcileToolGroupExpansionState(state: ToolGroupExpansionState, sessionId: string, groupIds: readonly string[], selectedGroupId?: string): ToolGroupExpansionState;
export declare function toggleToolGroupExpansion(state: ToolGroupExpansionState, groupId: string): ToolGroupExpansionState;
