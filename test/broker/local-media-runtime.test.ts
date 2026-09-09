import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  LocalMediaRuntime,
  type MediaCapability,
  type MediaComponentSpec,
  type MediaTaskExecutor
} from '../../src/main/broker/local-media-runtime'

const COMPONENT_SHA256 = 'a'.repeat(64)
const CONTENT_HASH = 'b'.repeat(64)

const components: readonly MediaComponentSpec[] = [
  {
    id: 'ffmpeg',
    version: '8.0.1',
    license: 'GPL-3.0-or-later',
    sha256: COMPONENT_SHA256,
    sizeBytes: 25 * 1024 * 1024,
    supportedPlatforms: ['darwin-arm64']
  },
  {
    id: 'whisper-coreml',
    version: '1.8.2-small',
    license: 'MIT',
    sha256: 'c'.repeat(64),
    sizeBytes: 1_500 * 1024 * 1024,
    supportedPlatforms: ['darwin-arm64']
  }
]

const roots: string[] = []

afterEach(() => {
  roots.splice(0)
})

async function createRuntime(overrides: Partial<ConstructorParameters<typeof LocalMediaRuntime>[0]> = {}) {
  const applicationSupportDirectory = await mkdtemp(join(tmpdir(), 'opc-media-runtime-'))
  roots.push(applicationSupportDirectory)
  return new LocalMediaRuntime({
    applicationSupportDirectory,
    platform: 'darwin-arm64',
    components,
    installer: {
      install: vi.fn(async () => ({ sha256: COMPONENT_SHA256 }))
    },
    executors: {},
    ...overrides
  })
}

function invoke(
  runtime: LocalMediaRuntime,
  capability: MediaCapability,
  body: Record<string, unknown>,
  runtimeId = 'runtime-one'
) {
  return runtime.handle(capability, body, { runtimeId })
}

describe('LocalMediaRuntime', () => {
  it('reports pinned component metadata without leaking its Application Support path', async () => {
    const runtime = await createRuntime()

    const result = await invoke(runtime, 'media.status', {})

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ platform: 'darwin-arm64' })
    expect(result.body.components).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'ffmpeg',
        version: '8.0.1',
        license: 'GPL-3.0-or-later',
        sha256: COMPONENT_SHA256,
        state: 'not_installed'
      })
    ]))
    expect(JSON.stringify(result.body)).not.toContain(runtime.applicationSupportDirectory)
  })

  it('requires an out-of-band one-time approval before installing a large component', async () => {
    const installer = { install: vi.fn(async () => ({ sha256: 'c'.repeat(64) })) }
    const runtime = await createRuntime({ installer })

    const forged = await invoke(runtime, 'media.install', { componentId: 'whisper-coreml', confirm: true })
    expect(forged).toEqual({ status: 400, body: { code: 'media_invalid_request', retryable: false } })

    const blocked = await invoke(runtime, 'media.install', { componentId: 'whisper-coreml' })
    expect(blocked).toEqual({
      status: 409,
      body: expect.objectContaining({
        code: 'media_install_confirmation_required',
        status: 'requires_confirmation',
        component: expect.objectContaining({ id: 'whisper-coreml', sizeBytes: 1_500 * 1024 * 1024 })
      })
    })
    expect(installer.install).not.toHaveBeenCalled()

    const approvalToken = runtime.grantInstallApproval('whisper-coreml', { runtimeId: 'runtime-one' })
    const installed = await invoke(runtime, 'media.install', { componentId: 'whisper-coreml', approvalToken })
    expect(installed).toEqual({
      status: 200,
      body: expect.objectContaining({ component: expect.objectContaining({ id: 'whisper-coreml', state: 'installed' }) })
    })
    expect(installer.install).toHaveBeenCalledTimes(1)

    const reused = await invoke(runtime, 'media.install', { componentId: 'whisper-coreml', approvalToken })
    expect(reused.status).toBe(409)
    expect(installer.install).toHaveBeenCalledTimes(1)
  })

  it('rejects installer output whose checksum does not match the pinned component', async () => {
    const runtime = await createRuntime({
      installer: { install: vi.fn(async () => ({ sha256: 'd'.repeat(64) })) }
    })

    const result = await invoke(runtime, 'media.install', { componentId: 'ffmpeg' })

    expect(result).toEqual({
      status: 502,
      body: { code: 'media_component_checksum_mismatch', retryable: false }
    })
  })

  it('strictly rejects commands, scripts, paths, URLs, unknown components, and invalid hashes', async () => {
    const runtime = await createRuntime()
    const validClaim = {
      taskId: 'task-1',
      taskKind: 'anchor_quality_check',
      componentId: 'ffmpeg',
      assetId: 'asset-1',
      artifactId: 'artifact-1',
      artifactVersion: 'v1',
      contentHash: CONTENT_HASH
    }

    for (const forbidden of [
      { command: 'rm -rf /' },
      { script: 'process.exit()' },
      { path: '/private/tmp/input.mp4' },
      { url: 'https://example.test/video.mp4' }
    ]) {
      const result = await invoke(runtime, 'media.claim', { ...validClaim, ...forbidden })
      expect(result).toEqual({ status: 400, body: { code: 'media_invalid_request', retryable: false } })
    }

    expect(await invoke(runtime, 'media.claim', { ...validClaim, componentId: 'custom-binary' })).toEqual({
      status: 400,
      body: { code: 'media_component_not_allowed', retryable: false }
    })
    expect(await invoke(runtime, 'media.claim', { ...validClaim, contentHash: 'not-a-sha256' })).toEqual({
      status: 400,
      body: { code: 'media_invalid_request', retryable: false }
    })
  })

  it('claims, runs, persists, and reports an allowlisted task without exposing internal paths', async () => {
    const executor: MediaTaskExecutor = {
      run: vi.fn(async ({ reportProgress }) => {
        await reportProgress(45, 'extracting_audio')
        return {
          assetId: 'output-asset',
          artifactId: 'output-artifact',
          artifactVersion: 'v2',
          contentHash: 'e'.repeat(64)
        }
      })
    }
    const runtime = await createRuntime({ executors: { anchor_quality_check: executor } })
    await invoke(runtime, 'media.install', { componentId: 'ffmpeg' })
    const claim = {
      taskId: 'task-1',
      taskKind: 'anchor_quality_check',
      componentId: 'ffmpeg',
      assetId: 'asset-1',
      artifactId: 'artifact-1',
      artifactVersion: 'v1',
      contentHash: CONTENT_HASH
    }

    expect(await invoke(runtime, 'media.claim', claim)).toEqual({
      status: 201,
      body: expect.objectContaining({ task: expect.objectContaining({ taskId: 'task-1', status: 'claimed' }) })
    })
    expect((await invoke(runtime, 'media.run', { taskId: 'task-1', contentHash: CONTENT_HASH })).status).toBe(202)

    await vi.waitFor(async () => {
      const progress = await invoke(runtime, 'media.progress', { taskId: 'task-1' })
      expect(progress.body).toMatchObject({
        task: {
          taskId: 'task-1',
          status: 'succeeded',
          progress: 100,
          output: { assetId: 'output-asset', contentHash: 'e'.repeat(64) }
        }
      })
      expect(JSON.stringify(progress.body)).not.toContain(runtime.applicationSupportDirectory)
    })

    const state = JSON.parse(await readFile(join(runtime.applicationSupportDirectory, 'opc-media-runtime', 'state.json'), 'utf8'))
    expect(state.tasks[0]).toMatchObject({ taskId: 'task-1', status: 'succeeded' })
  })

  it('cancels a running task through AbortSignal and reports a stable terminal state', async () => {
    let started!: () => void
    const running = new Promise<void>((resolve) => { started = resolve })
    const executor: MediaTaskExecutor = {
      run: vi.fn(async ({ signal }) => {
        started()
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
        })
        throw new Error('unreachable')
      })
    }
    const runtime = await createRuntime({ executors: { anchor_quality_check: executor } })
    await invoke(runtime, 'media.install', { componentId: 'ffmpeg' })
    await invoke(runtime, 'media.claim', {
      taskId: 'task-cancel',
      taskKind: 'anchor_quality_check',
      componentId: 'ffmpeg',
      assetId: 'asset-1',
      artifactId: 'artifact-1',
      artifactVersion: 'v1',
      contentHash: CONTENT_HASH
    })
    await invoke(runtime, 'media.run', { taskId: 'task-cancel', contentHash: CONTENT_HASH })
    await running

    expect((await invoke(runtime, 'media.cancel', { taskId: 'task-cancel' })).status).toBe(202)
    await vi.waitFor(async () => {
      expect(await invoke(runtime, 'media.progress', { taskId: 'task-cancel' })).toEqual({
        status: 200,
        body: expect.objectContaining({ task: expect.objectContaining({ status: 'cancelled' }) })
      })
    })
  })

  it('isolates task records by the authenticated desktop runtime scope', async () => {
    const runtime = await createRuntime()
    const claim = {
      taskId: 'shared-looking-id',
      taskKind: 'anchor_quality_check',
      componentId: 'ffmpeg',
      assetId: 'asset-1',
      artifactId: 'artifact-1',
      artifactVersion: 'v1',
      contentHash: CONTENT_HASH
    }

    expect((await invoke(runtime, 'media.claim', claim, 'runtime-one')).status).toBe(201)
    expect(await invoke(runtime, 'media.progress', { taskId: claim.taskId }, 'runtime-two')).toEqual({
      status: 404,
      body: { code: 'media_task_not_found', retryable: false }
    })
    expect((await invoke(runtime, 'media.claim', claim, 'runtime-two')).status).toBe(201)
  })

  it('drops tampered persisted task output instead of exposing injected local paths', async () => {
    const applicationSupportDirectory = await mkdtemp(join(tmpdir(), 'opc-media-runtime-tampered-'))
    const runtimeDirectory = join(applicationSupportDirectory, 'opc-media-runtime')
    await mkdir(runtimeDirectory, { recursive: true })
    await writeFile(join(runtimeDirectory, 'state.json'), JSON.stringify({
      schemaVersion: 1,
      components: [],
      tasks: [{
        scopeHash: createHash('sha256').update('runtime-one').digest('hex'),
        taskId: 'tampered-task',
        taskKind: 'anchor_quality_check',
        componentId: 'ffmpeg',
        assetId: 'asset-1',
        artifactId: 'artifact-1',
        artifactVersion: 'v1',
        contentHash: CONTENT_HASH,
        status: 'succeeded',
        progress: 100,
        phase: 'completed',
        createdAt: '2026-09-08T00:00:00.000Z',
        updatedAt: '2026-09-08T00:00:01.000Z',
        output: {
          assetId: 'output-asset',
          artifactId: 'output-artifact',
          artifactVersion: 'v2',
          contentHash: 'e'.repeat(64),
          path: '/private/tmp/secret.mp4'
        }
      }]
    }))
    const runtime = new LocalMediaRuntime({
      applicationSupportDirectory,
      platform: 'darwin-arm64',
      components,
      executors: {}
    })

    expect(await invoke(runtime, 'media.progress', { taskId: 'tampered-task' })).toEqual({
      status: 404,
      body: { code: 'media_task_not_found', retryable: false }
    })
  })
})
