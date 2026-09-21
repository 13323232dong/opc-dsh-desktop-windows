import { createHash, randomUUID } from 'node:crypto'
import { access, copyFile, lstat, mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

export type LocalAssetKind = 'brand' | 'material' | 'knowledge'
export type LocalAssetStatus = 'active' | 'archived'

export interface LocalAssetRecord {
  assetId: string
  kind: LocalAssetKind
  name: string
  relativePath?: string
  mediaType?: string
  size?: number
  contentHash?: string
  status: LocalAssetStatus
  createdAt: string
  updatedAt: string
  metadata?: Record<string, unknown>
  storage: 'local'
  privacy: '本地保存'
  syncStatus: 'local'
  indexStatus: 'not-indexed' | 'indexed' | 'failed'
}

export interface LocalAssetsRequest {
  action: 'status' | 'list' | 'get' | 'content' | 'write' | 'archive' | 'restore' | 'search' | 'export' | 'import'
  operation?: string
  kind?: LocalAssetKind
  assetId?: string
  name?: string
  mediaType?: string
  query?: string
  metadata?: Record<string, unknown>
  contentBase64?: string
  relativePath?: string
  packagePath?: string
  includeArchived?: boolean
  status?: string
  trustedSourcePath?: string
}

export interface LocalAssetsContext { scopeId: string }
export interface LocalAssetContent { path: string; name: string; mediaType: string; size: number }

const KINDS: readonly LocalAssetKind[] = ['brand', 'material', 'knowledge']
const SCOPE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u

export class LocalAssetsRuntime {
  private readonly root: string

  constructor(root: string, private readonly scoped = false) {
    this.root = resolve(root)
  }

  async handle(request: LocalAssetsRequest, context: LocalAssetsContext = { scopeId: 'default' }): Promise<Record<string, unknown>> {
    const runtime = this.forScope(context)
    if (runtime !== this) return runtime.handle(request, context)
    switch (request.action) {
      case 'status': return { connected: true, rootName: 'Evan超级管家', storage: 'local', privacy: '本地保存' }
      case 'list': return { assets: await this.list(request) }
      case 'get': return { asset: await this.get(request.assetId) }
      case 'content': return await this.content(request.assetId)
      case 'write': return { asset: await this.write(request) }
      case 'archive': return { asset: await this.setStatus(request.assetId, 'archived') }
      case 'restore': return { asset: await this.setStatus(request.assetId, 'active') }
      case 'search': return { assets: await this.list(request) }
      case 'export': return await this.exportPackage(request.packagePath)
      case 'import': return await this.importPackage(request.packagePath)
    }
  }

  async openContent(request: Pick<LocalAssetsRequest, 'assetId'>, context: LocalAssetsContext = { scopeId: 'default' }): Promise<LocalAssetContent> {
    const runtime = this.forScope(context)
    if (runtime !== this) return runtime.openContent(request, context)
    const record = await this.get(request.assetId)
    if (!record.relativePath) throw new Error('local_assets_content_not_found')
    const path = this.containedPath(record.relativePath)
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('local_assets_content_not_found')
    return { path, name: record.name, mediaType: record.mediaType ?? 'application/octet-stream', size: info.size }
  }

  private forScope(context: LocalAssetsContext): LocalAssetsRuntime {
    if (this.scoped) return this
    if (!SCOPE_PATTERN.test(context.scopeId)) throw new Error('local_assets_invalid_scope')
    const scopeHash = createHash('sha256').update(context.scopeId).digest('hex').slice(0, 32)
    return new LocalAssetsRuntime(join(this.root, 'accounts', scopeHash), true)
  }

  private async list(request: LocalAssetsRequest): Promise<LocalAssetRecord[]> {
    const query = request.query?.trim().toLowerCase()
    const kinds = request.kind ? [request.kind] : KINDS
    const records = (await Promise.all(kinds.map((kind) => this.readManifest(kind)))).flat()
    return records.filter((record) => {
      if (!request.includeArchived && record.status === 'archived') return false
      if (request.status && record.status !== request.status) return false
      if (!query) return true
      return `${record.name} ${record.relativePath ?? ''} ${JSON.stringify(record.metadata ?? {})}`.toLowerCase().includes(query)
    })
  }

  private async get(assetId: string | undefined): Promise<LocalAssetRecord> {
    if (!assetId) throw new Error('local_assets_asset_id_required')
    const record = (await this.list({ action: 'list', includeArchived: true })).find((item) => item.assetId === assetId)
    if (!record) throw new Error('local_assets_not_found')
    return record
  }

  private async write(request: LocalAssetsRequest): Promise<LocalAssetRecord> {
    if (!request.kind || !KINDS.includes(request.kind)) throw new Error('local_assets_kind_required')
    if (!request.name || request.name.includes('/') || request.name.includes('\\')) throw new Error('local_assets_invalid_name')
    if (request.relativePath !== undefined) this.containedPath(request.relativePath)
    const records = await this.readManifest(request.kind)
    const existing = records.find((item) => item.assetId === request.assetId)
    const assetId = existing?.assetId ?? request.assetId ?? randomUUID()
    const now = new Date().toISOString()
    let relativePath = existing?.relativePath
    let size = existing?.size
    let contentHash = existing?.contentHash
    if (request.trustedSourcePath) {
      const source = await realpath(request.trustedSourcePath)
      const info = await lstat(source)
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('local_assets_source_denied')
      relativePath = request.relativePath ?? join(request.kind, `${assetId}-${safeName(request.name)}`)
      const target = this.containedPath(relativePath)
      await mkdir(dirname(target), { recursive: true })
      await copyFile(source, target)
      size = info.size
      contentHash = createHash('sha256').update(await readFile(target)).digest('hex')
    } else if (request.contentBase64 !== undefined) {
      const content = Buffer.from(request.contentBase64, 'base64')
      relativePath = request.relativePath ?? join(request.kind, `${assetId}-${safeName(request.name)}`)
      const target = this.containedPath(relativePath)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, content)
      size = content.length
      contentHash = createHash('sha256').update(content).digest('hex')
    }
    const record: LocalAssetRecord = {
      assetId, kind: request.kind, name: request.name, relativePath,
      mediaType: request.mediaType ?? existing?.mediaType, size, contentHash,
      status: existing?.status ?? 'active', createdAt: existing?.createdAt ?? now, updatedAt: now,
      metadata: request.metadata === undefined ? existing?.metadata : { ...(existing?.metadata ?? {}), ...request.metadata },
      storage: 'local', privacy: '本地保存', syncStatus: 'local', indexStatus: existing?.indexStatus ?? 'not-indexed'
    }
    await this.writeManifest(request.kind, existing ? records.map((item) => item.assetId === assetId ? record : item) : [...records, record])
    return record
  }

  private async content(assetId: string | undefined): Promise<Record<string, unknown>> {
    const opened = await this.openContent({ assetId })
    if (opened.size > 70 * 1024 * 1024) throw new Error('local_assets_preview_too_large')
    return { ...opened, contentBase64: (await readFile(opened.path)).toString('base64'), path: undefined }
  }

  private async setStatus(assetId: string | undefined, status: LocalAssetStatus): Promise<LocalAssetRecord> {
    const record = await this.get(assetId)
    const updated = { ...record, status, updatedAt: new Date().toISOString() }
    await this.writeManifest(record.kind, (await this.readManifest(record.kind)).map((item) => item.assetId === record.assetId ? updated : item))
    return updated
  }

  private async exportPackage(packagePath: string | undefined): Promise<Record<string, unknown>> {
    if (!packagePath?.endsWith('.opc-local-pack')) throw new Error('local_assets_invalid_package_path')
    const target = resolve(packagePath)
    if (isWithin(this.root, target)) throw new Error('local_assets_invalid_package_path')
    const assets = await this.list({ action: 'list', includeArchived: true })
    const files: Record<string, string> = {}
    for (const asset of assets) if (asset.relativePath) files[asset.relativePath] = (await readFile(this.containedPath(asset.relativePath))).toString('base64')
    const payload = { format: 'opc-local-pack', version: 1, assets, files }
    const body = JSON.stringify(payload)
    await writeFile(target, JSON.stringify({ ...payload, checksum: createHash('sha256').update(body).digest('hex') }), { flag: 'wx' })
    return { packageName: basename(target), encrypted: false, warning: '迁移包未加密，请勿上传公共网盘或聊天工具' }
  }

  private async importPackage(packagePath: string | undefined): Promise<Record<string, unknown>> {
    if (!packagePath?.endsWith('.opc-local-pack')) throw new Error('local_assets_invalid_package_path')
    const source = await realpath(packagePath)
    if (isWithin(this.root, source)) throw new Error('local_assets_invalid_package_path')
    const parsed = JSON.parse(await readFile(source, 'utf8')) as { format?: string; version?: number; assets?: LocalAssetRecord[]; files?: Record<string, string>; checksum?: string }
    const { checksum, ...payload } = parsed
    if (parsed.format !== 'opc-local-pack' || parsed.version !== 1 || !Array.isArray(parsed.assets) || !parsed.files || checksum !== createHash('sha256').update(JSON.stringify(payload)).digest('hex')) throw new Error('local_assets_checksum_mismatch')
    const conflicts: string[] = []
    for (const asset of parsed.assets) {
      if (!KINDS.includes(asset.kind) || !asset.assetId || !asset.name) throw new Error('local_assets_invalid_package')
      const existing = await this.readManifest(asset.kind)
      if (existing.some((item) => item.assetId === asset.assetId)) { conflicts.push(asset.assetId); continue }
      const encodedFile = asset.relativePath ? parsed.files[asset.relativePath] : undefined
      if (asset.relativePath && encodedFile) {
        const target = this.containedPath(asset.relativePath)
        await mkdir(dirname(target), { recursive: true })
        try { await access(target); conflicts.push(asset.relativePath) } catch { await writeFile(target, Buffer.from(encodedFile, 'base64'), { flag: 'wx' }) }
      }
      await this.writeManifest(asset.kind, [...existing, asset])
    }
    return { imported: true, conflictPolicy: 'preserve-existing', conflicts }
  }

  private async readManifest(kind: LocalAssetKind): Promise<LocalAssetRecord[]> {
    try { return JSON.parse(await readFile(join(this.root, kind, '资产清单.json'), 'utf8')) as LocalAssetRecord[] } catch { return [] }
  }

  private async writeManifest(kind: LocalAssetKind, records: LocalAssetRecord[]): Promise<void> {
    await mkdir(join(this.root, kind), { recursive: true })
    await writeFile(join(this.root, kind, '资产清单.json'), JSON.stringify(records, null, 2))
  }

  private containedPath(candidate: string): string {
    if (!candidate || candidate.startsWith('/') || candidate.includes('..') || candidate.includes('\\')) throw new Error('local_assets_path_denied')
    const target = resolve(this.root, candidate)
    if (!isWithin(this.root, target)) throw new Error('local_assets_path_denied')
    return target
  }
}

function safeName(value: string): string { return value.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 120) || 'asset' }
function isWithin(root: string, target: string): boolean { const path = relative(root, target); return path !== '' && !path.startsWith(`..${sep}`) && path !== '..' }
