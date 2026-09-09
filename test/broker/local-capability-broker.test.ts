import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalCapabilityBroker } from '../../src/main/broker/local-capability-broker'
import type { LocalMediaRuntime } from '../../src/main/broker/local-media-runtime'

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

  it('proxies only registered OPC cloud paths, strips forged credentials, and requires idempotency for writes', async () => {
    const fetchCloud = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init), { status: 200 }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['cloud.proxy'], cloudSessionToken: 'account-one-token' })

    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: 'https://evil.example/x' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/%2e%2e/private' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/admin/users' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/v1/health' })).status).toBe(200)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/agent/profiles/ensure-member', method: 'POST', body: { name: '线索采集', teamId: 'team-a' }
    }, { 'idempotency-key': 'member-key-1' })).status).toBe(200)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/agent/profiles/profile-a', method: 'GET'
    })).status).toBe(200)
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
    const finalCall = fetchCloud.mock.calls.at(-1)!
    expect(finalCall[0]).toBe('https://opc.example.test/api/v1/agent/conversations/6f5de5b4-1ec4-43bb-8c6e-bfb03eb1f536/messages')
    const outboundHeaders = finalCall[1]?.headers as Headers
    expect(outboundHeaders.has('authorization')).toBe(false)
    expect(outboundHeaders.get('cookie')).toBe('opc_session=account-one-token')
    expect(outboundHeaders.has('x-opc-tenant-id')).toBe(false)
    expect(outboundHeaders.has('x-opc-signature')).toBe(false)
    expect(outboundHeaders.has('x-opc-timestamp')).toBe(false)
    expect(outboundHeaders.has('x-opc-nonce')).toBe(false)
    expect(outboundHeaders.has('x-forwarded-for')).toBe(false)
    expect(outboundHeaders.get('x-opc-desktop-broker')).toBe('1')
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
