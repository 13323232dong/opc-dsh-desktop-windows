import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalAssetsRuntime } from '../../src/main/broker/local-assets-runtime'

describe('LocalAssetsRuntime', () => {
  it('persists assets in isolated opaque account directories', async () => {
    const runtime = new LocalAssetsRuntime(await mkdtemp(join(tmpdir(), 'evan-local-assets-')))
    await runtime.handle({ action: 'write', kind: 'knowledge', name: '甲资料', metadata: { content: '只属于甲' } }, { scopeId: 'account-a' })

    expect((await runtime.handle({ action: 'list' }, { scopeId: 'account-a' })).assets).toHaveLength(1)
    expect((await runtime.handle({ action: 'list' }, { scopeId: 'account-b' })).assets).toHaveLength(0)
    expect(await runtime.handle({ action: 'status' }, { scopeId: 'account-a' })).toEqual({
      connected: true,
      rootName: 'Evan超级管家',
      storage: 'local',
      privacy: '本地保存'
    })
  })

  it('rejects untrusted account scopes and traversal paths', async () => {
    const runtime = new LocalAssetsRuntime(await mkdtemp(join(tmpdir(), 'evan-local-assets-')))
    await expect(runtime.handle({ action: 'status' }, { scopeId: '../other' })).rejects.toThrow('local_assets_invalid_scope')
    await expect(runtime.handle({ action: 'write', kind: 'material', name: 'x', relativePath: '../../escape' }, { scopeId: 'account-a' })).rejects.toThrow('local_assets_path_denied')
  })
})
