/**
 * The current DSH runtime keeps catalog navigation on its private manager
 * while the public sessions face only exposes retained addresses. Keep this
 * adapter local to the plugin so we can support both runtime generations
 * without changing the official sessions contract.
 */
function catalogNavigationAddress(sessions, sessionId) {
    const direct = sessions.navigationAddress?.(sessionId);
    if (direct !== undefined)
        return direct;
    const manager = sessions.manager;
    return manager?.navigationAddress?.call(manager, sessionId);
}
/** Open a member only through the platform's parent-owned subagent route. */
export async function openMemberSubagent(sessions, captainSessionId, memberSessionId) {
    await sessions.refreshSubagents(captainSessionId);
    const address = sessions.subagentAddress(memberSessionId)
        ?? catalogNavigationAddress(sessions, memberSessionId);
    if (address === undefined
        || address.parentSessionId !== captainSessionId
        || address.childSessionId !== memberSessionId)
        return false;
    sessions.openSubagent(address);
    return true;
}
