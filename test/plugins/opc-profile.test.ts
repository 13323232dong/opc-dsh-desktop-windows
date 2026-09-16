import { describe, expect, it } from 'vitest'
import {
  DESKTOP_PROFILE_MANIFEST,
  createDesktopProfileManifest,
  validateDesktopProfile
} from '../../packages/opc-profile/index.js'

describe('OPC desktop profile', () => {
  it('exports an immutable, self-contained plugin manifest', () => {
    const profile = createDesktopProfileManifest()

    expect(profile).toEqual(DESKTOP_PROFILE_MANIFEST)
    expect(Object.isFrozen(profile)).toBe(true)
    expect(profile.id).toBe('opc-desktop')
    expect(profile.plugins.map((plugin) => plugin.name)).toContain('@nanmicoder/dsh-agent-teams')
    expect(profile.plugins.map((plugin) => plugin.name)).toEqual([
      '@opc/dsh-brand', '@nanmicoder/dsh-agent-teams', '@opc/dsh-assets',
      '@opc/dsh-assets-workbench', '@opc/dsh-file-attachments', 'dsh-file-picker',
      '@opc/dsh-douyin-comment-ops', '@opc/dsh-douyin-publisher', '@opc/dsh-feishu-docs',
      '@opc/dsh-context-retrieval', '@omdsh-dev/dsh-genui', '@opc/dsh-publish-precheck',
      'DSH-opc-material-matcher', '@opc/dsh-realtime-voice', '@opc/dsh-task-tracker',
      '@opc/dsh-viral-chase', '@opc/dsh-session-context', '@opc/dsh-dev-status-control'
    ])
    expect(profile.plugins).toContainEqual(expect.objectContaining({
      name: '@opc/dsh-brand', version: '0.1.2', artifact: 'plugins/opc-dsh-brand-0.1.2.tgz'
    }))
    expect(profile.plugins).toContainEqual(expect.objectContaining({
      name: '@opc/dsh-feishu-docs', artifact: 'plugins/opc-dsh-feishu-docs-0.1.0.tgz', client: false
    }))
    expect(profile.plugins).toContainEqual(expect.objectContaining({
      name: '@opc/dsh-viral-chase', version: '0.1.6', artifact: 'plugins/opc-dsh-viral-chase-0.1.6.tgz'
    }))
    expect(profile.plugins).toContainEqual(expect.objectContaining({
      name: '@opc/dsh-dev-status-control', version: '0.2.4',
      artifact: 'plugins/opc-dsh-dev-status-control-0.2.4.tgz', client: true
    }))
    expect(validateDesktopProfile(profile)).toEqual([])
  })

  it.each([
    '/Users/mac/OPC智能体团队/dsh-plugins/opc-agent-teams',
    'file:../../../../node_modules/@opc/dsh-brand',
    'plugins/node_modules/@opc/dsh-brand.tgz'
  ])('rejects a non-portable plugin artifact: %s', (artifact) => {
    const profile = createDesktopProfileManifest({
      plugins: [{ ...DESKTOP_PROFILE_MANIFEST.plugins[0], artifact }]
    })

    expect(validateDesktopProfile(profile)).toContain('plugin @opc/dsh-brand has a non-portable artifact path')
  })

  it('rejects duplicate, unregistered, and unclosed plugin references', () => {
    const brand = DESKTOP_PROFILE_MANIFEST.plugins[0]
    const profile = createDesktopProfileManifest({
      plugins: [
        brand,
        { ...brand, artifact: 'plugins/opc-brand-copy.tgz' },
        {
          name: '@opc/not-registered',
          version: '0.1.0',
          artifact: 'plugins/not-registered.tgz',
          client: false,
          clientInject: [],
          requires: ['@missing/plugin']
        }
      ]
    })

    expect(validateDesktopProfile(profile)).toEqual(expect.arrayContaining([
      'plugin @opc/dsh-brand is declared more than once',
      'plugin @opc/not-registered is not registered for this desktop profile',
      'plugin @opc/not-registered requires unregistered package @missing/plugin'
    ]))
  })

  it('rejects a client injection outside the fixed Harness client closure', () => {
    const profile = createDesktopProfileManifest({
      plugins: [{
        ...DESKTOP_PROFILE_MANIFEST.plugins[0],
        clientInject: ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-not-real']
      }]
    })

    expect(validateDesktopProfile(profile)).toContain(
      'plugin @opc/dsh-brand injects unavailable client module @deepseek-ai/dsh-client-ui-not-real'
    )
  })
})
