function selectedExpansion(groupIds, selectedGroupId) {
    return selectedGroupId !== undefined && groupIds.includes(selectedGroupId) ? [selectedGroupId] : [];
}
export function createToolGroupExpansionState(sessionId, groupIds, selectedGroupId) {
    return { sessionId, expandedGroupIds: selectedExpansion(groupIds, selectedGroupId) };
}
export function reconcileToolGroupExpansionState(state, sessionId, groupIds, selectedGroupId) {
    if (state.sessionId !== sessionId)
        return createToolGroupExpansionState(sessionId, groupIds, selectedGroupId);
    const available = new Set(groupIds);
    const expandedGroupIds = state.expandedGroupIds.filter(groupId => available.has(groupId));
    if (expandedGroupIds.length === state.expandedGroupIds.length)
        return state;
    return { ...state, expandedGroupIds };
}
export function toggleToolGroupExpansion(state, groupId) {
    const isExpanded = state.expandedGroupIds.includes(groupId);
    return {
        ...state,
        expandedGroupIds: isExpanded
            ? state.expandedGroupIds.filter(current => current !== groupId)
            : [...state.expandedGroupIds, groupId],
    };
}
