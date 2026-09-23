import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { realpath } from 'node:fs/promises'
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { isLocalCapability, type LocalCapability } from '../../shared/broker-contracts'
import { boundedUpload, createIdleDeadline, isAnchorMediaPath, streamMediaResponse, uploadHeaders } from './viral-media-proxy'
import {
  isMediaCapability,
  type LocalMediaRuntime,
  type MediaCapability
} from './local-media-runtime'
import { LocalAssetsRuntime, type LocalAssetsRequest } from './local-assets-runtime'
import { modelBillingAttribution } from './billing-context'

const MAX_BODY_BYTES = 64 * 1024
const MAX_MODEL_BODY_BYTES = 16 * 1024 * 1024
const MAX_LOCAL_ASSET_BODY_BYTES = 70 * 1024 * 1024
const MAX_PROVIDER_OUTPUT_TOKENS = 32_768
const CLOUD_REQUEST_TIMEOUT_MS = 15_000
const CLOUD_MEDIA_REQUEST_TIMEOUT_MS = 300_000
const DESKTOP_BROKER_HEADER = 'x-opc-desktop-broker'
const FORGED_CLOUD_HEADERS = new Set([
  'authorization',
  'cookie',
  'host',
  'x-tenant-id',
  'x-user-id',
  'x-agent-id',
  'x-opc-tenant-id',
  'x-opc-user-id',
  'x-opc-agent-id'
])

// This is intentionally a route-level, compile-time allowlist. Adding an OPC
// API route requires changing this list and its security test; there is no
// generic `/api/*` escape hatch in the desktop broker.
const OPC_DESKTOP_CLOUD_PATH_TEMPLATES = [
  /^\/api\/v1\/compute\/external-usage$/u,
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
  /^\/api\/v1\/agent\/experiences\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}(\/disable)?$/u,
  /^\/api\/v1\/agent\/profiles\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/(memory|disable)$/u,
  /^\/api\/v1\/agent\/profiles\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/memory\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\/disable$/u,
  // First-run interview calls are forwarded only with the account session the
  // main process owns. The DSH plugin cannot select a tenant or sign for one.
  /^\/api\/v1\/agent\/onboarding\/status$/u,
  /^\/api\/v1\/agent\/onboarding\/interview\/(start|answers|skip)$/u,
  // The realtime voice plugin uses the Harness interview bridge directly.
  // Keep the route family constrained to the dedicated interview endpoints.
  /^\/api\/v1\/onboarding\/interview(?:\/(start|answers|skip))?$/u,
  // The viral workbench and its agent tools use a constrained service family.
  // Route authorization, ownership and charge approvals stay enforced by the
  // production API; the desktop Broker only contributes its opaque login session.
  /^\/api\/v1\/viral\/(?:chase-jobs|protagonist-anchors)(?:\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}(?:\/[A-Za-z0-9][A-Za-z0-9._:-]{0,127}){0,4})?$/u,
  /^\/api\/v1\/viral\/runtime\/status$/u
] as const

export interface BrokerRuntimeRegistration {
  runtimeId: string
  capabilities: readonly BrokerCapability[]
  workspace?: string
  /** Stable opaque account namespace used only for durable local media tasks. */
  mediaScopeId?: string
  /** Opaque OPC session retained by the main-process Broker only. */
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
  fetchCloud?: (url: string, init: RequestInit) => Promise<Response>
  onChargeActivity?: () => void
  revealPath?: (path: string) => Promise<void>
  pickPaths?: () => Promise<string[]>
  requestTimeoutMs?: number
  /** Abort media only after this long without receiving or forwarding bytes. */
  mediaIdleTimeoutMs?: number
  mediaRuntime?: Pick<LocalMediaRuntime, 'handle'>
  localAssetsRuntime?: Pick<LocalAssetsRuntime, 'handle'> & Partial<Pick<LocalAssetsRuntime, 'openContent'>>
  pickLocalAssetsExportPath?: () => Promise<string | undefined>
  pickLocalAssetsImportPath?: () => Promise<string | undefined>
  pickLocalMaterialPath?: () => Promise<string | undefined>
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
    this.cloudBaseUrl = parseCloudBaseUrl(options.cloudBaseUrl)
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
    const modelMatch = /^\/v1\/runtimes\/([^/]+)\/model\/chat\/completions$/u.exec(parsed.pathname)
    if (modelMatch?.[1]) return this.proxyModel(decodeURIComponent(modelMatch[1]), request, response)
    const match = /^\/v1\/runtimes\/([^/]+)\/capabilities\/([^/]+)(\/media-upload)?$/u.exec(parsed.pathname)
    if (!match?.[1] || !match[2]) return this.send(response, 404, { code: 'desktop_broker_route_not_found' })
    const runtime = this.runtimes.get(decodeURIComponent(match[1]))
    if (!runtime || !this.validToken(request.headers.authorization, runtime.tokenHash)) {
      return this.send(response, 401, { code: 'desktop_broker_unauthorized' })
    }
    const capability = decodeURIComponent(match[2])
    if (!isBrokerCapability(capability) || !runtime.capabilities.has(capability)) {
      return this.send(response, 403, { code: 'desktop_broker_capability_denied' })
    }
    if (match[3]) {
      if (capability !== 'cloud.proxy' || parsed.search) return this.send(response, 404, { code: 'desktop_broker_route_not_found' })
      return this.proxyMediaUpload(request, runtime, response)
    }
    const body = await this.readJson(request, response, capability === 'local-assets' ? MAX_LOCAL_ASSET_BODY_BYTES : MAX_BODY_BYTES)
    if (body === undefined) return
    if (capability === 'cloud.proxy') return this.proxyCloud(body, request, runtime, response)
    if (capability === 'filesystem.pick') return this.pickWorkspacePaths(runtime, response)
    if (capability === 'filesystem.reveal') return this.revealWorkspacePath(body, runtime, response)
    if (isMediaCapability(capability)) return this.handleMedia(capability, body, runtime.mediaScopeId, response)
    if (capability === 'local-assets') return this.handleLocalAssets(body, runtime.mediaScopeId, response)
    return this.send(response, 501, { code: 'desktop_broker_capability_not_configured' })
  }

  private async handleLocalAssets(body: Record<string, unknown>, scopeId: string, response: ServerResponse): Promise<void> {
    if (!this.options.localAssetsRuntime) return this.send(response, 503, { code: 'desktop_broker_local_assets_unavailable' })
    try {
      if (body.action === 'content' && typeof body.assetId === 'string' && this.options.localAssetsRuntime.openContent) {
        const content = await this.options.localAssetsRuntime.openContent({ assetId: body.assetId }, { scopeId })
        response.writeHead(200, {
          'content-type': content.mediaType,
          'content-length': String(content.size),
          'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(content.name)}`,
          'cache-control': 'private, no-store',
          'x-content-type-options': 'nosniff'
        })
        await new Promise<void>((resolveStream, rejectStream) => {
          const stream = createReadStream(content.path)
          stream.once('error', rejectStream)
          response.once('finish', resolveStream)
          stream.pipe(response)
        })
        return
      }
      let trustedBody = body
      if (body.action === 'export') {
        const packagePath = await this.options.pickLocalAssetsExportPath?.()
        if (!packagePath) return this.send(response, 200, { success: true, data: { cancelled: true } })
        trustedBody = { ...body, packagePath }
      } else if (body.action === 'import') {
        const packagePath = await this.options.pickLocalAssetsImportPath?.()
        if (!packagePath) return this.send(response, 200, { success: true, data: { cancelled: true } })
        trustedBody = { ...body, packagePath }
      } else if (body.action === 'write' && body.operation === 'upload-material') {
        const selected = await this.options.pickLocalMaterialPath?.()
        if (!selected) return this.send(response, 200, { success: true, data: { cancelled: true } })
        const { trustedSourcePath: _forgedSource, relativePath: _forgedPath, contentBase64: _forgedContent, ...safeBody } = body
        trustedBody = {
          ...safeBody,
          kind: 'material',
          name: basename(selected),
          mediaType: mediaTypeForFile(selected),
          trustedSourcePath: selected
        }
      } else if ('trustedSourcePath' in body) {
        const { trustedSourcePath: _forgedSource, ...safeBody } = body
        trustedBody = safeBody
      }
      const result = await this.options.localAssetsRuntime.handle(trustedBody as unknown as LocalAssetsRequest, { scopeId })
      this.send(response, 200, { success: true, data: result })
    } catch (error) {
      this.send(response, 400, { success: false, error: { code: error instanceof Error ? error.message : 'local_assets_failed' } })
    }
  }

  private async proxyModel(runtimeId: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
    const runtime = this.runtimes.get(runtimeId)
    if (!runtime || !this.validToken(request.headers.authorization, runtime.tokenHash)) {
      return this.send(response, 401, { code: 'desktop_broker_unauthorized' })
    }
    if (!runtime.capabilities.has('model.invoke')) return this.send(response, 403, { code: 'desktop_broker_capability_denied' })
    if (!runtime.cloudSessionToken) return this.send(response, 401, { code: 'desktop_broker_cloud_session_missing' })
    const rawBody = await this.readRawBody(request, response, MAX_MODEL_BODY_BYTES)
    if (rawBody === undefined) return
    let modelBody: Record<string, unknown>
    try {
      const parsed = JSON.parse(rawBody) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid')
      modelBody = normalizeModelOutputBudget(parsed as Record<string, unknown>)
    } catch {
      return this.send(response, 400, { code: 'desktop_broker_invalid_json' })
    }
    let attribution: ReturnType<typeof modelBillingAttribution>
    try { attribution = modelBillingAttribution(runtimeId, request.headers) }
    catch { return this.send(response, 400, { code: 'desktop_broker_invalid_billing_context' }) }
    const { idempotencyKey, billingContext } = attribution
    const outboundBody = JSON.stringify({ ...modelBody, billingContext })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300_000)
    try {
      const upstream = await (this.options.fetchCloud ?? fetch)(new URL('/api/v1/model/chat/completions', this.cloudBaseUrl).toString(), {
        method: 'POST',
        headers: {
          accept: request.headers.accept ?? 'text/event-stream',
          'content-type': 'application/json',
          cookie: `opc_session=${runtime.cloudSessionToken}`,
          'idempotency-key': idempotencyKey,
          [DESKTOP_BROKER_HEADER]: '1'
        },
        body: outboundBody,
        signal: controller.signal
      })
      response.writeHead(upstream.status, {
        'content-type': upstream.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store'
      })
      if (!upstream.body) {
        response.end()
        return
      }
      const reader = upstream.body.getReader()
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        response.write(Buffer.from(chunk.value))
      }
      response.end()
      this.options.onChargeActivity?.()
    } catch (error) {
      if (!response.headersSent) {
        const code = error instanceof Error && error.name === 'AbortError' ? 'desktop_broker_model_timeout' : 'desktop_broker_model_unavailable'
        this.send(response, 502, { code })
      } else {
        response.destroy()
      }
    } finally {
      clearTimeout(timeout)
    }
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

  private async readJson(request: IncomingMessage, response: ServerResponse, maximumBytes = MAX_BODY_BYTES): Promise<Record<string, unknown> | undefined> {
    const raw = await this.readRawBody(request, response, maximumBytes)
    if (raw === undefined) return undefined
    try {
      const value: unknown = JSON.parse(raw)
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid')
      return value as Record<string, unknown>
    } catch {
      this.send(response, 400, { code: 'desktop_broker_invalid_json' })
      return undefined
    }
  }

  private async readRawBody(request: IncomingMessage, response: ServerResponse, maximumBytes: number): Promise<string | undefined> {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > maximumBytes) {
        request.resume()
        this.send(response, 413, { code: 'desktop_broker_body_too_large' })
        return undefined
      }
      chunks.push(buffer)
    }
    return Buffer.concat(chunks).toString('utf8')
  }

  private async proxyCloud(body: Record<string, unknown>, request: IncomingMessage, runtime: RuntimeRecord, response: ServerResponse): Promise<void> {
    const payload = body as unknown as CloudProxyRequest
    const method = typeof payload.method === 'string' ? payload.method.toUpperCase() : 'GET'
    const mediaResponse = method === 'GET' && isAnchorMediaPath(payload.path)
    if (mediaResponse && !runtime.cloudSessionToken) return this.send(response, 401, { code: 'desktop_broker_cloud_session_missing' })
    if (!isAllowedCloudPath(payload.path)) return this.send(response, 400, { code: 'desktop_broker_invalid_cloud_path' })
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && typeof request.headers['idempotency-key'] !== 'string') {
      return this.send(response, 400, { code: 'desktop_broker_idempotency_key_required' })
    }
    // The path has already passed the route allowlist. Agent metadata is not
    // tenant identity: only authenticated viral requests may preserve it.
    const allowViralAgent = !!runtime.cloudSessionToken && payload.path.startsWith('/api/v1/viral/')
    const headers = safeHeaders(payload.headers, allowViralAgent)
    if (mediaResponse) headers.set('accept-encoding', 'identity')
    if (runtime.cloudSessionToken) headers.set('cookie', `opc_session=${runtime.cloudSessionToken}`)
    // This value is written only by the loopback Broker after capability-token
    // verification. It lets the production API derive tenant identity from the
    // opaque desktop login cookie instead of trusting plugin-supplied identity.
    headers.set(DESKTOP_BROKER_HEADER, '1')
    const requestId = request.headers['x-request-id']
    const idempotencyKey = request.headers['idempotency-key']
    if (typeof requestId === 'string') headers.set('x-request-id', requestId)
    if (typeof idempotencyKey === 'string') headers.set('idempotency-key', idempotencyKey)
    const nestedBillingContext = payload.headers && typeof payload.headers === 'object'
      ? Object.entries(payload.headers).find(([name]) => name.toLowerCase() === 'x-opc-billing-context')?.[1] : undefined
    const encodedBillingContext = request.headers['x-opc-billing-context'] ?? nestedBillingContext
    if (encodedBillingContext !== undefined) {
      try {
        if (typeof encodedBillingContext !== 'string') throw new Error('invalid_billing_context')
        const { billingContext } = modelBillingAttribution('cloud', { 'x-opc-billing-context': encodedBillingContext })
        headers.set('x-opc-billing-context', Buffer.from(JSON.stringify(billingContext)).toString('base64url'))
      } catch { return this.send(response, 400, { code: 'desktop_broker_invalid_billing_context' }) }
    }
    const controller = new AbortController()
    const onClose = () => { if (!response.writableFinished) controller.abort() }
    if (mediaResponse) response.once('close', onClose)
    const idle = mediaResponse ? createIdleDeadline(controller, this.mediaIdleTimeoutMs()) : undefined
    const timeout = mediaResponse ? undefined : setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? CLOUD_REQUEST_TIMEOUT_MS)
    try {
      const upstream = await (this.options.fetchCloud ?? fetch)(new URL(payload.path, this.cloudBaseUrl).toString(), {
        method,
        headers,
        body: payload.body === undefined || method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(payload.body),
        signal: controller.signal,
        ...(mediaResponse ? { redirect: 'error' as const } : {})
      })
      if (mediaResponse) {
        await streamMediaResponse(upstream, response, controller.signal, idle?.touch)
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) this.options.onChargeActivity?.()
        return
      }
      const upstreamBody = await upstream.text()
      response.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' })
      response.end(upstreamBody)
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) this.options.onChargeActivity?.()
    } catch (error) {
      if (response.headersSent || response.destroyed) { response.destroy(); return }
      const code = error instanceof Error && error.name === 'AbortError' ? 'desktop_broker_cloud_timeout' : 'desktop_broker_cloud_unavailable'
      this.send(response, 502, { code })
    } finally {
      if (timeout) clearTimeout(timeout)
      idle?.clear()
      response.off('close', onClose)
    }
  }

  private async proxyMediaUpload(request: IncomingMessage, runtime: RuntimeRecord, response: ServerResponse): Promise<void> {
    if (!runtime.cloudSessionToken) return this.send(response, 401, { code: 'desktop_broker_cloud_session_missing' })
    const metadata = uploadHeaders(request, runtime.cloudSessionToken)
    if (!metadata) return this.send(response, 400, { code: 'desktop_broker_invalid_media_upload' })
    const controller = new AbortController()
    const abort = () => { if (!response.writableFinished) controller.abort() }
    response.once('close', abort)
    request.once('aborted', abort)
    const idle = createIdleDeadline(controller, this.mediaIdleTimeoutMs())
    const body = boundedUpload(request, metadata.size, idle.touch)
    try {
      const init: RequestInit & { duplex: 'half' } = {
        method: 'POST', headers: metadata.headers, body: body as unknown as BodyInit,
        duplex: 'half', redirect: 'error', signal: controller.signal
      }
      const upstream = await (this.options.fetchCloud ?? fetch)(new URL('/api/v1/viral/protagonist-anchors/uploads', this.cloudBaseUrl).toString(), init)
      await streamMediaResponse(upstream, response, controller.signal, idle.touch)
    } catch {
      if (response.headersSent || response.destroyed) response.destroy()
      else this.send(response, 502, { code: 'desktop_broker_media_transfer_failed' })
    } finally {
      idle.clear()
      body.destroy()
      request.off('aborted', abort)
      response.off('close', abort)
    }
  }

  private mediaIdleTimeoutMs(): number {
    const configured = this.options.mediaIdleTimeoutMs
    return typeof configured === 'number' && Number.isFinite(configured) && configured > 0
      ? Math.floor(configured)
      : CLOUD_MEDIA_REQUEST_TIMEOUT_MS
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

function parseCloudBaseUrl(value: string): URL {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
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

function mediaTypeForFile(path: string): string {
  const extension = extname(path).toLowerCase()
  const types: Readonly<Record<string, string>> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
    '.pdf': 'application/pdf', '.md': 'text/markdown', '.txt': 'text/plain', '.csv': 'text/csv'
  }
  return types[extension] ?? 'application/octet-stream'
}

function normalizeModelOutputBudget(body: Record<string, unknown>): Record<string, unknown> {
  // DSH may include the OpenAI-compatible field, but the configured DeepSeek
  // gateway accepts only max_tokens and rejects any value above 32,768.
  const { max_completion_tokens: _compatibilityOnly, ...rest } = body
  if (typeof rest.max_tokens !== 'number' || !Number.isFinite(rest.max_tokens)) return rest
  return { ...rest, max_tokens: Math.max(1, Math.min(MAX_PROVIDER_OUTPUT_TOKENS, Math.floor(rest.max_tokens))) }
}

function safeHeaders(value: unknown, allowViralAgent = false): Headers {
  const headers = new Headers({ accept: 'application/json', 'content-type': 'application/json' })
  if (!value || typeof value !== 'object' || Array.isArray(value)) return headers
  for (const [name, raw] of Object.entries(value as Record<string, unknown>)) {
    const normalized = name.toLowerCase()
    if (normalized === 'x-agent-id') {
      if (allowViralAgent && typeof raw === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(raw)) {
        headers.set(normalized, raw)
      }
      continue
    }
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
