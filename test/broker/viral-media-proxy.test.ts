import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalCapabilityBroker } from '../../src/main/broker/local-capability-broker'
import { boundedUpload, createIdleDeadline, uploadHeaders, VIRAL_UPLOAD_MAX_BYTES } from '../../src/main/broker/viral-media-proxy'
import { Readable } from 'node:stream'
import type { IncomingMessage } from 'node:http'

const brokers: LocalCapabilityBroker[] = []
afterEach(async () => { await Promise.all(brokers.splice(0).map((broker) => broker.stop())) })

async function setup(fetchCloud: (url: string, init: RequestInit) => Promise<Response>, session = 'test-account', mediaIdleTimeoutMs?: number) {
  const broker = new LocalCapabilityBroker({ cloudBaseUrl: 'https://opc.example.test', fetchCloud, mediaIdleTimeoutMs })
  brokers.push(broker)
  return broker.registerRuntime({ runtimeId: 'test-runtime', capabilities: ['cloud.proxy'], cloudSessionToken: session })
}

describe('viral media broker', () => {
  it('aborts only after a full idle interval and resets the deadline on activity', () => {
    vi.useFakeTimers()
    try {
      const controller = new AbortController()
      const idle = createIdleDeadline(controller, 10)
      vi.advanceTimersByTime(9)
      expect(controller.signal.aborted).toBe(false)
      idle.touch()
      vi.advanceTimersByTime(9)
      expect(controller.signal.aborted).toBe(false)
      vi.advanceTimersByTime(1)
      expect(controller.signal.aborted).toBe(true)
      idle.clear()
    } finally {
      vi.useRealTimers()
    }
  })

  it('streams raw upload without interpreting binary bytes or forwarding forged identity', async () => {
    const bytes = new Uint8Array([0, 255, 128, 13, 10, 42])
    const fetchCloud = vi.fn(async (_url: string, init: RequestInit) => {
      expect(new Uint8Array(await new Response(init.body).arrayBuffer())).toEqual(bytes)
      const headers = new Headers(init.headers)
      expect(headers.get('cookie')).toBe('opc_session=test-account')
      expect(headers.get('x-tenant-id')).toBeNull()
      expect(headers.get('x-user-id')).toBeNull()
      expect(headers.get('x-session-id')).toBe('session-one')
      expect(headers.get('x-agent-id')).toBe('agent-one')
      expect(headers.get('content-length')).toBe('6')
      expect(init.redirect).toBe('error')
      return Response.json({ assetId: 'asset-one' })
    })
    const runtime = await setup(fetchCloud)
    const response = await fetch(`${runtime.endpoint}/capabilities/cloud.proxy/media-upload`, {
      method: 'POST', body: bytes,
      headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'video/mp4',
        'content-length': '6', 'x-file-name': encodeURIComponent('本人.mp4'), 'idempotency-key': 'upload-one',
        'x-session-id': 'session-one', 'x-agent-id': 'agent-one', 'x-tenant-id': 'forged', 'x-user-id': 'forged', cookie: 'forged=1' }
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ assetId: 'asset-one' })
    expect(fetchCloud.mock.calls[0]?.[0]).toBe('https://opc.example.test/api/v1/viral/protagonist-anchors/uploads')
  })

  it('keeps a slow upload alive while chunks continue before the idle deadline', async () => {
    const fetchCloud = vi.fn(async (_url: string, init: RequestInit) => {
      expect(new Uint8Array(await new Response(init.body).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
      return Response.json({ uploadId: 'upload-one' })
    })
    // Windows CI can schedule timers more coarsely under parallel Vitest
    // load; leave ample headroom while still proving each chunk resets idle.
    const runtime = await setup(fetchCloud, 'test-account', 250)
    const body = Readable.from((async function* () {
      yield Buffer.from([1])
      await new Promise((resolve) => setTimeout(resolve, 20))
      yield Buffer.from([2])
      await new Promise((resolve) => setTimeout(resolve, 20))
      yield Buffer.from([3])
    })())
    const init: RequestInit & { duplex: 'half' } = {
      method: 'POST', body: body as unknown as BodyInit, duplex: 'half',
      headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'video/mp4',
        'content-length': '3', 'x-file-name': 'self.mp4', 'idempotency-key': 'upload-one',
        'x-session-id': 'session-one' }
    }
    const response = await fetch(`${runtime.endpoint}/capabilities/cloud.proxy/media-upload`, init)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ uploadId: 'upload-one' })
  })

  it.each<Record<string, string>>([
    { 'x-file-name': encodeURIComponent('../bad.mp4') },
    { 'content-type': 'text/plain' },
    { 'idempotency-key': '' },
    { 'x-deepseek-harness-session-id': 'conflicting-session' },
  ])('rejects invalid upload metadata before cloud call: %j', async (extra) => {
    const fetchCloud = vi.fn(async () => Response.json({}))
    const runtime = await setup(fetchCloud)
    const response = await fetch(`${runtime.endpoint}/capabilities/cloud.proxy/media-upload`, {
      method: 'POST', body: new Uint8Array([1]), headers: {
        authorization: `Bearer ${runtime.token}`, 'content-type': 'video/mp4', 'x-file-name': 'self.mp4',
        'content-length': '1', 'idempotency-key': 'upload-one', 'x-session-id': 'session-one', ...extra
      }
    })
    expect(response.status).toBe(400)
    expect(fetchCloud).not.toHaveBeenCalled()
  })

  it.each([undefined, '0', '-1', String(VIRAL_UPLOAD_MAX_BYTES + 1), '1.5'])('rejects invalid declared size %s', (size) => {
    expect(uploadHeaders({ headers: { 'content-type': 'video/mp4', 'content-length': size,
      'x-file-name': 'self.mp4', 'idempotency-key': 'upload-one', 'x-session-id': 'session-one' } } as unknown as IncomingMessage, 'test-account')).toBeUndefined()
  })

  it.each([1, 3])('rejects actual streamed length differing from declared %s', async (expected) => {
    const input = Readable.from([Buffer.from([255, 0])]) as IncomingMessage
    await expect(new Response(boundedUpload(input, expected) as unknown as BodyInit).arrayBuffer()).rejects.toThrow('desktop_broker_media_length_mismatch')
  })

  it('requires cloud login for upload and binary preview', async () => {
    const fetchCloud = vi.fn(async () => Response.json({}))
    const runtime = await setup(fetchCloud, '')
    for (const route of ['cloud.proxy/media-upload', 'cloud.proxy']) {
      const response = await fetch(`${runtime.endpoint}/capabilities/${route}`, {
        method: 'POST', headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ path: '/api/v1/viral/protagonist-anchors/anchor-one/video', method: 'GET' })
      })
      expect(response.status).toBe(401)
    }
    expect(fetchCloud).not.toHaveBeenCalled()
  })

  it('cancels the upstream preview when the client disconnects', async () => {
    let signal: AbortSignal | null | undefined
    const runtime = await setup(async (_url, init) => {
      signal = init.signal
      return new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([255])) } }), { headers: { 'content-type': 'video/mp4' } })
    })
    const response = await fetch(`${runtime.endpoint}/capabilities/cloud.proxy`, {
      method: 'POST', headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/api/v1/viral/protagonist-anchors/anchor-one/video', method: 'GET' })
    })
    const reader = response.body!.getReader()
    await reader.read()
    await reader.cancel()
    await vi.waitFor(() => expect(signal?.aborted).toBe(true))
  })

  it('streams anchor previews byte-for-byte with range headers', async () => {
    const bytes = new Uint8Array([255, 254, 0, 128])
    const runtime = await setup(async (_url, init) => {
      expect(new Headers(init.headers).get('range')).toBe('bytes=0-3')
      return new Response(bytes, { status: 206, headers: { 'content-type': 'video/mp4', 'content-length': '4', 'content-range': 'bytes 0-3/10', 'accept-ranges': 'bytes' } })
    })
    const response = await fetch(`${runtime.endpoint}/capabilities/cloud.proxy`, {
      method: 'POST', headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/api/v1/viral/protagonist-anchors/anchor-one/video', method: 'GET', headers: { range: 'bytes=0-3' } })
    })
    expect(response.status).toBe(206)
    expect(response.headers.get('content-range')).toBe('bytes 0-3/10')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('streams generated viral audio byte-for-byte with range headers', async () => {
    const bytes = new Uint8Array([255, 251, 144, 0])
    const runtime = await setup(async (_url, init) => {
      expect(new Headers(init.headers).get('range')).toBe('bytes=0-3')
      return new Response(bytes, { status: 206, headers: { 'content-type': 'audio/mpeg', 'content-length': '4', 'content-range': 'bytes 0-3/10', 'accept-ranges': 'bytes' } })
    })
    const response = await fetch(`${runtime.endpoint}/capabilities/cloud.proxy`, {
      method: 'POST', headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/api/v1/viral/chase-jobs/job-one/files/audio/job-one-audio.mp3', method: 'GET', headers: { range: 'bytes=0-3' } })
    })
    expect(response.status).toBe(206)
    expect(response.headers.get('content-type')).toBe('audio/mpeg')
    expect(response.headers.get('content-length')).toBe('4')
    expect(response.headers.get('content-range')).toBe('bytes 0-3/10')
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes)
  })

  it('keeps a slow media download alive while chunks continue before the idle deadline', async () => {
    const runtime = await setup(async () => new Response(new ReadableStream({
      async start(controller) {
        controller.enqueue(new Uint8Array([1]))
        await new Promise((resolve) => setTimeout(resolve, 20))
        controller.enqueue(new Uint8Array([2]))
        await new Promise((resolve) => setTimeout(resolve, 20))
        controller.enqueue(new Uint8Array([3]))
        controller.close()
      }
    }), { headers: { 'content-type': 'video/mp4' } }), 'test-account', 30)
    const response = await fetch(`${runtime.endpoint}/capabilities/cloud.proxy`, {
      method: 'POST', headers: { authorization: `Bearer ${runtime.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ path: '/api/v1/viral/protagonist-anchors/anchor-one/video', method: 'GET' })
    })
    expect(response.status).toBe(200)
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })
})
