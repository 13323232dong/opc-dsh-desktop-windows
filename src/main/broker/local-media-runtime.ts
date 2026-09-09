import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export const MEDIA_CAPABILITIES = [
  'media.status',
  'media.install',
  'media.claim',
  'media.run',
  'media.progress',
  'media.cancel'
] as const

export type MediaCapability = typeof MEDIA_CAPABILITIES[number]

export const MEDIA_COMPONENT_IDS = [
  'ffmpeg',
  'whisper-coreml',
  'moneyprinter-turbo',
  'hyperframes',
  'cosyvoice-worker',
  'duix-heygem-worker'
] as const

export type MediaComponentId = typeof MEDIA_COMPONENT_IDS[number]

export const MEDIA_TASK_KINDS = [
  'anchor_quality_check',
  'portrait_extract',
  'voice_sample_extract',
  'transcribe',
  'voice_clone',
  'avatar_generate',
  'motion_graphics',
  'compose_vertical_video'
] as const

export type MediaTaskKind = typeof MEDIA_TASK_KINDS[number]

export interface MediaComponentSpec {
  id: MediaComponentId
  version: string
  license: string
  sha256: string
  sizeBytes: number
  supportedPlatforms: readonly string[]
  distributionStatus?: 'available' | 'unavailable'
}

export interface MediaInstallReceipt {
  sha256: string
}

export interface MediaComponentInstaller {
  install(input: {
    component: Readonly<MediaComponentSpec>
    targetDirectory: string
    signal: AbortSignal
  }): Promise<MediaInstallReceipt>
}

export interface ClaimedMediaTask {
  taskId: string
  taskKind: MediaTaskKind
  componentId: MediaComponentId
  assetId: string
  artifactId: string
  artifactVersion: string
  contentHash: string
}

export interface MediaTaskOutput {
  assetId: string
  artifactId: string
  artifactVersion: string
  contentHash: string
}

export interface MediaTaskExecutor {
  run(input: Readonly<ClaimedMediaTask> & {
    componentDirectory: string
    signal: AbortSignal
    reportProgress: (progress: number, phase: string) => Promise<void>
  }): Promise<MediaTaskOutput>
}

export interface LocalMediaRuntimeOptions {
  applicationSupportDirectory: string
  platform?: string
  components: readonly MediaComponentSpec[]
  installer?: MediaComponentInstaller
  executors?: Partial<Record<MediaTaskKind, MediaTaskExecutor>>
  largeComponentThresholdBytes?: number
  approvalTtlMs?: number
  now?: () => Date
}

export interface MediaRuntimeResponse {
  status: number
  body: Record<string, unknown>
}

export interface MediaRuntimeScope {
  runtimeId: string
}

type ComponentState = 'not_installed' | 'installing' | 'installed' | 'failed'
type MediaTaskStatus = 'claimed' | 'running' | 'cancel_requested' | 'succeeded' | 'failed' | 'cancelled'

interface InstalledComponentRecord {
  id: MediaComponentId
  version: string
  license: string
  sha256: string
  state: ComponentState
  installedAt?: string
  errorCode?: string
}

interface MediaTaskRecord extends ClaimedMediaTask {
  scopeHash: string
  status: MediaTaskStatus
  progress: number
  phase: string
  createdAt: string
  updatedAt: string
  output?: MediaTaskOutput
  errorCode?: string
}

interface StoredMediaRuntimeState {
  schemaVersion: 1
  components: InstalledComponentRecord[]
  tasks: MediaTaskRecord[]
}

interface InstallApproval {
  componentId: MediaComponentId
  scopeHash: string
  tokenHash: string
  expiresAt: number
}

const STATE_SCHEMA_VERSION = 1
const DEFAULT_LARGE_COMPONENT_THRESHOLD_BYTES = 512 * 1024 * 1024
const DEFAULT_APPROVAL_TTL_MS = 10 * 60 * 1000
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u
const SAFE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._:+-]{0,63}$/u
const SAFE_PHASE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u
const SHA256 = /^[a-f0-9]{64}$/u

const TASK_COMPONENTS: Readonly<Record<MediaTaskKind, readonly MediaComponentId[]>> = {
  anchor_quality_check: ['ffmpeg'],
  portrait_extract: ['ffmpeg'],
  voice_sample_extract: ['ffmpeg'],
  transcribe: ['whisper-coreml'],
  voice_clone: ['cosyvoice-worker'],
  avatar_generate: ['duix-heygem-worker'],
  motion_graphics: ['hyperframes'],
  compose_vertical_video: ['moneyprinter-turbo', 'ffmpeg']
}

export function isMediaCapability(value: unknown): value is MediaCapability {
  return typeof value === 'string' && MEDIA_CAPABILITIES.includes(value as MediaCapability)
}

/**
 * Executes only catalogued media work. Filesystem locations are deliberately
 * absent from every public response and are supplied only to trusted adapters.
 */
export class LocalMediaRuntime {
  readonly applicationSupportDirectory: string
  private readonly runtimeDirectory: string
  private readonly statePath: string
  private readonly platform: string
  private readonly components: ReadonlyMap<MediaComponentId, Readonly<MediaComponentSpec>>
  private readonly installer?: MediaComponentInstaller
  private readonly executors: Partial<Record<MediaTaskKind, MediaTaskExecutor>>
  private readonly largeComponentThresholdBytes: number
  private readonly approvalTtlMs: number
  private readonly now: () => Date
  private readonly installedComponents = new Map<MediaComponentId, InstalledComponentRecord>()
  private readonly tasks = new Map<string, MediaTaskRecord>()
  private readonly installApprovals = new Map<string, InstallApproval>()
  private readonly installationsInProgress = new Set<MediaComponentId>()
  private readonly taskControllers = new Map<string, AbortController>()
  private initialization?: Promise<void>
  private stateQueue: Promise<void> = Promise.resolve()

  constructor(options: LocalMediaRuntimeOptions) {
    if (typeof options.applicationSupportDirectory !== 'string' || !isAbsolute(options.applicationSupportDirectory)) {
      throw new Error('media_runtime_application_support_required')
    }
    const applicationSupportDirectory = resolve(options.applicationSupportDirectory)
    if (dirname(applicationSupportDirectory) === applicationSupportDirectory) throw new Error('media_runtime_application_support_required')
    this.applicationSupportDirectory = applicationSupportDirectory
    this.runtimeDirectory = join(applicationSupportDirectory, 'opc-media-runtime')
    this.statePath = join(this.runtimeDirectory, 'state.json')
    this.platform = options.platform ?? `${process.platform}-${process.arch}`
    this.components = validateComponentCatalog(options.components)
    this.installer = options.installer
    this.executors = { ...(options.executors ?? {}) }
    this.largeComponentThresholdBytes = options.largeComponentThresholdBytes ?? DEFAULT_LARGE_COMPONENT_THRESHOLD_BYTES
    this.approvalTtlMs = options.approvalTtlMs ?? DEFAULT_APPROVAL_TTL_MS
    this.now = options.now ?? (() => new Date())
  }

  grantInstallApproval(componentId: MediaComponentId, scope: MediaRuntimeScope): string {
    const component = this.components.get(componentId)
    if (!component) throw new Error('media_component_not_allowed')
    const scopeHash = validatedScopeHash(scope)
    const token = randomBytes(32).toString('base64url')
    this.installApprovals.set(digest(token), {
      componentId,
      scopeHash,
      tokenHash: digest(token),
      expiresAt: this.now().getTime() + this.approvalTtlMs
    })
    return token
  }

  async handle(
    capability: MediaCapability,
    body: Record<string, unknown>,
    scope: MediaRuntimeScope
  ): Promise<MediaRuntimeResponse> {
    try {
      const scopeHash = validatedScopeHash(scope)
      switch (capability) {
        case 'media.status': return await this.status(body, scopeHash)
        case 'media.install': return await this.install(body, scopeHash)
        case 'media.claim': return await this.claim(body, scopeHash)
        case 'media.run': return await this.run(body, scopeHash)
        case 'media.progress': return await this.progress(body, scopeHash)
        case 'media.cancel': return await this.cancel(body, scopeHash)
      }
    } catch (error) {
      if (error instanceof MediaRequestError) {
        return { status: error.status, body: { code: error.code, retryable: error.retryable } }
      }
      return { status: 500, body: { code: 'media_runtime_internal_error', retryable: true } }
    }
  }

  private async status(body: Record<string, unknown>, scopeHash: string): Promise<MediaRuntimeResponse> {
    strictObject(body, ['componentId'])
    const componentId = optionalComponentId(body.componentId)
    await this.ensureInitialized()
    const selected = componentId
      ? [this.requireComponent(componentId)]
      : [...this.components.values()]
    return {
      status: 200,
      body: {
        platform: this.platform,
        components: selected.map((component) => this.publicComponent(component)),
        activeTaskCount: [...this.tasks.values()].filter((task) =>
          task.scopeHash === scopeHash && (task.status === 'running' || task.status === 'cancel_requested')
        ).length
      }
    }
  }

  private async install(body: Record<string, unknown>, scopeHash: string): Promise<MediaRuntimeResponse> {
    strictObject(body, ['componentId', 'approvalToken'], ['componentId'])
    if (body.approvalToken !== undefined && typeof body.approvalToken !== 'string') {
      throw new MediaRequestError(400, 'media_invalid_request')
    }
    const component = this.requireComponent(requiredComponentId(body.componentId))
    if (!component.supportedPlatforms.includes(this.platform)) {
      throw new MediaRequestError(409, 'media_component_platform_unsupported')
    }
    if (component.distributionStatus === 'unavailable') {
      throw new MediaRequestError(503, 'media_component_distribution_unavailable', true)
    }
    await this.ensureInitialized()
    if (typeof body.approvalToken === 'string' && !this.consumeInstallApproval(component.id, scopeHash, body.approvalToken)) {
      throw new MediaRequestError(409, 'media_install_confirmation_required')
    }
    const current = this.installedComponents.get(component.id)
    if (current?.state === 'installed' && current.version === component.version && current.sha256 === component.sha256) {
      return { status: 200, body: { component: this.publicComponent(component) } }
    }
    if (component.sizeBytes >= this.largeComponentThresholdBytes) {
      const approved = typeof body.approvalToken === 'string'
      if (!approved) {
        return {
          status: 409,
          body: {
            code: 'media_install_confirmation_required',
            status: 'requires_confirmation',
            component: this.publicComponent(component)
          }
        }
      }
    }
    if (!this.installer) throw new MediaRequestError(503, 'media_installer_unavailable', true)
    if (this.installationsInProgress.has(component.id)) {
      throw new MediaRequestError(409, 'media_component_install_in_progress', true)
    }

    this.installationsInProgress.add(component.id)
    const targetDirectory = this.componentDirectory(component)
    try {
      await this.setComponentState(component, { state: 'installing' })
      await mkdir(targetDirectory, { recursive: true })
      const receipt = await this.installer.install({
        component,
        targetDirectory,
        signal: new AbortController().signal
      })
      if (!receipt || receipt.sha256 !== component.sha256) {
        await this.setComponentState(component, { state: 'failed', errorCode: 'media_component_checksum_mismatch' })
        throw new MediaRequestError(502, 'media_component_checksum_mismatch')
      }
      await this.setComponentState(component, { state: 'installed', installedAt: this.now().toISOString() })
      return { status: 200, body: { component: this.publicComponent(component) } }
    } catch (error) {
      if (error instanceof MediaRequestError) throw error
      await this.setComponentState(component, { state: 'failed', errorCode: 'media_component_install_failed' })
      throw new MediaRequestError(502, 'media_component_install_failed', true)
    } finally {
      this.installationsInProgress.delete(component.id)
    }
  }

  private async claim(body: Record<string, unknown>, scopeHash: string): Promise<MediaRuntimeResponse> {
    strictObject(body, [
      'taskId', 'taskKind', 'componentId', 'assetId', 'artifactId', 'artifactVersion', 'contentHash'
    ], [
      'taskId', 'taskKind', 'componentId', 'assetId', 'artifactId', 'artifactVersion', 'contentHash'
    ])
    const claim: ClaimedMediaTask = {
      taskId: requiredId(body.taskId),
      taskKind: requiredTaskKind(body.taskKind),
      componentId: requiredComponentId(body.componentId),
      assetId: requiredId(body.assetId),
      artifactId: requiredId(body.artifactId),
      artifactVersion: requiredVersion(body.artifactVersion),
      contentHash: requiredHash(body.contentHash)
    }
    this.requireComponent(claim.componentId)
    if (!TASK_COMPONENTS[claim.taskKind].includes(claim.componentId)) {
      throw new MediaRequestError(400, 'media_task_component_mismatch')
    }
    await this.ensureInitialized()
    const taskKey = scopedTaskKey(scopeHash, claim.taskId)
    const existing = this.tasks.get(taskKey)
    if (existing) {
      if (!sameClaim(existing, claim)) throw new MediaRequestError(409, 'media_task_claim_conflict')
      return { status: 200, body: { task: publicTask(existing) } }
    }
    const timestamp = this.now().toISOString()
    const task: MediaTaskRecord = {
      ...claim,
      scopeHash,
      status: 'claimed',
      progress: 0,
      phase: 'claimed',
      createdAt: timestamp,
      updatedAt: timestamp
    }
    await this.mutateState(() => this.tasks.set(taskKey, task))
    return { status: 201, body: { task: publicTask(task) } }
  }

  private async run(body: Record<string, unknown>, scopeHash: string): Promise<MediaRuntimeResponse> {
    strictObject(body, ['taskId', 'contentHash'], ['taskId', 'contentHash'])
    const taskId = requiredId(body.taskId)
    const contentHash = requiredHash(body.contentHash)
    await this.ensureInitialized()
    const taskKey = scopedTaskKey(scopeHash, taskId)
    const task = this.tasks.get(taskKey)
    if (!task) throw new MediaRequestError(404, 'media_task_not_found')
    if (task.contentHash !== contentHash) throw new MediaRequestError(409, 'media_task_content_changed')
    if (task.status === 'running' || task.status === 'cancel_requested') {
      return { status: 202, body: { task: publicTask(task) } }
    }
    if (task.status === 'succeeded' || task.status === 'cancelled') {
      return { status: 200, body: { task: publicTask(task) } }
    }
    const component = this.requireComponent(task.componentId)
    const installation = this.installedComponents.get(component.id)
    if (installation?.state !== 'installed' || installation.version !== component.version || installation.sha256 !== component.sha256) {
      throw new MediaRequestError(409, 'media_component_not_installed')
    }
    const executor = this.executors[task.taskKind]
    if (!executor) throw new MediaRequestError(503, 'media_executor_unavailable', true)

    const controller = new AbortController()
    this.taskControllers.set(taskKey, controller)
    const running = withTaskUpdate(task, this.now(), { status: 'running', phase: 'starting' })
    await this.mutateState(() => this.tasks.set(taskKey, running))
    void this.execute(running, executor, controller)
    return { status: 202, body: { task: publicTask(running) } }
  }

  private async progress(body: Record<string, unknown>, scopeHash: string): Promise<MediaRuntimeResponse> {
    strictObject(body, ['taskId'], ['taskId'])
    const taskId = requiredId(body.taskId)
    await this.ensureInitialized()
    const task = this.tasks.get(scopedTaskKey(scopeHash, taskId))
    if (!task) throw new MediaRequestError(404, 'media_task_not_found')
    return { status: 200, body: { task: publicTask(task) } }
  }

  private async cancel(body: Record<string, unknown>, scopeHash: string): Promise<MediaRuntimeResponse> {
    strictObject(body, ['taskId'], ['taskId'])
    const taskId = requiredId(body.taskId)
    await this.ensureInitialized()
    const taskKey = scopedTaskKey(scopeHash, taskId)
    const task = this.tasks.get(taskKey)
    if (!task) throw new MediaRequestError(404, 'media_task_not_found')
    if (task.status === 'claimed' || task.status === 'failed') {
      const cancelled = withTaskUpdate(task, this.now(), { status: 'cancelled', phase: 'cancelled' })
      await this.mutateState(() => this.tasks.set(taskKey, cancelled))
      return { status: 200, body: { task: publicTask(cancelled) } }
    }
    if (task.status === 'running') {
      const cancelling = withTaskUpdate(task, this.now(), { status: 'cancel_requested', phase: 'cancelling' })
      await this.mutateState(() => this.tasks.set(taskKey, cancelling))
      this.taskControllers.get(taskKey)?.abort()
      return { status: 202, body: { task: publicTask(cancelling) } }
    }
    return { status: 200, body: { task: publicTask(task) } }
  }

  private async execute(task: MediaTaskRecord, executor: MediaTaskExecutor, controller: AbortController): Promise<void> {
    const taskKey = scopedTaskKey(task.scopeHash, task.taskId)
    try {
      const output = await executor.run({
        taskId: task.taskId,
        taskKind: task.taskKind,
        componentId: task.componentId,
        assetId: task.assetId,
        artifactId: task.artifactId,
        artifactVersion: task.artifactVersion,
        contentHash: task.contentHash,
        componentDirectory: this.componentDirectory(this.requireComponent(task.componentId)),
        signal: controller.signal,
        reportProgress: async (progress, phase) => {
          if (!Number.isInteger(progress) || progress < 0 || progress > 100 || !SAFE_PHASE.test(phase)) {
            throw new Error('media_executor_invalid_progress')
          }
          await this.mutateState(() => {
            const current = this.tasks.get(taskKey)
            if (!current || current.status !== 'running') return
            this.tasks.set(taskKey, withTaskUpdate(current, this.now(), { progress, phase }))
          })
        }
      })
      const safeOutput = validateTaskOutput(output)
      await this.mutateState(() => {
        const current = this.tasks.get(taskKey)
        if (!current) return
        if (current.status === 'cancel_requested' || controller.signal.aborted) {
          this.tasks.set(taskKey, withTaskUpdate(current, this.now(), { status: 'cancelled', phase: 'cancelled' }))
          return
        }
        this.tasks.set(taskKey, withTaskUpdate(current, this.now(), {
          status: 'succeeded',
          progress: 100,
          phase: 'completed',
          output: safeOutput,
          errorCode: undefined
        }))
      })
    } catch (error) {
      await this.mutateState(() => {
        const current = this.tasks.get(taskKey)
        if (!current) return
        const cancelled = controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')
        this.tasks.set(taskKey, withTaskUpdate(current, this.now(), cancelled
          ? { status: 'cancelled', phase: 'cancelled', errorCode: undefined }
          : { status: 'failed', phase: 'failed', errorCode: 'media_task_failed' }))
      })
    } finally {
      this.taskControllers.delete(taskKey)
    }
  }

  private publicComponent(component: Readonly<MediaComponentSpec>): Record<string, unknown> {
    const stored = this.installedComponents.get(component.id)
    const current = stored?.version === component.version && stored.sha256 === component.sha256
      ? stored
      : undefined
    return {
      id: component.id,
      version: component.version,
      license: component.license,
      sha256: component.sha256,
      sizeBytes: component.sizeBytes,
      supported: component.supportedPlatforms.includes(this.platform),
      installable: component.distributionStatus !== 'unavailable',
      requiresConfirmation: component.sizeBytes >= this.largeComponentThresholdBytes,
      state: current?.state ?? 'not_installed',
      ...(current?.installedAt ? { installedAt: current.installedAt } : {}),
      ...(current?.errorCode ? { errorCode: current.errorCode } : {})
    }
  }

  private requireComponent(componentId: MediaComponentId): Readonly<MediaComponentSpec> {
    const component = this.components.get(componentId)
    if (!component) throw new MediaRequestError(400, 'media_component_not_allowed')
    return component
  }

  private consumeInstallApproval(componentId: MediaComponentId, scopeHash: string, token: string): boolean {
    const tokenHash = digest(token)
    const approval = this.installApprovals.get(tokenHash)
    this.installApprovals.delete(tokenHash)
    return approval?.componentId === componentId &&
      approval.scopeHash === scopeHash &&
      approval.expiresAt > this.now().getTime()
  }

  private componentDirectory(component: Readonly<MediaComponentSpec>): string {
    return join(this.runtimeDirectory, 'components', component.id, component.version)
  }

  private async setComponentState(
    component: Readonly<MediaComponentSpec>,
    update: Pick<InstalledComponentRecord, 'state'> & Partial<Pick<InstalledComponentRecord, 'installedAt' | 'errorCode'>>
  ): Promise<void> {
    await this.mutateState(() => this.installedComponents.set(component.id, {
      id: component.id,
      version: component.version,
      license: component.license,
      sha256: component.sha256,
      ...update
    }))
  }

  private async ensureInitialized(): Promise<void> {
    this.initialization ??= this.loadState()
    await this.initialization
  }

  private async loadState(): Promise<void> {
    await mkdir(this.runtimeDirectory, { recursive: true, mode: 0o700 })
    let parsed: StoredMediaRuntimeState | undefined
    try {
      parsed = JSON.parse(await readFile(this.statePath, 'utf8')) as StoredMediaRuntimeState
    } catch (error) {
      if (!isMissingFile(error)) throw error
    }
    if (!parsed || parsed.schemaVersion !== STATE_SCHEMA_VERSION || !Array.isArray(parsed.components) || !Array.isArray(parsed.tasks)) return
    for (const component of parsed.components) {
      if (isStoredComponent(component) && this.components.has(component.id)) {
        this.installedComponents.set(component.id, { ...component })
      }
    }
    for (const task of parsed.tasks) {
      if (!isStoredTask(task)) continue
      const recovered = task.status === 'running' || task.status === 'cancel_requested'
        ? withTaskUpdate(task, this.now(), { status: 'claimed', phase: 'resume_ready' })
        : task
      this.tasks.set(scopedTaskKey(task.scopeHash, task.taskId), recovered)
    }
  }

  private async mutateState(mutation: () => void): Promise<void> {
    await this.ensureInitialized()
    const operation = this.stateQueue.then(async () => {
      mutation()
      const state: StoredMediaRuntimeState = {
        schemaVersion: STATE_SCHEMA_VERSION,
        components: [...this.installedComponents.values()].map((component) => ({ ...component })),
        tasks: [...this.tasks.values()].map((task) => ({
          ...task,
          ...(task.output ? { output: { ...task.output } } : {})
        }))
      }
      const temporaryPath = `${this.statePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
      await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      await rename(temporaryPath, this.statePath)
    })
    this.stateQueue = operation.catch(() => undefined)
    await operation
  }
}

class MediaRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryable = false
  ) {
    super(code)
  }
}

function validateComponentCatalog(components: readonly MediaComponentSpec[]): ReadonlyMap<MediaComponentId, Readonly<MediaComponentSpec>> {
  const catalog = new Map<MediaComponentId, Readonly<MediaComponentSpec>>()
  for (const candidate of components) {
    if (
      !MEDIA_COMPONENT_IDS.includes(candidate.id) ||
      !SAFE_VERSION.test(candidate.version) ||
      typeof candidate.license !== 'string' || candidate.license.length < 2 || candidate.license.length > 128 ||
      !SHA256.test(candidate.sha256) ||
      !Number.isSafeInteger(candidate.sizeBytes) || candidate.sizeBytes < 0 ||
      !Array.isArray(candidate.supportedPlatforms) || candidate.supportedPlatforms.length === 0 ||
      !candidate.supportedPlatforms.every((platform) => typeof platform === 'string' && SAFE_VERSION.test(platform)) ||
      (candidate.distributionStatus !== undefined && !['available', 'unavailable'].includes(candidate.distributionStatus)) ||
      catalog.has(candidate.id)
    ) throw new Error('media_runtime_invalid_component_catalog')
    catalog.set(candidate.id, Object.freeze({ ...candidate, supportedPlatforms: Object.freeze([...candidate.supportedPlatforms]) }))
  }
  return catalog
}

function strictObject(body: Record<string, unknown>, allowedKeys: readonly string[], requiredKeys: readonly string[] = []): void {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MediaRequestError(400, 'media_invalid_request')
  const allowed = new Set(allowedKeys)
  if (Object.keys(body).some((key) => !allowed.has(key)) || requiredKeys.some((key) => !(key in body))) {
    throw new MediaRequestError(400, 'media_invalid_request')
  }
}

function optionalComponentId(value: unknown): MediaComponentId | undefined {
  if (value === undefined) return undefined
  return requiredComponentId(value)
}

function requiredComponentId(value: unknown): MediaComponentId {
  if (typeof value !== 'string' || !MEDIA_COMPONENT_IDS.includes(value as MediaComponentId)) {
    throw new MediaRequestError(400, 'media_component_not_allowed')
  }
  return value as MediaComponentId
}

function requiredTaskKind(value: unknown): MediaTaskKind {
  if (typeof value !== 'string' || !MEDIA_TASK_KINDS.includes(value as MediaTaskKind)) {
    throw new MediaRequestError(400, 'media_task_kind_not_allowed')
  }
  return value as MediaTaskKind
}

function requiredId(value: unknown): string {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) throw new MediaRequestError(400, 'media_invalid_request')
  return value
}

function requiredVersion(value: unknown): string {
  if (typeof value !== 'string' || !SAFE_VERSION.test(value)) throw new MediaRequestError(400, 'media_invalid_request')
  return value
}

function requiredHash(value: unknown): string {
  if (typeof value !== 'string' || !SHA256.test(value)) throw new MediaRequestError(400, 'media_invalid_request')
  return value
}

function sameClaim(left: ClaimedMediaTask, right: ClaimedMediaTask): boolean {
  return left.taskId === right.taskId &&
    left.taskKind === right.taskKind &&
    left.componentId === right.componentId &&
    left.assetId === right.assetId &&
    left.artifactId === right.artifactId &&
    left.artifactVersion === right.artifactVersion &&
    left.contentHash === right.contentHash
}

function withTaskUpdate(task: MediaTaskRecord, now: Date, update: Partial<MediaTaskRecord>): MediaTaskRecord {
  return { ...task, ...update, updatedAt: now.toISOString() }
}

function publicTask(task: MediaTaskRecord): Record<string, unknown> {
  return {
    taskId: task.taskId,
    taskKind: task.taskKind,
    componentId: task.componentId,
    assetId: task.assetId,
    artifactId: task.artifactId,
    artifactVersion: task.artifactVersion,
    contentHash: task.contentHash,
    status: task.status,
    progress: task.progress,
    phase: task.phase,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    ...(task.output ? { output: { ...task.output } } : {}),
    ...(task.errorCode ? { errorCode: task.errorCode } : {})
  }
}

function validateTaskOutput(value: unknown): MediaTaskOutput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('media_executor_invalid_output')
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !['assetId', 'artifactId', 'artifactVersion', 'contentHash'].includes(key))) {
    throw new Error('media_executor_invalid_output')
  }
  return {
    assetId: requiredId(record.assetId),
    artifactId: requiredId(record.artifactId),
    artifactVersion: requiredVersion(record.artifactVersion),
    contentHash: requiredHash(record.contentHash)
  }
}

function isStoredComponent(value: unknown): value is InstalledComponentRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Partial<InstalledComponentRecord>
  return Object.keys(record).every((key) => ['id', 'version', 'license', 'sha256', 'state', 'installedAt', 'errorCode'].includes(key)) &&
    typeof record.id === 'string' && MEDIA_COMPONENT_IDS.includes(record.id as MediaComponentId) &&
    typeof record.version === 'string' && typeof record.license === 'string' &&
    typeof record.sha256 === 'string' && SHA256.test(record.sha256) &&
    typeof record.state === 'string' && ['not_installed', 'installing', 'installed', 'failed'].includes(record.state) &&
    (record.installedAt === undefined || isIsoTimestamp(record.installedAt)) &&
    (record.errorCode === undefined || (typeof record.errorCode === 'string' && SAFE_PHASE.test(record.errorCode)))
}

function isStoredTask(value: unknown): value is MediaTaskRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const task = value as Partial<MediaTaskRecord>
  return Object.keys(task).every((key) => [
    'scopeHash', 'taskId', 'taskKind', 'componentId', 'assetId', 'artifactId', 'artifactVersion',
    'contentHash', 'status', 'progress', 'phase', 'createdAt', 'updatedAt', 'output', 'errorCode'
  ].includes(key)) &&
    typeof task.scopeHash === 'string' && SHA256.test(task.scopeHash) &&
    typeof task.taskId === 'string' && SAFE_ID.test(task.taskId) &&
    typeof task.taskKind === 'string' && MEDIA_TASK_KINDS.includes(task.taskKind as MediaTaskKind) &&
    typeof task.componentId === 'string' && MEDIA_COMPONENT_IDS.includes(task.componentId as MediaComponentId) &&
    typeof task.assetId === 'string' && SAFE_ID.test(task.assetId) &&
    typeof task.artifactId === 'string' && SAFE_ID.test(task.artifactId) &&
    typeof task.artifactVersion === 'string' && SAFE_VERSION.test(task.artifactVersion) &&
    typeof task.contentHash === 'string' && SHA256.test(task.contentHash) &&
    typeof task.status === 'string' && ['claimed', 'running', 'cancel_requested', 'succeeded', 'failed', 'cancelled'].includes(task.status) &&
    typeof task.progress === 'number' && Number.isInteger(task.progress) && task.progress >= 0 && task.progress <= 100 &&
    typeof task.phase === 'string' && SAFE_PHASE.test(task.phase) &&
    isIsoTimestamp(task.createdAt) && isIsoTimestamp(task.updatedAt) &&
    (task.output === undefined || isTaskOutput(task.output)) &&
    (task.errorCode === undefined || (typeof task.errorCode === 'string' && SAFE_PHASE.test(task.errorCode)))
}

function isTaskOutput(value: unknown): value is MediaTaskOutput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const output = value as Partial<MediaTaskOutput>
  return Object.keys(output).every((key) => ['assetId', 'artifactId', 'artifactVersion', 'contentHash'].includes(key)) &&
    typeof output.assetId === 'string' && SAFE_ID.test(output.assetId) &&
    typeof output.artifactId === 'string' && SAFE_ID.test(output.artifactId) &&
    typeof output.artifactVersion === 'string' && SAFE_VERSION.test(output.artifactVersion) &&
    typeof output.contentHash === 'string' && SHA256.test(output.contentHash)
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function validatedScopeHash(scope: MediaRuntimeScope): string {
  if (!scope || typeof scope !== 'object' || typeof scope.runtimeId !== 'string' || !SAFE_ID.test(scope.runtimeId)) {
    throw new MediaRequestError(400, 'media_invalid_scope')
  }
  return digest(scope.runtimeId)
}

function scopedTaskKey(scopeHash: string, taskId: string): string {
  return `${scopeHash}:${taskId}`
}

function isMissingFile(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'
}
