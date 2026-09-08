import { createHmac, randomUUID } from 'node:crypto';
const CONTEXT_PATH = '/api/v1/agent/shared-memory/context';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
/** Read tenant-private CEO context. Failure is advisory and never blocks a DSH turn. */
export async function fetchCaptainSharedMemory(config, fetcher = fetch) {
    const baseUrl = config.harnessBaseUrl?.trim().replace(/\/$/u, '') ?? '';
    const secret = config.identityHmacSecret ?? '';
    const tenantId = config.tenantId?.trim() ?? '';
    const userId = config.userId?.trim() ?? '';
    const agentId = config.agentId?.trim() ?? '';
    if (baseUrl === '' || secret.length < 32 || ![tenantId, userId, agentId, config.sessionId].every(value => SAFE_ID.test(value)))
        return undefined;
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const canonical = `${timestamp}.${nonce}.GET.${CONTEXT_PATH}.${tenantId}.${userId}.${agentId}.${config.sessionId}`;
    try {
        const response = await fetcher(`${baseUrl}${CONTEXT_PATH}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'x-tenant-id': tenantId,
                'x-user-id': userId,
                'x-agent-id': agentId,
                'x-session-id': config.sessionId,
                'x-auth-timestamp': timestamp,
                'x-auth-nonce': nonce,
                'x-auth-signature': createHmac('sha256', secret).update(canonical).digest('hex'),
            },
            signal: config.signal,
        });
        if (!response.ok)
            return undefined;
        const payload = await response.json().catch(() => undefined);
        const value = payload?.success === true ? payload.data : payload;
        if (!isContext(value))
            return undefined;
        return value;
    }
    catch {
        return undefined;
    }
}
function isContext(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const mode = Reflect.get(value, 'mode');
    const text = Reflect.get(value, 'text');
    const memoryIds = Reflect.get(value, 'memoryIds');
    return (mode === 'full' || mode === 'summary') && typeof text === 'string' && text.length <= 20_000
        && Array.isArray(memoryIds) && memoryIds.length <= 200 && memoryIds.every(id => typeof id === 'string');
}
