import { createHmac, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
export const TOOL_GATEWAY_PATH = '/plugins/dsh-agent-teams/tools';
const SAFE_ID = /^[A-Za-z0-9._~:/-]+$/;
function sendJson(res, status, payload) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(payload));
}
function fail(res, status, code, message) {
    sendJson(res, status, { success: false, error: { code, message } });
}
/** Errors that are intentionally safe to show after crossing the signed API boundary. */
const SAFE_UPSTREAM_ERROR_MESSAGES = Object.freeze({
    agent_identity_required: '请先登录后再使用智能体服务',
    agent_identity_auth_not_configured: '服务端身份验证尚未配置',
    agent_identity_replayed: '登录状态已失效，请刷新后重试',
    agent_identity_unauthorized: '用户身份凭证无效，请刷新后重试',
    tool_provider_owner_required: '仅商户负责人或开发者可以管理工具配置',
    tool_provider_configuration_invalid: '请填写完整的配置内容',
    tool_provider_credential_storage_not_configured: '商户工具凭证存储尚未配置',
    tool_provider_credential_invalid: '商户工具凭证不可用，请重新保存配置',
    TOOL_PROVIDER_NOT_CONFIGURED: '请先在工具库完成配置',
    tool_provider_credentials_invalid: '请先保存并测试有效的飞书应用凭证',
    tool_provider_oauth_unsupported: '该工具不支持 OAuth 授权',
});
function safeUpstreamErrorMessage(code) {
    return typeof code === 'string' ? SAFE_UPSTREAM_ERROR_MESSAGES[code] ?? '工具服务暂时无法完成请求' : '工具服务暂时无法完成请求';
}
function sessionIdFrom(req) {
    try {
        const value = new URL(req.url ?? '', 'http://localhost').searchParams.get('sessionId') ?? '';
        return value.length > 0 && value.length <= 256 && SAFE_ID.test(value) ? value : undefined;
    }
    catch {
        return undefined;
    }
}
function configuredPrincipal(config) {
    const tenantId = config.tenantId?.trim() ?? '';
    const userId = config.userId?.trim() ?? '';
    const agentId = config.agentId?.trim() ?? '';
    const loginSessionId = config.loginSessionId?.trim();
    if (!SAFE_ID.test(tenantId) || !SAFE_ID.test(userId) || !SAFE_ID.test(agentId))
        return undefined;
    if (loginSessionId !== undefined && !SAFE_ID.test(loginSessionId))
        return undefined;
    return Object.freeze({ tenantId, userId, agentId, ...(loginSessionId === undefined ? {} : { loginSessionId }) });
}
function gatewayTarget(req) {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '', 'http://localhost');
    const suffix = url.pathname.slice(TOOL_GATEWAY_PATH.length);
    const id = '[A-Za-z0-9._:-]+';
    const routes = [
        [/^\/?$/, ['GET'], () => '/api/v1/agent/tools'],
        [/^\/feishu\/connection$/, ['GET'], () => '/api/v1/agent/feishu/connection'],
        [/^\/feishu\/oauth\/start$/, ['POST'], () => '/api/v1/agent/feishu/oauth/start'],
        [/^\/feishu\/destination$/, ['POST'], () => '/api/v1/agent/feishu/destination'],
        [/^\/feishu\/disconnect$/, ['POST'], () => '/api/v1/agent/feishu/disconnect'],
        [new RegExp(`^/tool-providers/(${id})/configuration$`), ['GET', 'PUT', 'DELETE'], match => `/api/v1/agent/tool-providers/${encodeURIComponent(match[1] ?? '')}/configuration`],
        [new RegExp(`^/tool-providers/(${id})/test$`), ['POST'], match => `/api/v1/agent/tool-providers/${encodeURIComponent(match[1] ?? '')}/test`],
        [/^\/tool-providers\/feishu\/oauth\/start$/, ['POST'], () => '/api/v1/agent/feishu/oauth/start'],
        [new RegExp(`^/tool-providers/(${id})/oauth/start$`), ['POST'], match => `/api/v1/agent/tool-providers/${encodeURIComponent(match[1] ?? '')}/oauth/start`],
        [/^\/douyin\/account$/, ['GET'], () => '/api/v1/agent/douyin/account'],
        [/^\/douyin\/open-browser$/, ['POST'], () => '__local_open_ego_lite__'],
        [new RegExp(`^/(${id})/resources$`), ['GET'], match => `/api/v1/agent/tools/${encodeURIComponent(match[1] ?? '')}/resources`],
        [new RegExp(`^/(${id})/resources/(${id})/download$`), ['GET'], match => `/api/v1/agent/tools/${encodeURIComponent(match[1] ?? '')}/resources/${encodeURIComponent(match[2] ?? '')}/download`],
        [/^\/trial-context$/, ['POST'], () => '/api/v1/agent/tools/trial-context'],
        [/^\/mobile\/tasks$/, ['POST'], () => '/api/v1/agent/mobile/tasks'],
        [new RegExp(`^/mobile/tasks/(${id})/cancel$`), ['POST'], match => `/api/v1/agent/mobile/tasks/${encodeURIComponent(match[1] ?? '')}/cancel`],
        [new RegExp(`^/mobile/tasks/(${id})$`), ['GET'], match => `/api/v1/agent/mobile/tasks/${encodeURIComponent(match[1] ?? '')}`],
        [/^\/profiles$/, ['GET'], () => '/api/v1/agent/profiles'],
        [/^\/profiles\/search$/, ['POST'], () => '/api/v1/agent/profiles/search'],
        [new RegExp(`^/profiles/(${id})/memory$`), ['GET'], match => `/api/v1/agent/profiles/${encodeURIComponent(match[1] ?? '')}/memory`],
        [new RegExp(`^/profiles/(${id})/memory/(${id})/disable$`), ['POST'], match => `/api/v1/agent/profiles/${encodeURIComponent(match[1] ?? '')}/memory/${encodeURIComponent(match[2] ?? '')}/disable`],
        [new RegExp(`^/profiles/(${id})/disable$`), ['POST'], match => `/api/v1/agent/profiles/${encodeURIComponent(match[1] ?? '')}/disable`],
        [new RegExp(`^/profiles/(${id})$`), ['GET', 'PATCH'], match => `/api/v1/agent/profiles/${encodeURIComponent(match[1] ?? '')}`],
        [/^\/shared-memory$/, ['GET'], () => '/api/v1/agent/shared-memory'],
        [/^\/shared-memory\/context$/, ['GET'], () => '/api/v1/agent/shared-memory/context'],
        [/^\/shared-memory\/suggestions$/, ['POST'], () => '/api/v1/agent/shared-memory/suggestions'],
        [/^\/shared-memory\/skill-candidates$/, ['GET'], () => '/api/v1/agent/shared-memory/skill-candidates'],
        [new RegExp(`^/shared-memory/(${id})/decisions$`), ['POST'], match => `/api/v1/agent/shared-memory/${encodeURIComponent(match[1] ?? '')}/decisions`],
        [new RegExp(`^/shared-memory/skill-candidates/(${id})/decisions$`), ['POST'], match => `/api/v1/agent/shared-memory/skill-candidates/${encodeURIComponent(match[1] ?? '')}/decisions`],
        [new RegExp(`^/(${id})$`), ['GET'], match => `/api/v1/agent/tools/${encodeURIComponent(match[1] ?? '')}`],
        [new RegExp(`^/(${id})/health$`), ['GET'], match => `/api/v1/agent/tools/${encodeURIComponent(match[1] ?? '')}/health`],
        [new RegExp(`^/(${id})/(preflight|trial|proposals)$`), ['POST'], match => `/api/v1/agent/tools/${encodeURIComponent(match[1] ?? '')}/${match[2] ?? ''}`],
        [new RegExp(`^/calls/(${id})/status$`), ['GET'], match => `/api/v1/agent/tools/calls/${encodeURIComponent(match[1] ?? '')}/status`],
        [new RegExp(`^/approvals/(${id})/decision$`), ['POST'], match => `/api/v1/agent/approvals/${encodeURIComponent(match[1] ?? '')}/decision`],
        [/^\/experiences$/, ['GET'], () => '/api/v1/agent/experiences'],
        [new RegExp(`^/experiences/(${id})$`), ['PATCH', 'DELETE'], match => `/api/v1/agent/experiences/${encodeURIComponent(match[1] ?? '')}`],
        [new RegExp(`^/experiences/(${id})/disable$`), ['POST'], match => `/api/v1/agent/experiences/${encodeURIComponent(match[1] ?? '')}/disable`],
    ];
    for (const [pattern, methods, build] of routes) {
        const match = suffix.match(pattern);
        if (match === null || !methods.includes(method))
            continue;
        const query = new URLSearchParams(url.searchParams);
        query.delete('sessionId');
        const path = build(match);
        return { path: `${path}${query.size > 0 ? `?${query}` : ''}`, method };
    }
    return undefined;
}
/** Opens the installed Ego Lite application without accepting arbitrary commands from the browser. */
function openEgoLite() {
    if (process.platform !== 'darwin')
        throw new Error('EGO_LITE_UNSUPPORTED_PLATFORM');
    const result = spawnSync('open', ['-a', 'Ego Lite'], { stdio: 'ignore', timeout: 5_000 });
    if (result.error !== undefined || result.status !== 0)
        throw new Error('EGO_LITE_OPEN_FAILED');
    return { opened: true };
}
function isHarnessTarget(path) {
    const pathname = path.split('?', 1)[0] ?? '';
    return pathname === '/api/v1/agent/profiles' || pathname.startsWith('/api/v1/agent/profiles/')
        || pathname === '/api/v1/agent/shared-memory' || pathname.startsWith('/api/v1/agent/shared-memory/');
}
async function requestBody(req) {
    if (req.method === 'GET' || req.method === 'HEAD')
        return undefined;
    let body = '';
    for await (const chunk of req) {
        body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
        if (Buffer.byteLength(body) > 256 * 1024)
            throw new Error('request_too_large');
    }
    return body.length === 0 ? '{}' : body;
}
/** Proxy the fixed Agent Gateway surface while keeping identity server-owned. */
export async function handleToolGatewayRequest(req, res, config, fetcher = fetch, identityService) {
    const sessionId = sessionIdFrom(req);
    if (sessionId === undefined)
        return fail(res, 400, 'INVALID_SESSION_ID', '缺少有效的对话标识');
    const baseUrl = config.opcApiBaseUrl?.trim().replace(/\/$/, '') ?? '';
    if (baseUrl === '')
        return fail(res, 503, 'TOOL_LIBRARY_NOT_CONFIGURED', '工具库数据服务尚未配置');
    const harnessBaseUrl = (config.harnessBaseUrl ?? process.env.OPC_HARNESS_BASE_URL ?? '').trim().replace(/\/$/, '');
    const principal = identityService === undefined
        ? configuredPrincipal(config)
        : await identityService.resolve(sessionId, req).catch(() => undefined);
    if (principal === undefined)
        return fail(res, 403, 'TOOL_IDENTITY_UNAVAILABLE', '无法确认当前对话所属身份');
    const target = gatewayTarget(req);
    if (target === undefined)
        return fail(res, 404, 'TOOL_ROUTE_NOT_FOUND', '工具库接口不存在');
    const useHarness = isHarnessTarget(target.path);
    const secret = useHarness
        // Keep standalone installations backward compatible. OPC's profile
        // supplies a distinct Harness key, so production never takes this path.
        ? (config.harnessIdentityHmacSecret?.trim() || config.identityHmacSecret?.trim() || '')
        : (config.identityHmacSecret?.trim() ?? '');
    if (secret.length < 32)
        return fail(res, 503, 'TOOL_IDENTITY_NOT_CONFIGURED', useHarness ? '成长 Agent 服务端身份尚未配置' : '工具库服务端身份尚未配置');
    if (target.path === '__local_open_ego_lite__') {
        try {
            sendJson(res, 200, { success: true, data: openEgoLite() });
        }
        catch (cause) {
            const code = cause instanceof Error && cause.message === 'EGO_LITE_UNSUPPORTED_PLATFORM' ? 'EGO_LITE_UNSUPPORTED_PLATFORM' : 'EGO_LITE_OPEN_FAILED';
            fail(res, 503, code, code === 'EGO_LITE_UNSUPPORTED_PLATFORM' ? '当前系统不支持自动打开 Ego Lite' : '无法打开 Ego Lite，请确认应用已安装');
        }
        return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.gatewayTimeoutMs ?? 8_000);
    try {
        const body = await requestBody(req);
        const headers = { Accept: 'application/json' };
        if (body !== undefined) {
            const supplied = req.headers['idempotency-key'];
            const key = Array.isArray(supplied) ? supplied[0] : supplied;
            if (key !== undefined && !/^[A-Za-z0-9._:-]{8,200}$/.test(key))
                return fail(res, 400, 'IDEMPOTENCY_KEY_INVALID', '幂等键格式无效');
            headers['Content-Type'] = 'application/json';
            headers['Idempotency-Key'] = key ?? `agent-teams:${randomUUID()}`;
        }
        const timestamp = String(Date.now());
        const nonce = randomUUID();
        const useUserPrincipal = target.path.split('?', 1)[0]?.startsWith('/api/v1/agent/shared-memory') === true;
        if (useHarness && harnessBaseUrl === '')
            return fail(res, 503, 'HARNESS_NOT_CONFIGURED', '成长 Agent 服务尚未配置');
        // Nest signs Express' request.path, which deliberately excludes query
        // parameters. The query is still forwarded upstream, but including it in
        // the HMAC would make every filtered profile request fail authentication.
        const signingPath = target.path.split('?', 1)[0];
        const canonical = useHarness
            ? `${timestamp}.${nonce}.${target.method.toUpperCase()}.${signingPath}.${principal.tenantId}.${principal.userId}${useUserPrincipal ? '' : `.${principal.agentId}.${sessionId}`}`
            : [
                target.method.toUpperCase(), target.path, sessionId,
                ...(principal.loginSessionId === undefined ? [] : [principal.loginSessionId]),
                principal.tenantId, principal.userId, principal.agentId, timestamp, nonce,
            ].join('\n');
        Object.assign(headers, useHarness ? {
            'x-tenant-id': principal.tenantId,
            'x-user-id': principal.userId,
            ...useUserPrincipal ? {} : { 'x-agent-id': principal.agentId, 'x-session-id': sessionId },
            'x-auth-timestamp': timestamp,
            'x-auth-nonce': nonce,
            'x-auth-signature': createHmac('sha256', secret).update(canonical).digest('hex'),
        } : {
            'x-opc-session-id': sessionId,
            ...(principal.loginSessionId === undefined ? {} : { 'x-opc-login-session-id': principal.loginSessionId }),
            'x-opc-tenant-id': principal.tenantId,
            'x-opc-user-id': principal.userId,
            'x-opc-agent-id': principal.agentId,
            'x-opc-identity-timestamp': timestamp,
            'x-opc-identity-nonce': nonce,
            'x-opc-identity-signature': createHmac('sha256', secret).update(canonical).digest('hex'),
        });
        const download = /\/resources\/[A-Za-z0-9._:-]+\/download(?:\?|$)/.test(target.path);
        const upstream = await fetcher(`${useHarness ? harnessBaseUrl : baseUrl}${target.path}`, {
            method: target.method,
            headers,
            ...(body === undefined ? {} : { body }),
            signal: controller.signal,
            ...(download ? { redirect: 'manual' } : {}),
        });
        if (download && upstream.status >= 300 && upstream.status < 400) {
            const location = upstream.headers.get('location');
            if (location === null || !location.startsWith('https://'))
                return fail(res, 502, 'RESOURCE_DOWNLOAD_UNAVAILABLE', '资源下载地址暂不可用');
            res.writeHead(upstream.status, {
                Location: location,
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
            });
            res.end();
            return;
        }
        if (download && upstream.ok) {
            const bytes = Buffer.from(await upstream.arrayBuffer());
            res.writeHead(200, {
                'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
                'Content-Disposition': upstream.headers.get('content-disposition') ?? 'attachment',
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
            });
            res.end(bytes);
            return;
        }
        const payload = await upstream.json().catch(() => null);
        if (!upstream.ok) {
            const code = payload && typeof payload === 'object' && 'error' in payload
                ? Reflect.get(Reflect.get(payload, 'error') ?? {}, 'code') : undefined;
            return fail(res, upstream.status, typeof code === 'string' ? code : 'TOOL_GATEWAY_FAILED', safeUpstreamErrorMessage(code));
        }
        sendJson(res, 200, payload && typeof payload === 'object' && Reflect.get(payload, 'success') === true
            ? payload : { success: true, data: payload });
    }
    catch (cause) {
        const tooLarge = cause instanceof Error && cause.message === 'request_too_large';
        fail(res, tooLarge ? 413 : 503, tooLarge ? 'REQUEST_TOO_LARGE' : 'TOOL_GATEWAY_UNAVAILABLE', tooLarge ? '请求内容过大' : '工具服务暂时不可用');
    }
    finally {
        clearTimeout(timeout);
    }
}
