const TOOL_GATEWAY_PATH = '/plugins/dsh-agent-teams/tools';
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** Adapts the Harness policy response ({ approval: { id, status } }) for the UI contract. */
export function normalizeToolProposal(value) {
    const response = record(value) ? value : undefined;
    const approval = response !== undefined && record(response.approval) ? response.approval : response;
    const approvalId = typeof approval?.id === 'string' ? approval.id
        : typeof approval?.approvalId === 'string' ? approval.approvalId : undefined;
    const status = typeof approval?.status === 'string' ? approval.status : undefined;
    if (approvalId === undefined || !['pending', 'approved', 'rejected', 'expired'].includes(status ?? '')) {
        throw new Error('工具审批响应无效');
    }
    return {
        proposalId: typeof response?.proposalId === 'string' ? response.proposalId : approvalId,
        approvalId,
        status: status,
    };
}
function idempotencyKey() {
    return `agent-teams:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}
function toolUrl(sessionId, suffix = '') {
    const separator = suffix.includes('?') ? '&' : '?';
    return `${TOOL_GATEWAY_PATH}${suffix}${separator}sessionId=${encodeURIComponent(sessionId)}`;
}
function gatewayErrorMessage(payload) {
    const message = payload?.error?.message;
    return typeof message === 'string' && message.length > 0 && message.length <= 160
        ? message
        : '工具服务暂时无法完成请求';
}
async function request(sessionId, path, method, body) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        headers['Idempotency-Key'] = idempotencyKey();
    }
    const response = await globalThis.fetch(toolUrl(sessionId, path), {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false || payload === null)
        throw new Error(gatewayErrorMessage(payload));
    return (payload.data ?? payload);
}
/** Build the session-scoped browser face for the Agent Teams host gateway. */
export function createToolLibraryClient(sessionId) {
    return {
        listTools: () => request(sessionId, '', 'GET'),
        getTool: (toolId, version) => request(sessionId, `/${encodeURIComponent(toolId)}${version ? `?version=${encodeURIComponent(version)}` : ''}`, 'GET'),
        getHealth: (toolId, version) => request(sessionId, `/${encodeURIComponent(toolId)}/health${version ? `?version=${encodeURIComponent(version)}` : ''}`, 'GET'),
        getTrialContext: () => request(sessionId, '/trial-context', 'POST', {}),
        preflight: (toolId, version, input) => request(sessionId, `/${encodeURIComponent(toolId)}/preflight`, 'POST', { version, input }),
        createProposal: async (toolId, version, input) => normalizeToolProposal(await request(sessionId, `/${encodeURIComponent(toolId)}/proposals`, 'POST', { version, input, summary: 'Agent Teams 工具库手动试用' })),
        decideApproval: async (approvalId, decision) => normalizeToolProposal(await request(sessionId, `/approvals/${encodeURIComponent(approvalId)}/decision`, 'POST', { decision })),
        trial: (toolId, input) => request(sessionId, `/${encodeURIComponent(toolId)}/trial`, 'POST', input),
        getCallStatus: toolCallId => request(sessionId, `/calls/${encodeURIComponent(toolCallId)}/status`, 'GET'),
        listResources: toolId => request(sessionId, `/${encodeURIComponent(toolId)}/resources`, 'GET'),
        resourceDownloadUrl: (toolId, resourceId) => toolUrl(sessionId, `/${encodeURIComponent(toolId)}/resources/${encodeURIComponent(resourceId)}/download`),
        listExperiences: toolId => request(sessionId, `/experiences${toolId ? `?toolId=${encodeURIComponent(toolId)}` : ''}`, 'GET'),
        updateExperience: (id, changes) => request(sessionId, `/experiences/${encodeURIComponent(id)}`, 'PATCH', changes),
        disableExperience: id => request(sessionId, `/experiences/${encodeURIComponent(id)}/disable`, 'POST', {}),
        deleteExperience: id => request(sessionId, `/experiences/${encodeURIComponent(id)}`, 'DELETE', {}),
        listAgentProfiles: (status) => request(sessionId, `/profiles${status ? `?status=${encodeURIComponent(status)}` : ''}`, 'GET'),
        getAgentProfile: id => request(sessionId, `/profiles/${encodeURIComponent(id)}`, 'GET'),
        updateAgentProfile: (id, update) => request(sessionId, `/profiles/${encodeURIComponent(id)}`, 'PATCH', update),
        disableAgentProfile: id => request(sessionId, `/profiles/${encodeURIComponent(id)}/disable`, 'POST', {}),
        listAgentMemories: agentId => request(sessionId, `/profiles/${encodeURIComponent(agentId)}/memory`, 'GET'),
        disableAgentMemory: (agentId, memoryId) => request(sessionId, `/profiles/${encodeURIComponent(agentId)}/memory/${encodeURIComponent(memoryId)}/disable`, 'POST', {}),
        listSharedMemories: status => request(sessionId, `/shared-memory${status ? `?status=${encodeURIComponent(status)}` : ''}`, 'GET'),
        decideSharedMemory: (id, decision, expectedVersion) => request(sessionId, `/shared-memory/${encodeURIComponent(id)}/decisions`, 'POST', { decision, expectedVersion }),
        listSkillCandidates: status => request(sessionId, `/shared-memory/skill-candidates${status ? `?status=${encodeURIComponent(status)}` : ''}`, 'GET'),
        decideSkillCandidate: (id, decision, expectedVersion) => request(sessionId, `/shared-memory/skill-candidates/${encodeURIComponent(id)}/decisions`, 'POST', { decision, expectedVersion }),
        getProviderConfiguration: providerId => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/configuration`, 'GET'),
        saveProviderConfiguration: (providerId, values) => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/configuration`, 'PUT', values),
        deleteProviderConfiguration: providerId => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/configuration`, 'DELETE', {}),
        testProviderConfiguration: providerId => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/test`, 'POST', {}),
        startProviderOAuth: providerId => request(sessionId, `/tool-providers/${encodeURIComponent(providerId)}/oauth/start`, 'POST', {}),
        getFeishuConnection: () => request(sessionId, '/feishu/connection', 'GET'),
        startFeishuOAuth: () => request(sessionId, '/feishu/oauth/start', 'POST', {}),
        setFeishuDestination: folderUrl => request(sessionId, '/feishu/destination', 'POST', { folderUrl }),
        disconnectFeishu: () => request(sessionId, '/feishu/disconnect', 'POST', {}),
        getDouyinAccount: () => request(sessionId, '/douyin/account', 'GET'),
        openEgoLite: () => request(sessionId, '/douyin/open-browser', 'POST', {}),
    };
}
