import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { realpath } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { isLocalCapability, type LocalCapability } from '../../shared/broker-contracts'
import {
  isMediaCapability,
  type LocalMediaRuntime,
  type MediaCapability
} from './local-media-runtime'

const MAX_BODY_BYTES = 64 * 1024
const CLOUD_REQUEST_TIMEOUT_MS = 15_000
const FORGED_CLOUD_HEADERS = new Set([
  'authorization',
  'cookie',
  'host'
])
const DESKTOP_BROKER_HEADER = 'x-opc-desktop-broker'

// This is intentionally a route-level, compile-time allowlist. Adding an OPC
// API route requires changing this list and its security test; there is no
// generic `/api/*` escape hatch in the desktop broker.
const OPC_DESKTOP_CLOUD_PATH_TEMPLATES = [
  /^\/api\/v1\/health$/u,
  /^\/api\/v1\/agent\/conversations$/u,
  /^\/api\/v1\/agent\/conversations\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u,
  /^\/api\/v1\/agent\/conversations\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/messages$/u,
  /^\/api\/v1\/agent\/conversations\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/events$/u,
  /^\/api\/v1\/agent\/conversations\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/runs\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/interrupt$/u,
  /^\/api\/v1\/agent\/conversations\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/runs\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/interactions\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/responses$/u,
  /^\/api\/v1\/agent\/conversations\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/plans\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u,
  /^\/api\/v1\/agent\/conversations\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/plans\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/(answers|revision|approval|material-supplements)$/u,
  /^\/api\/v1\/agent\/feedback$/u,
  /^\/api\/v1\/agent\/feedback\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u,
  /^\/api\/v1\/agent\/feedback-center\/(summary|feedback|clusters)$/u,
  /^\/api\/v1\/agent\/feedback-center\/clusters\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/(approve|reject)$/u,
  /^\/api\/v1\/agent\/feedback-center\/knowledge\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/withdraw$/u,
  /^\/api\/v1\/agent\/tools$/u,
  /^\/api\/v1\/agent\/tools\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u,
  /^\/api\/v1\/agent\/tools\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/(health|preflight|trial|proposals)$/u,
  /^\/api\/v1\/agent\/tools\/calls\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/status$/u,
  /^\/api\/v1\/agent\/tools\/trial-context$/u,
  /^\/api\/v1\/agent\/approvals\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/decision$/u,
  /^\/api\/v1\/agent\/(experiences|profiles)$/u,
  /^\/api\/v1\/agent\/profiles\/ensure-member$/u,
  /^\/api\/v1\/agent\/profiles\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u,
  /^\/api\/v1\/agent\/experiences\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}(\/disable)?$/u,
  /^\/api\/v1\/agent\/profiles\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/(memory|disable)$/u,
  /^\/api\/v1\/agent\/profiles\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/memory\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/disable$/u,
  /^\/api\/v1\/viral\/chase-jobs(?:\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127})?(?:\/[A-Za-z0-9][A-Za-z0-9._:/-]{0,255})?$/u,
  /^\/api\/v1\/viral\/protagonist-anchors(?:\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127})?(?:\/[A-Za-z0-9][A-Za-z0-9._:/-]{0,255})?$/u,
  /^\/api\/v1\/viral\/runtime\/status$/u
] as const

export interface BrokerRuntimeRegistration {
  runtimeId: string
  capabilities: readonly BrokerCapability[]
  workspace?: string
  /** Stable opaque account namespace used only for durable local media tasks. */
  mediaScopeId?: string
  /** Opaque OPC session kept only in the main process/Broker. */
  cloudSessionToken?: string
}

export interface RegisteredBrokerRuntime {
  runtimeId: string
  /** Server origin, kept separately so RuntimeDescriptor can persist it. */
  origin: string
  /** Capability-specific base URL bound to this runtime. */
  endpoint: string
  /** Raw token is returned only when the runtime is created; the broker retains its hash. */
  token: string
}

export interface LocalCapabilityBrokerOptions {
  cloudBaseUrl: string
  /** Development-only opt-in for loopback OPC API verification. */
  allowInsecureCloudBaseUrl?: boolean
  fetchCloud?: (url: string, init: RequestInit) => Promise<Response>
  revealPath?: (path: string) => Promise<void>
  pickPaths?: () => Promise<string[]>
  requestTimeoutMs?: number
  mediaRuntime?: Pick<LocalMediaRuntime, 'handle'>
}

export type BrokerCapability = LocalCapability | MediaCapability

interface RuntimeRecord {
  tokenHash: Buffer
  capabilities: ReadonlySet<BrokerCapability>
  workspace?: string
  mediaScopeId: string
  cloudSessionToken?: string
}

interface CloudProxyRequest {
  path: string
  method?: string
  headers?: Record<string, unknown>
  body?: unknown
}

/**
 * Loopback-only adapter for trusted DSH Runtime requests to desktop capabilities.
 * Runtime identity is part of the URL and each runtime's raw token is discarded
 * after its SHA-256 digest has been stored.
 */
export class LocalCapabilityBroker {
  private readonly runtimes = new Map<string, RuntimeRecord>()
  private server?: ReturnType<typeof createServer>
  private origin?: string
  private readonly cloudBaseUrl: URL

  constructor(private readonly options: LocalCapabilityBrokerOptions) {
    this.cloudBaseUrl = parseCloudBaseUrl(options.cloudBaseUrl, options.allowInsecureCloudBaseUrl === true)
  }

  async registerRuntime(registration: BrokerRuntimeRegistration): Promise<RegisteredBrokerRuntime> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(registration.runtimeId)) {
      throw new Error('desktop_broker_invalid_runtime_id')
    }
    if (registration.mediaScopeId !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(registration.mediaScopeId)) {
      throw new Error('desktop_broker_invalid_media_scope')
    }
    if (registration.capabilities.some((capability) => !isBrokerCapability(capability))) {
      throw new Error('desktop_broker_invalid_capability')
    }
    await this.start()
    const token = randomBytes(32).toString('base64url')
    this.runtimes.set(registration.runtimeId, {
      tokenHash: digest(token),
      capabilities: new Set(registration.capabilities),
      workspace: registration.workspace ? await realpath(registration.workspace) : undefined,
      mediaScopeId: registration.mediaScopeId ?? registration.runtimeId,
      cloudSessionToken: registration.cloudSessionToken
    })
    const origin = this.origin!
    return {
      runtimeId: registration.runtimeId,
      origin,
      endpoint: `${origin}/v1/runtimes/${encodeURIComponent(registration.runtimeId)}`,
      token
    }
  }

  revokeRuntime(runtimeId: string): void {
    this.runtimes.delete(runtimeId)
  }

  async stop(): Promise<void> {
    this.runtimes.clear()
    const server = this.server
    this.server = undefined
    this.origin = undefined
    if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }

  private async start(): Promise<void> {
    if (this.server && this.origin) return
    const server = createServer((request, response) => {
      void this.handle(request, response).catch(() => this.send(response, 500, { code: 'desktop_broker_internal_error' }))
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address() as AddressInfo
    this.server = server
    this.origin = `http://127.0.0.1:${address.port}`
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (request.method !== 'POST') return this.send(response, 405, { code: 'desktop_broker_method_not_allowed' })
    const parsed = new URL(request.url ?? '/', this.origin ?? 'http://127.0.0.1')
    const match = /^\/v1\/runtimes\/([^/]+)\/capabilities\/([^/]+)$/u.exec(parsed.pathname)
    if (!match?.[1] || !match[2]) return this.send(response, 404, { code: 'desktop_broker_route_not_found' })
    const runtimeId = decodeURIComponent(match[1])
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime || !this.validToken(request.headers.authorization, runtime.tokenHash)) {
      return this.send(response, 401, { code: 'desktop_broker_unauthorized' })
    }
    const capability = decodeURIComponent(match[2])
    if (!isBrokerCapability(capability) || !runtime.capabilities.has(capability)) {
      return this.send(response, 403, { code: 'desktop_broker_capability_denied' })
    }
    const body = await this.readJson(request, response)
    if (body === undefined) return
    if (capability === 'cloud.proxy') return this.proxyCloud(body, request, runtime, response)
    if (capability === 'filesystem.pick') return this.pickWorkspacePaths(runtime, response)
    if (capability === 'filesystem.reveal') return this.revealWorkspacePath(body, runtime, response)
    if (isMediaCapability(capability)) return this.handleMedia(capability, body, runtime.mediaScopeId, response)
    return this.send(response, 501, { code: 'desktop_broker_capability_not_configured' })
  }

  private async handleMedia(
    capability: MediaCapability,
    body: Record<string, unknown>,
    mediaScopeId: string,
    response: ServerResponse
  ): Promise<void> {
    if (!this.options.mediaRuntime) {
      return this.send(response, 503, { code: 'desktop_broker_media_runtime_unavailable' })
    }
    const result = await this.options.mediaRuntime.handle(capability, body, { runtimeId: mediaScopeId })
    this.send(response, result.status, result.body)
  }

  private validToken(authorization: string | undefined, expectedHash: Buffer): boolean {
    if (!authorization?.startsWith('Bearer ')) return false
    const actualHash = digest(authorization.slice('Bearer '.length))
    return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash)
  }

  private async readJson(request: IncomingMessage, response: ServerResponse): Promise<Record<string, unknown> | undefined> {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > MAX_BODY_BYTES) {
        request.resume()
        this.send(response, 413, { code: 'desktop_broker_body_too_large' })
        return undefined
      }
      chunks.push(buffer)
    }
    try {
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
      return value as Record<string, unknown>
    } catch {
      this.send(response, 400, { code: 'desktop_broker_invalid_json' })
      return undefined
    }
  }

  private async proxyCloud(body: Record<string, unknown>, request: IncomingMessage, runtime: RuntimeRecord, response: ServerResponse): Promise<void> {
    const payload = body as unknown as CloudProxyRequest
    const method = typeof payload.method === 'string' ? payload.method.toUpperCase() : 'GET'
    if (!isAllowedCloudPath(payload.path)) return this.send(response, 400, { code: 'desktop_broker_invalid_cloud_path' })
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && typeof request.headers['idempotency-key'] !== 'string') {
      return this.send(response, 400, { code: 'desktop_broker_idempotency_key_required' })
    }
    const headers = safeHeaders(payload.headers)
    // This marker is written only by the loopback Broker after it has
    // authenticated the per-runtime capability token. It is never accepted
    // from a DSH plugin payload.
    headers.set(DESKTOP_BROKER_HEADER, '1')
    if (runtime.cloudSessionToken) headers.set('cookie', `opc_session=${runtime.cloudSessionToken}`)
    const requestId = request.headers['x-request-id']
    const idempotencyKey = request.headers['idempotency-key']
    if (typeof requestId === 'string') headers.set('x-request-id', requestId)
    if (typeof idempotencyKey === 'string') headers.set('idempotency-key', idempotencyKey)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? CLOUD_REQUEST_TIMEOUT_MS)
    try {
      const upstream = await (this.options.fetchCloud ?? fetch)(new URL(payload.path, this.cloudBaseUrl).toString(), {
        method,
        headers,
        body: payload.body === undefined || method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(payload.body),
        signal: controller.signal
      })
      const upstreamBody = await upstream.text()
      response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' })
      response.end(upstreamBody)
    } catch (error) {
      const code = error instanceof Error && error.name === 'AbortError' ? 'desktop_broker_cloud_timeout' : 'desktop_broker_cloud_unavailable'
      this.send(response, 502, { code })
    } finally {
      clearTimeout(timeout)
    }
  }

  private async revealWorkspacePath(body: Record<string, unknown>, runtime: RuntimeRecord, response: ServerResponse): Promise<void> {
    if (!runtime.workspace || typeof body.path !== 'string' || !this.options.revealPath) {
      return this.send(response, 400, { code: 'desktop_broker_invalid_file_request' })
    }
    try {
      const resolved = await resolveContainedPath(runtime.workspace, body.path)
      await this.options.revealPath(resolved)
      this.send(response, 200, { revealed: true })
    } catch {
      this.send(response, 403, { code: 'desktop_broker_workspace_path_denied' })
    }
  }

  private async pickWorkspacePaths(runtime: RuntimeRecord, response: ServerResponse): Promise<void> {
    if (!runtime.workspace || !this.options.pickPaths) {
      return this.send(response, 400, { code: 'desktop_broker_invalid_file_request' })
    }
    const selected = await this.options.pickPaths()
    const paths = (await Promise.all(selected.map(async (path) => {
      try {
        return await resolveContainedPath(runtime.workspace!, path)
      } catch {
        return undefined
      }
    }))).filter((path): path is string => path !== undefined)
    this.send(response, 200, { paths })
  }

  private send(response: ServerResponse, status: number, data: unknown): void {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    response.end(JSON.stringify(data))
  }
}

export async function resolveContainedPath(workspace: string, candidate: string): Promise<string> {
  if (!isAbsolute(candidate)) throw new Error('desktop_broker_relative_path')
  const canonical = await realpath(candidate)
  const pathFromWorkspace = relative(workspace, canonical)
  if (pathFromWorkspace === '' || (!pathFromWorkspace.startsWith(`..${sep}`) && pathFromWorkspace !== '..' && !isAbsolute(pathFromWorkspace))) return canonical
  throw new Error('desktop_broker_workspace_escape')
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

function parseCloudBaseUrl(value: string, allowInsecureLoopback = false): URL {
  const url = new URL(value)
  const loopback = (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]')
  const protocolAllowed = url.protocol === 'https:' || (allowInsecureLoopback && loopback && url.protocol === 'http:')
  if (!protocolAllowed || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('desktop_broker_invalid_cloud_base_url')
  }
  return url
}

function isAllowedCloudPath(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value, 'https://local.invalid')
    return (
      url.origin === 'https://local.invalid' &&
      url.hash === '' &&
      OPC_DESKTOP_CLOUD_PATH_TEMPLATES.some((template) => template.test(url.pathname))
    )
  } catch {
    return false
  }
}

function isBrokerCapability(value: unknown): value is BrokerCapability {
  return isLocalCapability(value) || isMediaCapability(value)
}

function safeHeaders(value: unknown): Headers {
  const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' })
  if (!value || typeof value !== 'object' || Array.isArray(value)) return headers
  for (const [name, raw] of Object.entries(value as Record<string, unknown>)) {
    const normalized = name.toLowerCase()
    if (
      FORGED_CLOUD_HEADERS.has(normalized) ||
      normalized.startsWith('x-opc-') ||
      normalized.startsWith('x-forwarded-') ||
      normalized === 'idempotency-key' ||
      normalized === 'x-request-id'
    ) continue
    if (typeof raw === 'string') headers.set(normalized, raw)
  }
  return headers
}
