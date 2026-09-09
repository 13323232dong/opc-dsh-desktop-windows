import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createDesktopMediaRuntime,
  DESKTOP_MEDIA_COMPONENTS,
  PinnedMediaComponentInstaller,
  type MediaArtifactGateway,
  type PinnedMediaArtifact
} from '../../src/main/broker/desktop-media-runtime'

describe('desktop media runtime composition', () => {
  it('defines a scope-bound gateway for controlled composition materialization and result commit', () => {
    const gateway = {
      materializeComposition: vi.fn(),
      commitComposition: vi.fn()
    } satisfies MediaArtifactGateway

    expect(Object.keys(gateway)).toEqual(['materializeComposition', 'commitComposition'])
  })

  it('exposes only fixed public metadata while making the verified macOS FFmpeg build installable', async () => {
    expect(DESKTOP_MEDIA_COMPONENTS.map((component) => component.id)).toEqual([
      'ffmpeg',
      'whisper-coreml',
      'moneyprinter-turbo',
      'hyperframes'
    ])
    expect(DESKTOP_MEDIA_COMPONENTS.every((component) => /^[a-f0-9]{64}$/u.test(component.sha256))).toBe(true)
    expect(JSON.stringify(DESKTOP_MEDIA_COMPONENTS)).not.toMatch(/(?:url|command|path)/iu)

    const applicationSupportDirectory = await mkdtemp(join(tmpdir(), 'opc-desktop-media-'))
    const runtime = createDesktopMediaRuntime(applicationSupportDirectory)
    const status = await runtime.handle('media.status', {}, { runtimeId: 'account-scope' })

    expect(status.status).toBe(200)
    const components = status.body.components as Array<Record<string, unknown>>
    const ffmpeg = components.find((component) => component.id === 'ffmpeg')
    expect(ffmpeg).toMatchObject({ id: 'ffmpeg', version: '6.0-b6.1.1', state: 'not_installed' })
    expect(ffmpeg?.installable).toBe(process.platform !== 'win32')
    expect(status.body).toMatchObject({
      components: expect.arrayContaining([
        expect.objectContaining({ id: 'hyperframes', version: '0.8.22', license: 'Apache-2.0' })
      ])
    })
    expect(JSON.stringify(status.body)).not.toContain(applicationSupportDirectory)
  })

  it('streams only an exact pinned artifact, verifies its digest, and installs an executable atomically', async () => {
    const bytes = Buffer.from('#!/bin/sh\necho verified\n')
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const artifact: PinnedMediaArtifact = {
      componentId: 'ffmpeg',
      version: 'test-b6.1.1',
      platform: 'darwin-arm64',
      fileName: 'ffmpeg',
      url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-arm64',
      sha256,
      sizeBytes: bytes.length
    }
    const fetcher = vi.fn(async () => new Response(bytes, {
      status: 200,
      headers: { 'content-length': String(bytes.length) }
    }))
    const installer = new PinnedMediaComponentInstaller([artifact], 'darwin-arm64', fetcher)
    const targetDirectory = await mkdtemp(join(tmpdir(), 'opc-desktop-ffmpeg-'))

    await expect(installer.install({
      component: {
        id: 'ffmpeg', version: artifact.version, license: 'GPL-3.0-or-later', sha256,
        sizeBytes: bytes.length, supportedPlatforms: ['darwin-arm64'], distributionStatus: 'available'
      },
      targetDirectory,
      signal: new AbortController().signal
    })).resolves.toEqual({ sha256 })

    expect(fetcher).toHaveBeenCalledWith(artifact.url, expect.objectContaining({ redirect: 'follow' }))
    expect(await readFile(join(targetDirectory, 'ffmpeg'))).toEqual(bytes)
    if (process.platform !== 'win32') {
      expect((await stat(join(targetDirectory, 'ffmpeg'))).mode & 0o111).not.toBe(0)
    }
  })

  it('removes a corrupt download and never reports a mismatched component as installed', async () => {
    const expected = Buffer.from('expected')
    const artifact: PinnedMediaArtifact = {
      componentId: 'ffmpeg', version: 'test-b6.1.1', platform: 'darwin-arm64', fileName: 'ffmpeg',
      url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-arm64',
      sha256: createHash('sha256').update(expected).digest('hex'), sizeBytes: expected.length
    }
    const installer = new PinnedMediaComponentInstaller(
      [artifact], 'darwin-arm64', async () => new Response('tampered', { status: 200 })
    )
    const targetDirectory = await mkdtemp(join(tmpdir(), 'opc-desktop-ffmpeg-corrupt-'))

    await expect(installer.install({
      component: {
        id: 'ffmpeg', version: artifact.version, license: 'GPL-3.0-or-later', sha256: artifact.sha256,
        sizeBytes: artifact.sizeBytes, supportedPlatforms: ['darwin-arm64'], distributionStatus: 'available'
      },
      targetDirectory,
      signal: new AbortController().signal
    })).rejects.toThrow('media_component_checksum_mismatch')
    await expect(readFile(join(targetDirectory, 'ffmpeg'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('fails closed when FFmpeg is installed but no controlled asset gateway is wired', async () => {
    const applicationSupportDirectory = await mkdtemp(join(tmpdir(), 'opc-desktop-media-no-gateway-'))
    const runtimeDirectory = join(applicationSupportDirectory, 'opc-media-runtime')
    await mkdir(runtimeDirectory, { recursive: true })
    await writeFile(join(runtimeDirectory, 'state.json'), JSON.stringify({
      schemaVersion: 1,
      components: [{
        id: 'ffmpeg',
        version: '6.0-b6.1.1',
        license: 'GPL-3.0-or-later',
        sha256: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584',
        state: 'installed',
        installedAt: '2026-09-08T00:00:00.000Z'
      }],
      tasks: []
    }))
    const runtime = createDesktopMediaRuntime(applicationSupportDirectory)
    const claim = {
      taskId: 'compose-task',
      taskKind: 'compose_vertical_video',
      componentId: 'ffmpeg',
      assetId: 'composition-manifest-asset',
      artifactId: 'composition-manifest-v1',
      artifactVersion: 'v1',
      contentHash: 'b'.repeat(64)
    }

    expect((await runtime.handle('media.claim', claim, { runtimeId: 'account-scope' })).status).toBe(201)
    const unavailableResponse = process.platform === 'win32'
      ? { status: 409, body: { code: 'media_component_not_installed', retryable: false } }
      : { status: 503, body: { code: 'media_executor_unavailable', retryable: true } }
    expect(await runtime.handle('media.run', {
      taskId: claim.taskId,
      contentHash: claim.contentHash
    }, { runtimeId: 'account-scope' })).toEqual(unavailableResponse)
    expect(await runtime.handle('media.run', {
      taskId: claim.taskId,
      contentHash: claim.contentHash,
      path: '/private/tmp/untrusted.mp4'
    }, { runtimeId: 'account-scope' })).toEqual({
      status: 400,
      body: { code: 'media_invalid_request', retryable: false }
    })
  })
})
