import { describe, expect, it, vi } from 'vitest'
import { EgoLiteAdapter } from '../../src/main/ego/ego-lite'

describe('EgoLiteAdapter', () => {
  it('discovers a configured executable before known candidates', async () => {
    const exists = vi.fn(async (path: string) => path === '/custom/ego-lite')
    const adapter = new EgoLiteAdapter({ exists, platform: 'darwin' })
    await expect(adapter.discover('/custom/ego-lite')).resolves.toEqual({ available: true, executablePath: '/custom/ego-lite' })
  })

  it('launches through an argument array with a unique account profile', async () => {
    const launch = vi.fn(async () => undefined)
    const adapter = new EgoLiteAdapter({ exists: async () => true, launch, platform: 'darwin' })
    await adapter.launch({ executablePath: '/usr/local/bin/ego-lite', profileDirectory: '/profiles/tenant-a/user-a', initialUrl: 'https://my.feishu.cn/drive', allowedDomains: ['my.feishu.cn'] })
    expect(launch).toHaveBeenCalledWith('/usr/local/bin/ego-lite', [
      '--user-data-dir=/profiles/tenant-a/user-a',
      '--no-first-run',
      'https://my.feishu.cn/drive'
    ])
  })

  it('rejects navigation to domains outside the explicit allowlist', () => {
    const adapter = new EgoLiteAdapter({ exists: async () => true, platform: 'darwin' })
    expect(() => adapter.assertAllowedUrl('https://my.feishu.cn/wiki/token', ['my.feishu.cn'])).not.toThrow()
    expect(() => adapter.assertAllowedUrl('https://evil.example/redirect', ['my.feishu.cn'])).toThrow('desktop_ego_domain_not_allowed')
    expect(() => adapter.assertAllowedUrl('http://my.feishu.cn/plain', ['my.feishu.cn'])).toThrow('desktop_ego_domain_not_allowed')
    expect(() => adapter.assertAllowedUrl('https://my.feishu.cn@evil.example/', ['my.feishu.cn'])).toThrow('desktop_ego_domain_not_allowed')
  })
})
