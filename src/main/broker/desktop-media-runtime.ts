import { createHash, randomUUID } from 'node:crypto'
import { chmod, mkdir, open, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import {
  LocalMediaRuntime,
  type ClaimedMediaTask,
  type MediaComponentId,
  type MediaComponentInstaller,
  type MediaComponentSpec,
  type MediaTaskOutput
} from './local-media-runtime'

export interface MaterializedMediaFile {
  /** Main-process-only path inside the gateway-owned task sandbox. */
  readonly localPath: string
  readonly mediaType: string
  readonly sizeBytes: number
  readonly contentHash: string
}

export interface MaterializedCompositionShot {
  readonly shotNumber: string
  readonly source: Readonly<MaterializedMediaFile>
  readonly targetDurationMs: number
  readonly captions: string
  readonly transition: 'cut' | 'fade'
}

export interface MaterializedComposition {
  /** Opaque gateway lease; it is never returned through the public Broker. */
  readonly leaseId: string
  readonly workingDirectory: string
  readonly shots: readonly Readonly<MaterializedCompositionShot>[]
  readonly audio: Readonly<MaterializedMediaFile>
  readonly targetDurationMs: number
}

export interface ComposedMediaFile {
  /** Main-process-only path to the fixed output inside the leased sandbox. */
  readonly localPath: string
  readonly mediaType: 'video/mp4'
  readonly sizeBytes: number
  readonly contentHash: string
}

export interface ScopedMediaTaskReference {
  /** Opaque runtime-scope digest used to preserve account and Session isolation. */
  readonly scopeBinding: string
  readonly task: Readonly<ClaimedMediaTask>
}

/**
 * Trusted main-process boundary between opaque OPC asset references and local
 * media files. Implementations must authenticate the current OPC account,
 * verify every referenced asset against the task scope/content hash, and own
 * cleanup of their leased sandbox. This interface is never exposed to DSH.
 */
export interface MediaArtifactGateway {
  materializeComposition(
    input: Readonly<ScopedMediaTaskReference> & { readonly signal: AbortSignal }
  ): Promise<Readonly<MaterializedComposition>>
  commitComposition(
    input: Readonly<ScopedMediaTaskReference> & {
      readonly leaseId: string
      readonly output: Readonly<ComposedMediaFile>
      readonly signal: AbortSignal
    }
  ): Promise<Readonly<MediaTaskOutput>>
}

export interface PinnedMediaArtifact {
  componentId: MediaComponentId
  version: string
  platform: string
  fileName: string
  url: string
  sha256: string
  sizeBytes: number
}

const FFMPEG_VERSION = '6.0-b6.1.1'
const PINNED_MEDIA_ARTIFACTS: readonly PinnedMediaArtifact[] = Object.freeze([
  Object.freeze({
    componentId: 'ffmpeg',
    version: FFMPEG_VERSION,
    platform: 'darwin-arm64',
    fileName: 'ffmpeg',
    url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-arm64',
    sha256: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584',
    sizeBytes: 45_568_216
  }),
  Object.freeze({
    componentId: 'ffmpeg',
    version: FFMPEG_VERSION,
    platform: 'darwin-x64',
    fileName: 'ffmpeg',
    url: 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-darwin-x64',
    sha256: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894',
    sizeBytes: 78_862_176
  })
])

const FALLBACK_FFMPEG_SHA256 = '2110f80b9f6cd2cc47eb72b7f7841aa8f8e6648c6c34459750fb6b82fc119f53'
const SHA256 = /^[a-f0-9]{64}$/u
const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/u

function mediaComponents(platform: string): readonly MediaComponentSpec[] {
  const ffmpeg = PINNED_MEDIA_ARTIFACTS.find((artifact) => (
    artifact.componentId === 'ffmpeg' && artifact.platform === platform
  ))
  return Object.freeze([
    Object.freeze({
      id: 'ffmpeg',
      version: ffmpeg?.version ?? FFMPEG_VERSION,
      license: 'GPL-3.0-or-later',
      sha256: ffmpeg?.sha256 ?? FALLBACK_FFMPEG_SHA256,
      sizeBytes: ffmpeg?.sizeBytes ?? 0,
      supportedPlatforms: Object.freeze(ffmpeg ? [platform] : ['darwin-arm64', 'darwin-x64']),
      distributionStatus: ffmpeg ? 'available' : 'unavailable'
    }),
    Object.freeze({
      id: 'whisper-coreml',
      version: '1.8.2-small-opc.1',
      license: 'MIT',
      sha256: '713cd7ea26f15457e02ad215a84f06f9ce83e2edbd0dbe923d5dba4fcc14d86f',
      sizeBytes: 1_500 * 1024 * 1024,
      supportedPlatforms: Object.freeze(['darwin-arm64']),
      distributionStatus: 'unavailable'
    }),
    Object.freeze({
      id: 'moneyprinter-turbo',
      version: '1.3.4-opc.1',
      license: 'MIT',
      sha256: 'ff55264d51b407378d4635011cfe76f0f18cb954febbbe5a8d67b73c56dad256',
      sizeBytes: 2 * 1024 * 1024 * 1024,
      supportedPlatforms: Object.freeze(['darwin-arm64', 'darwin-x64']),
      distributionStatus: 'unavailable'
    }),
    Object.freeze({
      id: 'hyperframes',
      version: '0.8.22',
      license: 'Apache-2.0',
      sha256: '41d7d60c1b8f90c53870bbd5a9e64b9023ba5e6acb57fc5663a39b92ea4162db',
      sizeBytes: 34_313_682,
      supportedPlatforms: Object.freeze(['darwin-arm64', 'darwin-x64']),
      distributionStatus: 'unavailable'
    })
  ])
}

export const DESKTOP_MEDIA_COMPONENTS = mediaComponents(`${process.platform}-${process.arch}`)

export class PinnedMediaComponentInstaller implements MediaComponentInstaller {
  private readonly artifacts: ReadonlyMap<string, Readonly<PinnedMediaArtifact>>

  constructor(
    artifacts: readonly PinnedMediaArtifact[],
    private readonly platform: string,
    private readonly fetcher: typeof fetch = fetch
  ) {
    this.artifacts = validateArtifacts(artifacts)
  }

  async install(input: {
    component: Readonly<MediaComponentSpec>
    targetDirectory: string
    signal: AbortSignal
  }): Promise<{ sha256: string }> {
    const artifact = this.artifacts.get(artifactKey(input.component.id, input.component.version, this.platform))
    if (!artifact || !sameArtifact(input.component, artifact)) {
      throw new Error('media_component_artifact_not_pinned')
    }
    const response = await this.fetcher(artifact.url, {
      method: 'GET',
      redirect: 'follow',
      signal: input.signal,
      headers: { accept: 'application/octet-stream' }
    })
    if (!response.ok || !response.body) throw new Error('media_component_download_failed')
    const declaredSize = response.headers.get('content-length')
    if (declaredSize !== null && Number(declaredSize) !== artifact.sizeBytes) {
      throw new Error('media_component_size_mismatch')
    }

    await mkdir(input.targetDirectory, { recursive: true, mode: 0o700 })
    const destination = join(input.targetDirectory, artifact.fileName)
    const temporary = join(input.targetDirectory, `.${artifact.fileName}.${randomUUID()}.download`)
    const hash = createHash('sha256')
    let size = 0
    let handle: Awaited<ReturnType<typeof open>> | undefined
    try {
      handle = await open(temporary, 'wx', 0o600)
      for await (const chunk of response.body) {
        if (input.signal.aborted) throw new DOMException('aborted', 'AbortError')
        const bytes = Buffer.from(chunk)
        size += bytes.length
        if (size > artifact.sizeBytes) throw new Error('media_component_size_mismatch')
        hash.update(bytes)
        await handle.write(bytes)
      }
      await handle.sync()
      await handle.close()
      handle = undefined
      const sha256 = hash.digest('hex')
      if (size !== artifact.sizeBytes) throw new Error('media_component_size_mismatch')
      if (sha256 !== artifact.sha256) throw new Error('media_component_checksum_mismatch')
      await chmod(temporary, 0o755)
      await rename(temporary, destination)
      return { sha256 }
    } catch (error) {
      await handle?.close().catch(() => undefined)
      await rm(temporary, { force: true })
      throw error
    }
  }
}

export function createDesktopMediaRuntime(applicationSupportDirectory: string): LocalMediaRuntime {
  const platform = `${process.platform}-${process.arch}`
  return new LocalMediaRuntime({
    applicationSupportDirectory,
    platform,
    components: mediaComponents(platform),
    installer: new PinnedMediaComponentInstaller(PINNED_MEDIA_ARTIFACTS, platform),
    executors: {}
  })
}

function validateArtifacts(artifacts: readonly PinnedMediaArtifact[]) {
  const catalog = new Map<string, Readonly<PinnedMediaArtifact>>()
  for (const artifact of artifacts) {
    const url = new URL(artifact.url)
    const valid = url.protocol === 'https:'
      && url.hostname === 'github.com'
      && url.pathname.startsWith('/eugeneware/ffmpeg-static/releases/download/')
      && artifact.componentId === 'ffmpeg'
      && SAFE_FILE_NAME.test(artifact.fileName)
      && SHA256.test(artifact.sha256)
      && Number.isSafeInteger(artifact.sizeBytes)
      && artifact.sizeBytes > 0
    const key = artifactKey(artifact.componentId, artifact.version, artifact.platform)
    if (!valid || catalog.has(key)) throw new Error('media_component_artifact_catalog_invalid')
    catalog.set(key, Object.freeze({ ...artifact }))
  }
  return catalog
}

function sameArtifact(component: Readonly<MediaComponentSpec>, artifact: Readonly<PinnedMediaArtifact>) {
  return component.id === artifact.componentId
    && component.version === artifact.version
    && component.sha256 === artifact.sha256
    && component.sizeBytes === artifact.sizeBytes
    && component.distributionStatus === 'available'
    && component.supportedPlatforms.includes(artifact.platform)
}

function artifactKey(componentId: MediaComponentId, version: string, platform: string) {
  return `${componentId}:${version}:${platform}`
}
