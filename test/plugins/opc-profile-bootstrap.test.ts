import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureOpcDesktopProfile, OPC_DESKTOP_PLUGINS } from '../../src/main/state/opc-profile-bootstrap'

async function materializePluginArtifacts(directory: string): Promise<void> {
  await Promise.all(OPC_DESKTOP_PLUGINS.map(([, artifact]) => writeFile(join(directory, artifact), '')))
}

describe('ensureOpcDesktopProfile', () => {
  it('installs the desktop-compatible Agent Teams artifact', () => {
    expect(OPC_DESKTOP_PLUGINS).toContainEqual([
      '@nanmicoder/dsh-agent-teams',
      'nanmicoder-dsh-agent-teams-0.1.8-opc-desktop.6.tgz'
    ])
  })

  it('installs the fourth desktop brand artifact so existing profiles upgrade', () => {
    expect(OPC_DESKTOP_PLUGINS).toContainEqual([
      '@opc/dsh-brand',
      'opc-dsh-brand-0.1.0-opc-desktop.4.tgz',
      'opc-dsh-brand-0.1.0.tgz'
    ])
  })

  it('installs the asset plugin from the versioned 0.1.1 artifact', () => {
    expect(OPC_DESKTOP_PLUGINS).toContainEqual([
      '@opc/dsh-assets',
      'opc-dsh-assets-0.1.1.tgz'
    ])
  })

  it('upgrades an installed 0.1.0 asset artifact to 0.1.1', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await materializePluginArtifacts(plugins)
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      dependencies: {
        '@opc/dsh-assets': `file:${join(plugins, 'opc-dsh-assets-0.1.0.tgz')}`
      },
      dsh: { profile: { bundles: ['@opc/dsh-assets'] } }
    }))
    try {
      await expect(ensureOpcDesktopProfile(root, plugins)).resolves.toMatchObject({ changed: true })
      const upgraded = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
      expect(upgraded.dependencies['@opc/dsh-assets']).toBe(
        `file:${join(plugins, 'opc-dsh-assets-0.1.1.tgz')}`
      )
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('adds only bundled, verified OPC plugins to the initial web profile', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await materializePluginArtifacts(plugins)
    await writeFile(join(profile, 'package.json'), JSON.stringify({
        name: 'dsh-profile-web', private: true,
        dependencies: {},
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
    }))
    try {
      await expect(ensureOpcDesktopProfile(root, plugins)).resolves.toEqual({ changed: true, plugins: OPC_DESKTOP_PLUGINS.map(([name]) => name) })
      expect(OPC_DESKTOP_PLUGINS.map(([name]) => name)).not.toContain('@opc/dsh-secure-qr')
      const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
      expect(manifest.dependencies).toEqual(Object.fromEntries(OPC_DESKTOP_PLUGINS.map(([name, artifact]) => [name, `file:${join(plugins, artifact)}`])))
      expect(manifest.dsh.profile.bundles).toEqual(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', ...OPC_DESKTOP_PLUGINS.map(([name]) => name)])
      const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
      expect(patch).toContain('ui-brand-official')
      expect(patch).toContain('desktopMode: true')
      expect(patch.trimStart().startsWith('[]')).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fails before modifying a profile when a bundled plugin artifact is absent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} }))
    try {
      await expect(ensureOpcDesktopProfile(root, plugins)).rejects.toThrow('opc_desktop_plugin_artifact_missing')
      expect(JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))).toEqual({ dependencies: {} })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('replaces the commented upstream empty patch with one valid OPC patch sequence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await materializePluginArtifacts(plugins)
    await Promise.all([
      writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} })),
      writeFile(join(profile, 'cordis.patch.yml'), '# upstream patch documentation\n[]\n')
    ])
    try {
      await ensureOpcDesktopProfile(root, plugins)
      const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
      expect(patch).not.toMatch(/^\[\]$/mu)
      expect(patch).toContain('# upstream patch documentation')
      expect(patch).toContain('# OPC desktop baseline.')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('repairs an interrupted patch that contains both the old empty root and OPC rows', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await materializePluginArtifacts(plugins)
    await Promise.all([
      writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {
        '@opc/dsh-brand': `file:${join(plugins, 'opc-dsh-brand-0.1.0-opc-desktop.2.tgz')}`,
        '@nanmicoder/dsh-agent-teams': `file:${join(plugins, 'nanmicoder-dsh-agent-teams-0.1.8-opc-desktop.5.tgz')}`
      }, dsh: { profile: { bundles: ['@opc/dsh-brand', '@nanmicoder/dsh-agent-teams'] } } })),
      writeFile(join(profile, 'cordis.patch.yml'), '# upstream patch documentation\n[]\n# OPC desktop baseline. Community bundle patches provide the actual plugin rows.\n- id: opc-brand\n')
    ])
    try {
      await expect(ensureOpcDesktopProfile(root, plugins)).resolves.toMatchObject({ changed: true })
      const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')) as { dependencies: Record<string, string> }
      const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
      expect(manifest.dependencies['@opc/dsh-brand']).toBe(
        `file:${join(plugins, 'opc-dsh-brand-0.1.0-opc-desktop.4.tgz')}`
      )
      expect(patch).not.toMatch(/^\[\]$/mu)
      expect(patch).toContain('- id: opc-brand')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('replaces the previous desktop baseline so shipped plugin configuration upgrades', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await materializePluginArtifacts(plugins)
    await Promise.all([
      writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {} })),
      writeFile(join(profile, 'cordis.patch.yml'), '# upstream patch documentation\n# OPC desktop baseline. Community bundle patches provide the actual plugin rows.\n- id: opc-brand\n  config:\n    opcWebBaseUrl: https://opc.ohmycode.cc\n')
    ])
    try {
      await expect(ensureOpcDesktopProfile(root, plugins)).resolves.toMatchObject({ changed: true })
      const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
      expect(patch).toContain('# upstream patch documentation')
      expect(patch).toContain('desktopMode: true')
      expect(patch.match(/- id: opc-brand/g)).toHaveLength(1)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('removes the obsolete third-party QR plugin during profile upgrade', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await materializePluginArtifacts(plugins)
    await Promise.all([
      writeFile(join(profile, 'package.json'), JSON.stringify({
        dependencies: { '@opc/dsh-secure-qr': 'file:old-secure-qr.tgz' },
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@opc/dsh-secure-qr'] } }
      })),
      writeFile(join(profile, 'cordis.patch.yml'), '- insert:\n    - id: opc-secure-qr\n      name: \'@opc/dsh-secure-qr\'\n')
    ])
    try {
      await ensureOpcDesktopProfile(root, plugins)
      const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
      expect(manifest.dependencies['@opc/dsh-secure-qr']).toBeUndefined()
      expect(manifest.dsh.profile.bundles).not.toContain('@opc/dsh-secure-qr')
      expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).not.toContain('opc-secure-qr')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
