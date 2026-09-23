import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalCapabilityBroker } from '../../src/main/broker/local-capability-broker'
import type { LocalMediaRuntime } from '../../src/main/broker/local-media-runtime'
import { LocalAssetsRuntime } from '../../src/main/broker/local-assets-runtime'

const brokers: LocalCapabilityBroker[] = []

afterEach(async () => {
  await Promise.all(brokers.splice(0).map((broker) => broker.stop()))
})

async function request(
  endpoint: string,
  token: string,
  capability: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<Response> {
  return fetch(`${endpoint}/capabilities/${capability}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  })
}

describe('LocalCapabilityBroker', () => {
  it('sanitizes billing metadata forwarded by paid tool gateways', async () => {
    const fetchCloud = vi.fn(async () => new Response('{}'))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'billing-tools', capabilities: ['cloud.proxy'], cloudSessionToken: 'opaque-token' })
    const billing = { conversationId:'conversation',actionId:'tool',tenantId:'forged' }
    const response = await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path:'/api/v1/viral/chase-jobs',method:'POST',body:{},headers:{'x-opc-billing-context':Buffer.from(JSON.stringify(billing)).toString('base64url')} }, {'idempotency-key':'tool-call'})
    expect(response.status).toBe(200)
    const calls = fetchCloud.mock.calls as unknown as Array<[string, RequestInit]>
    const forwarded = new Headers(calls[0]![1].headers).get('x-opc-billing-context')!
    expect(JSON.parse(Buffer.from(forwarded,'base64url').toString())).toEqual({conversationId:'conversation',actionId:'tool'})
  })
  it('correlates child calls and preserves invocation retry identity', async () => {
    const fetchCloud = vi.fn(async () => new Response('data: [DONE]\n\n'))
    const onChargeActivity = vi.fn()
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud, onChargeActivity })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'billing-runtime', capabilities: ['model.invoke'], cloudSessionToken: 'opaque-token' })
    const context = { conversationId: 'child', rootConversationId: 'root', actionId: 'turn-1-step-1', actionName: '模型调用' }
    for (const invocationId of ['first', 'first', 'rerun']) {
      const response = await fetch(`${runtime.endpoint}/model/chat/completions`, {
        method: 'POST', headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json', 'x-deepseek-harness-session-id': 'child', 'x-opc-invocation-id': invocationId, 'x-opc-billing-context': Buffer.from(JSON.stringify(context)).toString('base64url') },
        body: JSON.stringify({ model: 'deepseek-chat', messages: [{role:'user',content:'same'}] })
      })
      expect(response.status).toBe(200)
      await response.text()
    }
    const calls = fetchCloud.mock.calls as unknown as Array<[string, RequestInit]>
    expect(JSON.parse(String(calls[0]![1].body)).billingContext).toEqual(context)
    const keys = calls.map(([, init]) => new Headers(init.headers).get('idempotency-key'))
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[0])
    expect(onChargeActivity).toHaveBeenCalledTimes(3)
  })
  it('connects local assets only for an explicitly granted account scope', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-broker-assets-'))
    const broker = new LocalCapabilityBroker({
      cloudBaseUrl: 'https://opc.example.test',
      localAssetsRuntime: new LocalAssetsRuntime(root)
    })
    brokers.push(broker)
    const accountA = await broker.registerRuntime({
      runtimeId: 'runtime-assets-a', mediaScopeId: 'account-a', capabilities: ['local-assets']
    })
    const accountB = await broker.registerRuntime({
      runtimeId: 'runtime-assets-b', mediaScopeId: 'account-b', capabilities: ['local-assets']
    })

    const status = await request(accountA.endpoint, accountA.token, 'local-assets', { action: 'status' })
    expect(status.status).toBe(200)
    expect(await status.json()).toMatchObject({ success: true, data: { connected: true, storage: 'local' } })
    await request(accountA.endpoint, accountA.token, 'local-assets', {
      action: 'write', kind: 'brand', name: '甲账号品牌'
    })
    const own = await (await request(accountA.endpoint, accountA.token, 'local-assets', { action: 'list' })).json() as { data: { assets: unknown[] } }
    const other = await (await request(accountB.endpoint, accountB.token, 'local-assets', { action: 'list' })).json() as { data: { assets: unknown[] } }
    expect(own.data.assets).toHaveLength(1)
    expect(other.data.assets).toHaveLength(0)

    const denied = await broker.registerRuntime({ runtimeId: 'runtime-assets-denied', capabilities: ['ego.status'] })
    expect((await request(denied.endpoint, denied.token, 'local-assets', { action: 'status' })).status).toBe(403)
  })
  it('adapts the native DeepSeek route to the authenticated platform model gateway', async () => {
    const fetchCloud = vi.fn(async (_url: string, init?: RequestInit) => new Response('data: {"id":"reply"}\n\ndata: [DONE]\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['model.invoke'], cloudSessionToken: 'account-one-token' })
    const body = JSON.stringify({ model: 'deepseek-flash', messages: [{ role: 'user', content: '你好' }], stream: true })

    const response = await fetch(`${runtime.endpoint}/model/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json', 'x-deepseek-harness-session-id': 'session-one' },
      body
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toContain('data: [DONE]')
    expect(fetchCloud).toHaveBeenCalledWith('https://opc.example.test/api/v1/model/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        cookie: 'opc_session=account-one-token',
        'content-type': 'application/json',
        'idempotency-key': expect.stringMatching(/^dsh-[a-f0-9]{64}$/)
      }),
      body: JSON.stringify({ ...JSON.parse(body), billingContext: { conversationId: 'session-one' } })
    }))
  })

  it('removes unsupported completion fields and caps platform model output tokens', async () => {
    const fetchCloud = vi.fn(async (_url: string, init?: RequestInit) => new Response('data: [DONE]\n\n', { status: 200 }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['model.invoke'], cloudSessionToken: 'account-one-token' })

    const response = await fetch(`${runtime.endpoint}/model/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-flash', messages: [{ role: 'user', content: '你好' }],
        max_tokens: 65_536, max_completion_tokens: 65_536
      })
    })

    expect(response.status).toBe(200)
    expect(JSON.parse(String(fetchCloud.mock.calls[0]?.[1]?.body))).toMatchObject({ max_tokens: 32_768 })
    expect(JSON.parse(String(fetchCloud.mock.calls[0]?.[1]?.body))).not.toHaveProperty('max_completion_tokens')
  })

  it('binds on a random loopback port and rejects a token issued for another runtime', async () => {
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test' })
    brokers.push(broker)
    const one = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['ego.status'] })
    const two = await broker.registerRuntime({ runtimeId: 'runtime-two', capabilities: ['ego.status'] })

    expect(new URL(one.origin).hostname).toBe('127.0.0.1')
    expect((await request(one.endpoint, two.token, 'ego.status', {})).status).toBe(401)
  })

  it('requires an allowlisted capability and never accepts oversized bodies', async () => {
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test' })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['ego.status'] })

    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {})).status).toBe(403)
    const oversized = await fetch(`${runtime.endpoint}/capabilities/ego.status`, {
      method: 'POST',
      headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json' },
      body: 'x'.repeat(65 * 1024)
    })
    expect(oversized.status).toBe(413)
  })

  it('normalizes DSH completion budget fields before forwarding to the model gateway', async () => {
    const fetchCloud = vi.fn(async (_url: string, _init?: RequestInit) => new Response('data: [DONE]\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({
      runtimeId: 'runtime-model',
      capabilities: ['model.invoke'],
      cloudSessionToken: 'account-one-token'
    })
    const response = await fetch(`${runtime.endpoint}/model/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${runtime.token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 99_999,
        max_completion_tokens: 65_536
      })
    })

    expect(response.status).toBe(200)
    expect(fetchCloud).toHaveBeenCalledTimes(1)
    const forwarded = JSON.parse(String(fetchCloud.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(forwarded.max_tokens).toBe(32_768)
    expect(forwarded).not.toHaveProperty('max_completion_tokens')
  })

  it('proxies only registered OPC cloud paths, strips forged credentials, and requires idempotency for writes', async () => {
    const fetchCloud = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init), { status: 200 }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['cloud.proxy'], cloudSessionToken: 'server-issued-session' })

    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: 'https://evil.example/x' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/%2e%2e/private' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/admin/users' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/v1/health' })).status).toBe(200)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/agent/conversations/6f5de5b4-1ec4-43bb-8c6e-bfb03eb1f536/messages',
      method: 'POST'
    })).status).toBe(400)

    const response = await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/agent/conversations/6f5de5b4-1ec4-43bb-8c6e-bfb03eb1f536/messages',
      method: 'POST',
      headers: {
        authorization: 'Bearer forged',
        cookie: 'fake=yes',
        host: 'evil.example',
        'x-forwarded-for': '198.51.100.1',
        'x-opc-tenant-id': 'other',
        'X-OPC-Signature': 'forged',
        'x-opc-timestamp': '0',
        'x-opc-nonce': 'forged',
        'x-request-id': 'safe'
      },
      body: { name: 'test' }
    }, { 'idempotency-key': 'unique-call-1' })
    expect(response.status).toBe(200)
    expect(fetchCloud.mock.calls[1]?.[0]).toBe('https://opc.example.test/api/v1/agent/conversations/6f5de5b4-1ec4-43bb-8c6e-bfb03eb1f536/messages')
    const outboundHeaders = fetchCloud.mock.calls[1]?.[1]?.headers as Headers
    expect(outboundHeaders.has('authorization')).toBe(false)
    expect(outboundHeaders.get('cookie')).toBe('opc_session=server-issued-session')
    expect(outboundHeaders.has('x-opc-tenant-id')).toBe(false)
    expect(outboundHeaders.has('x-opc-signature')).toBe(false)
    expect(outboundHeaders.has('x-opc-timestamp')).toBe(false)
    expect(outboundHeaders.has('x-opc-nonce')).toBe(false)
    expect(outboundHeaders.has('x-forwarded-for')).toBe(false)
  })

  it('proxies the constrained viral API surface with the broker-owned identity marker', async () => {
    const fetchCloud = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init), { status: 200 }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['cloud.proxy'], cloudSessionToken: 'server-issued-session' })

    const response = await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/viral/protagonist-anchors',
      method: 'GET',
      headers: { 'x-session-id': 'dsh-session-1', 'x-tenant-id': 'forged-tenant' },
    })

    expect(response.status).toBe(200)
    expect(fetchCloud.mock.calls[0]?.[0]).toBe('https://opc.example.test/api/v1/viral/protagonist-anchors')
    const outboundHeaders = fetchCloud.mock.calls[0]?.[1]?.headers as Headers
    expect(outboundHeaders.get('x-opc-desktop-broker')).toBe('1')
    expect(outboundHeaders.get('cookie')).toBe('opc_session=server-issued-session')
    expect(outboundHeaders.get('x-session-id')).toBe('dsh-session-1')
    expect(outboundHeaders.has('x-tenant-id')).toBe(false)
  })

  it.each([
    '/api/v1/viral/chase-jobs',
    '/api/v1/viral/chase-jobs/job-1/script?sessionId=session-1',
    '/api/v1/viral/protagonist-anchors',
    '/api/v1/viral/runtime/status'
  ])('filters unsigned identity metadata for authenticated viral requests: %s', async (path) => {
    const fetchCloud = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-agent', capabilities: ['cloud.proxy'], cloudSessionToken: 'server-session' })
    const response = await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path, headers: {
        'X-Agent-ID': 'dsh-agent_1:main', 'x-tenant-id': 'forged', 'x-user-id': 'forged',
        'x-opc-agent-id': 'forged', 'x-opc-identity-signature': 'forged', cookie: 'forged=yes'
      }
    })
    expect(response.status).toBe(200)
    const headers = fetchCloud.mock.calls[0]?.[1]?.headers as Headers
    expect(headers.get('x-agent-id')).toBe('dsh-agent_1:main')
    expect(headers.get('cookie')).toBe('opc_session=server-session')
    for (const name of ['x-tenant-id', 'x-user-id', 'x-opc-agent-id', 'x-opc-identity-signature']) {
      expect(headers.has(name)).toBe(false)
    }
  })

  it('preserves a complete signed identity envelope for an authenticated viral request', async () => {
    const fetchCloud = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-signed', capabilities: ['cloud.proxy'], cloudSessionToken: 'server-session' })
    const signature = 'a'.repeat(64)
    const response = await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/viral/chase-jobs/job-1/steps/speech', method: 'POST', body: {}, headers: {
        'x-opc-session-id': 'dsh-session-1', 'x-opc-login-session-id': 'login-session-1',
        'x-opc-tenant-id': 'tenant-1', 'x-opc-user-id': 'user-1', 'x-opc-agent-id': 'agent-1',
        'x-opc-identity-timestamp': '1760000000000', 'x-opc-identity-nonce': 'nonce-1234567',
        'x-opc-identity-signature': signature, 'x-opc-untrusted': 'never-forward',
      },
    }, { 'idempotency-key': 'signed-speech-1' })
    expect(response.status).toBe(200)
    const headers = fetchCloud.mock.calls[0]?.[1]?.headers as Headers
    for (const [name, value] of Object.entries({
      'x-opc-session-id': 'dsh-session-1', 'x-opc-login-session-id': 'login-session-1',
      'x-opc-tenant-id': 'tenant-1', 'x-opc-user-id': 'user-1', 'x-opc-agent-id': 'agent-1',
      'x-opc-identity-timestamp': '1760000000000', 'x-opc-identity-nonce': 'nonce-1234567',
      'x-opc-identity-signature': signature,
    })) expect(headers.get(name)).toBe(value)
    expect(headers.has('x-opc-untrusted')).toBe(false)
  })

  it.each(['', ' agent', 'agent ', 'a/b', '中文', 'a\r\nx-user-id: forged', 'a'.repeat(129), ['agent'], 7])(
    'never forwards malformed viral agent metadata: %j', async (agentId) => {
      const fetchCloud = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
      const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
      brokers.push(broker)
      const runtime = await broker.registerRuntime({ runtimeId: 'runtime-agent', capabilities: ['cloud.proxy'], cloudSessionToken: 'server-session' })
      const response = await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
        path: '/api/v1/viral/chase-jobs', headers: { 'x-agent-id': agentId }
      })
      expect(response.status).toBe(200)
      expect((fetchCloud.mock.calls[0]?.[1]?.headers as Headers).has('x-agent-id')).toBe(false)
    }
  )

  it.each([
    ['/api/v1/health', 'server-session'],
    ['/api/v1/agent/conversations', 'server-session'],
    ['/api/v1/viral/chase-jobs', undefined]
  ])('keeps agent identity filtered outside authenticated viral requests: %s', async (path, cloudSessionToken) => {
    const fetchCloud = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-agent', capabilities: ['cloud.proxy'], cloudSessionToken })
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path, headers: { 'x-agent-id': 'agent-1' } })).status).toBe(200)
    expect((fetchCloud.mock.calls[0]?.[1]?.headers as Headers).has('x-agent-id')).toBe(false)
  })

  it('proxies only the first-run interview route family with the broker-owned session', async () => {
    const fetchCloud = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init), { status: 200 }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['cloud.proxy'], cloudSessionToken: 'server-issued-session' })

    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/agent/onboarding/status', method: 'GET', headers: { 'x-tenant-id': 'forged-tenant' },
    })).status).toBe(200)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/agent/onboarding/interview/start', method: 'POST', body: {},
    }, { 'idempotency-key': 'onboarding-start-1' })).status).toBe(200)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/agent/onboarding/interview/not-allowed', method: 'POST', body: {},
    }, { 'idempotency-key': 'onboarding-invalid-1' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/onboarding/interview', method: 'GET',
    })).status).toBe(200)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/onboarding/interview/start', method: 'POST', body: {},
    }, { 'idempotency-key': 'onboarding-direct-start-1' })).status).toBe(200)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/onboarding/interview/nope', method: 'POST', body: {},
    }, { 'idempotency-key': 'onboarding-direct-invalid-1' })).status).toBe(400)

    const outboundHeaders = fetchCloud.mock.calls[0]?.[1]?.headers as Headers
    expect(fetchCloud.mock.calls[0]?.[0]).toBe('https://opc.example.test/api/v1/agent/onboarding/status')
    expect(fetchCloud.mock.calls[1]?.[0]).toBe('https://opc.example.test/api/v1/agent/onboarding/interview/start')
    expect(outboundHeaders.get('cookie')).toBe('opc_session=server-issued-session')
    expect(outboundHeaders.get('x-opc-desktop-broker')).toBe('1')
    expect(outboundHeaders.has('x-tenant-id')).toBe(false)
  })

  it('only reveals paths whose real location remains inside the runtime workspace', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'opc-broker-workspace-'))
    const inside = join(workspace, 'deliverable.md')
    const outside = await mkdtemp(join(tmpdir(), 'opc-broker-outside-'))
    await writeFile(inside, '# deliverable')
    await mkdir(join(workspace, 'subdir'))
    const reveal = vi.fn(async () => undefined)
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', revealPath: reveal })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['filesystem.reveal'], workspace })

    expect((await request(runtime.endpoint, runtime.token, 'filesystem.reveal', { path: outside })).status).toBe(403)
    expect((await request(runtime.endpoint, runtime.token, 'filesystem.reveal', { path: inside })).status).toBe(200)
    expect(reveal).toHaveBeenCalledWith(await realpath(inside))
  })

  it('filters file picker results to the current runtime workspace', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'opc-broker-workspace-'))
    const inside = join(workspace, 'asset.txt')
    const outside = await mkdtemp(join(tmpdir(), 'opc-broker-outside-'))
    await writeFile(inside, 'asset')
    const pickPaths = vi.fn(async () => [inside, outside])
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', pickPaths })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['filesystem.pick'], workspace })

    const response = await request(runtime.endpoint, runtime.token, 'filesystem.pick', {})
    expect(await response.json()).toEqual({ paths: [await realpath(inside)] })
  })

  it('routes only explicitly granted media capabilities to the local media runtime', async () => {
    const mediaRuntime = {
      handle: vi.fn(async () => ({ status: 200, body: { components: [] } }))
    } as unknown as LocalMediaRuntime
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', mediaRuntime })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({
      runtimeId: 'runtime-media',
      mediaScopeId: 'account-opaque',
      capabilities: ['media.status', 'media.install', 'media.claim', 'media.run', 'media.progress', 'media.cancel']
    })

    expect((await request(runtime.endpoint, runtime.token, 'media.status', {})).status).toBe(200)
    expect(mediaRuntime.handle).toHaveBeenCalledWith('media.status', {}, { runtimeId: 'account-opaque' })

    const denied = await broker.registerRuntime({ runtimeId: 'runtime-denied', capabilities: ['ego.status'] })
    expect((await request(denied.endpoint, denied.token, 'media.status', {})).status).toBe(403)
  })
})
