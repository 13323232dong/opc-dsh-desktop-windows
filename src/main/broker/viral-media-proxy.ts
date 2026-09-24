import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

export const VIRAL_UPLOAD_MAX_BYTES = 512 * 1024 * 1024
const opaqueId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u

export interface IdleDeadline {
  readonly touch: () => void
  readonly clear: () => void
}

export function createIdleDeadline(controller: AbortController, timeoutMs: number): IdleDeadline {
  let timer: ReturnType<typeof setTimeout> | undefined
  const touch = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => controller.abort(), timeoutMs)
    timer.unref?.()
  }
  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
  }
  touch()
  return { touch, clear }
}

export function isAnchorMediaPath(path: string): boolean {
  return /^\/api\/v1\/viral\/(?:protagonist-anchors\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/(video|portrait|voice)|chase-jobs\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/files\/audio\/[A-Za-z0-9][A-Za-z0-9._:-]{0,255})$/u.test(path)
}

export function uploadHeaders(request: IncomingMessage, sessionToken: string): { headers: Headers; size: number } | undefined {
  const type = request.headers['content-type']
  const length = request.headers['content-length']
  const encodedName = request.headers['x-file-name']
  const key = request.headers['idempotency-key']
  const session = request.headers['x-session-id'] ?? request.headers['x-deepseek-harness-session-id']
  const legacySession = request.headers['x-deepseek-harness-session-id']
  if (!['video/mp4', 'video/quicktime'].includes(String(type)) || typeof length !== 'string' || !/^[1-9][0-9]*$/u.test(length)) return
  const size = Number(length)
  if (!Number.isSafeInteger(size) || size > VIRAL_UPLOAD_MAX_BYTES) return
  if (typeof key !== 'string' || !opaqueId.test(key) || typeof encodedName !== 'string' || encodedName.length > 1024) return
  try {
    const name = decodeURIComponent(encodedName)
    if (!name || /[\\/\x00-\x1f\x7f]/u.test(name) || name === '.' || name === '..' || !/\.(mp4|mov)$/iu.test(name)) return
  } catch { return }
  if (typeof session !== 'string' || !opaqueId.test(session) || (legacySession !== undefined && legacySession !== session)) return
  const headers = new Headers({
    'content-type': String(type), 'content-length': length, 'x-file-name': encodedName,
    'idempotency-key': key, 'x-session-id': session, 'x-opc-desktop-broker': '1',
    cookie: `opc_session=${sessionToken}`, 'accept-encoding': 'identity'
  })
  const agent = request.headers['x-agent-id']
  if (agent !== undefined && (typeof agent !== 'string' || !opaqueId.test(agent))) return
  if (typeof agent === 'string') headers.set('x-agent-id', agent)
  return { headers, size }
}

export function boundedUpload(request: IncomingMessage, expected: number, onActivity: () => void = () => {}): Readable {
  return Readable.from((async function* () {
    let received = 0
    for await (const chunk of request) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      received += bytes.length
      if (received > expected || received > VIRAL_UPLOAD_MAX_BYTES) throw new Error('desktop_broker_media_length_mismatch')
      onActivity()
      yield bytes
    }
    if (received !== expected) throw new Error('desktop_broker_media_length_mismatch')
  })())
}

export async function streamMediaResponse(upstream: Response, response: ServerResponse, signal: AbortSignal, onActivity: () => void = () => {}): Promise<void> {
  const headers: Record<string, string> = { 'cache-control': 'private, no-store' }
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition']) {
    const value = upstream.headers.get(name)
    if (value && !(name === 'content-length' && upstream.headers.has('content-encoding'))) headers[name] = value
  }
  response.writeHead(upstream.status, headers)
  if (!upstream.body) { response.end(); return }
  const source = Readable.fromWeb(upstream.body as NodeReadableStream<Uint8Array>)
  const tracked = Readable.from((async function* () {
    for await (const chunk of source) {
      onActivity()
      yield chunk
    }
  })())
  await pipeline(tracked, response, { signal })
}
