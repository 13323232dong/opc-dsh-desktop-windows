import { createHmac, randomUUID } from 'node:crypto';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
/** Registers a reusable tenant role before its continuable team session starts. */
export async function ensureMemberProfile(config, input, fetcher = fetch) {
    const baseUrl = config.harnessBaseUrl?.trim().replace(/\/$/u, '') ?? '';
    const secret = config.identityHmacSecret?.trim() ?? '';
    if (baseUrl === '' || secret.length < 32 || ![input.sessionId, input.principal.tenantId, input.principal.userId, input.principal.agentId].every((value) => SAFE_ID.test(value))) {
        throw new Error('我的 Agent 服务身份尚未配置');
    }
    const path = '/api/v1/agent/profiles/ensure-member';
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const canonical = `${timestamp}.${nonce}.POST.${path}.${input.principal.tenantId}.${input.principal.userId}.${input.principal.agentId}.${input.sessionId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8_000);
    try {
        const response = await fetcher(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'idempotency-key': `agent-teams-member:${randomUUID()}`,
                'x-tenant-id': input.principal.tenantId,
                'x-user-id': input.principal.userId,
                'x-agent-id': input.principal.agentId,
                'x-session-id': input.sessionId,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce,
                'x-auth-signature': createHmac('sha256', secret).update(canonical).digest('hex'),
            },
            body: JSON.stringify({
                name: input.name,
                role: input.role ?? '',
                teamId: input.teamId,
                ...(input.soulMarkdown ? { soulMarkdown: input.soulMarkdown } : {}),
                ...(input.soulSummary ? { soulSummary: input.soulSummary } : {}),
                preferredTools: input.preferredTools,
            }),
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => undefined);
        const profile = payload?.profile ?? payload?.data?.profile;
        if (!response.ok || !profile || typeof profile !== 'object')
            throw new Error('我的 Agent 暂时无法登记该部门角色');
        const row = profile;
        if (typeof row.id !== 'string' || !SAFE_ID.test(row.id) || !Number.isInteger(row.currentVersion) || Number(row.currentVersion) < 1) {
            throw new Error('我的 Agent 返回了无效角色资料');
        }
        return Object.freeze({ id: row.id, currentVersion: Number(row.currentVersion) });
    }
    finally {
        clearTimeout(timeout);
    }
}
/** Reads the published profile used to freeze a new member's model and SOUL. */
export async function fetchMemberProfile(config, input, fetcher = fetch) {
    const baseUrl = config.harnessBaseUrl?.trim().replace(/\/$/u, '') ?? '';
    const secret = config.identityHmacSecret?.trim() ?? '';
    if (baseUrl === '' || secret.length < 32 || ![input.sessionId, input.profileId, input.principal.tenantId, input.principal.userId, input.principal.agentId].every((value) => SAFE_ID.test(value))) {
        throw new Error('我的 Agent 服务身份尚未配置');
    }
    const path = `/api/v1/agent/profiles/${encodeURIComponent(input.profileId)}`;
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const canonical = `${timestamp}.${nonce}.GET.${path}.${input.principal.tenantId}.${input.principal.userId}.${input.principal.agentId}.${input.sessionId}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 8_000);
    try {
        const response = await fetcher(`${baseUrl}${path}`, {
            headers: {
                accept: 'application/json',
                'x-tenant-id': input.principal.tenantId,
                'x-user-id': input.principal.userId,
                'x-agent-id': input.principal.agentId,
                'x-session-id': input.sessionId,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce,
                'x-auth-signature': createHmac('sha256', secret).update(canonical).digest('hex'),
            }, signal: controller.signal,
        });
        const payload = await response.json().catch(() => undefined);
        const version = payload?.version;
        if (!response.ok || !payload || !Number.isInteger(payload.currentVersion) || Number(payload.currentVersion) < 1 || !version || typeof version !== 'object') {
            throw new Error('我的 Agent 暂时无法读取角色配置');
        }
        const row = version;
        if (typeof row.persona !== 'string' || row.persona.trim() === '')
            throw new Error('我的 Agent 返回了无效角色资料');
        return Object.freeze({
            currentVersion: Number(payload.currentVersion), persona: row.persona,
            ...(typeof row.modelRoute === 'string' && row.modelRoute !== '' ? { modelRoute: row.modelRoute } : {}),
            ...(typeof row.soulMarkdown === 'string' && row.soulMarkdown !== '' ? { soulMarkdown: row.soulMarkdown } : {}),
            ...(typeof row.soulSummary === 'string' && row.soulSummary !== '' ? { soulSummary: row.soulSummary } : {}),
        });
    }
    finally {
        clearTimeout(timeout);
    }
}
