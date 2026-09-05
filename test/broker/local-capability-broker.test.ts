import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalCapabilityBroker } from '../../src/main/broker/local-capability-broker'

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

  it('proxies only relative OPC API paths, strips forged credentials, and requires idempotency for writes', async () => {
    const fetchCloud = vi.fn(async (_url: string, init?: RequestInit) => new Response(JSON.stringify(init), { status: 200 }))
    const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud })
    brokers.push(broker)
    const runtime = await broker.registerRuntime({ runtimeId: 'runtime-one', capabilities: ['cloud.proxy'] })

    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: 'https://evil.example/x' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/%2e%2e/private' })).status).toBe(400)
    expect((await request(runtime.endpoint, runtime.token, 'cloud.proxy', { path: '/api/v1/tasks', method: 'POST' })).status).toBe(400)

    const response = await request(runtime.endpoint, runtime.token, 'cloud.proxy', {
      path: '/api/v1/tasks',
      method: 'POST',
      headers: { authorization: 'Bearer forged', cookie: 'fake=yes', 'x-opc-tenant-id': 'other', 'x-request-id': 'safe' },
      body: { name: 'test' }
    }, { 'idempotency-key': 'unique-call-1' })
    expect(response.status).toBe(200)
    expect(fetchCloud.mock.calls[0]?.[0]).toBe('https://opc.example.test/api/v1/tasks')
    const outboundHeaders = fetchCloud.mock.calls[0]?.[1]?.headers as Headers
    expect(outboundHeaders.has('authorization')).toBe(false)
    expect(outboundHeaders.has('cookie')).toBe(false)
    expect(outboundHeaders.has('x-opc-tenant-id')).toBe(false)
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
})
