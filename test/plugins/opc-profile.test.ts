import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  DESKTOP_PROFILE_MANIFEST,
  createDesktopProfileManifest,
  validateDesktopProfile
} from '../../packages/opc-profile/index.js'

describe('OPC macOS desktop profile', () => {
  it('exports an immutable, self-contained plugin manifest', () => {
    const profile = createDesktopProfileManifest()

    expect(profile).toEqual(DESKTOP_PROFILE_MANIFEST)
    expect(Object.isFrozen(profile)).toBe(true)
    expect(profile.id).toBe('opc-macos-desktop')
    expect(profile.plugins.map((plugin) => plugin.name)).toContain('@nanmicoder/dsh-agent-teams')
    expect(profile.plugins.map((plugin) => plugin.name)).toContain('@omdsh-dev/dsh-genui')
    expect(profile.plugins.map((plugin) => plugin.name)).toContain('@opc/dsh-task-tracker')
    expect(profile.plugins.map((plugin) => plugin.name)).not.toContain('@opc/dsh-secure-qr')
    expect(validateDesktopProfile(profile)).toEqual([])
  })

  it('points every desktop plugin at a bundled artifact', () => {
    for (const plugin of DESKTOP_PROFILE_MANIFEST.plugins) {
      expect(existsSync(join('packages/opc-profile', plugin.artifact)), plugin.name).toBe(true)
    }
  })

  it('pins the desktop brand plugin to the Evan artifact', () => {
    const brandPlugin = DESKTOP_PROFILE_MANIFEST.plugins.find(
      (plugin) => plugin.name === '@opc/dsh-brand'
    )

    expect(brandPlugin).toMatchObject({
      version: '0.1.0-opc-desktop.4',
      artifact: 'plugins/opc-dsh-brand-0.1.0-opc-desktop.4.tgz'
    })
  })

  it('pins the asset plugin version to its immutable desktop artifact', () => {
    const assetPlugin = DESKTOP_PROFILE_MANIFEST.plugins.find(
      (plugin) => plugin.name === '@opc/dsh-assets'
    )

    expect(assetPlugin).toMatchObject({
      version: '0.1.1',
      artifact: 'plugins/opc-dsh-assets-0.1.1.tgz'
    })
  })

  it('pins file attachments to a new artifact when its desktop bridge changes', () => {
    const attachmentsPlugin = DESKTOP_PROFILE_MANIFEST.plugins.find(
      (plugin) => plugin.name === '@opc/dsh-file-attachments'
    )

    expect(attachmentsPlugin).toMatchObject({
      version: '0.1.2',
      artifact: 'plugins/opc-dsh-file-attachments-0.1.2.tgz'
    })
  })

  it('pins Agent Teams to the desktop retry-state build', () => {
    const agentTeamsPlugin = DESKTOP_PROFILE_MANIFEST.plugins.find(
      (plugin) => plugin.name === '@nanmicoder/dsh-agent-teams'
    )

    expect(agentTeamsPlugin).toMatchObject({
      version: '0.1.8-opc-desktop.6',
      artifact: 'plugins/nanmicoder-dsh-agent-teams-0.1.8-opc-desktop.6.tgz'
    })
  })

  it('pins the context retrieval plugin to its versioned desktop artifact', () => {
    const contextPlugin = DESKTOP_PROFILE_MANIFEST.plugins.find(
      (plugin) => plugin.name === '@opc/dsh-context-retrieval'
    )

    expect(contextPlugin).toMatchObject({
      version: '0.1.1',
      artifact: 'plugins/opc-dsh-context-retrieval-0.1.1.tgz'
    })
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
