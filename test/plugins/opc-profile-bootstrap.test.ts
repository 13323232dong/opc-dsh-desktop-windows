import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureOpcDesktopProfile, OPC_DESKTOP_PLUGINS } from '../../src/main/state/opc-profile-bootstrap'

const desktopPlugins = OPC_DESKTOP_PLUGINS

async function materializePluginArtifacts(directory: string): Promise<void> {
  await Promise.all(desktopPlugins.map(([, artifact]) => writeFile(join(directory, artifact), '')))
}

describe('ensureOpcDesktopProfile', () => {
  it('adds only bundled, verified OPC plugins to the initial web profile', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-profile-bootstrap-'))
    const profile = join(root, 'profiles', 'web')
    const plugins = join(root, 'bundled-plugins')
    await mkdir(profile, { recursive: true })
    await mkdir(plugins)
    await Promise.all([
      materializePluginArtifacts(plugins),
      writeFile(join(profile, 'package.json'), JSON.stringify({
        name: 'dsh-profile-web', private: true,
        dependencies: {},
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
      }))
    ])
    try {
      await expect(ensureOpcDesktopProfile(root, plugins)).resolves.toEqual({ changed: true, plugins: desktopPlugins.map(([name]) => name) })
      const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
      expect(manifest.dependencies).toEqual(Object.fromEntries(desktopPlugins.map(([name, artifact]) => [name, `file:${join(plugins, artifact)}`])))
      expect(manifest.dsh.profile.bundles).toEqual([
        '@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', ...desktopPlugins.map(([name]) => name)
      ])
      const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
      expect(patch).toContain('ui-brand-official')
      expect(patch).toContain('desktopMode: true')
      expect(patch).toContain('controlPlaneEnabled: true')
      expect(desktopPlugins.map(([name]) => name)).not.toContain('@opc/DSH-dong-computer-use')
      expect(desktopPlugins.map(([name]) => name)).not.toContain('@opc/dsh-dong-mobile-control')
      expect(desktopPlugins.map(([name]) => name)).not.toContain('@opc/dsh-desktop-orb')
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
    await Promise.all([
      materializePluginArtifacts(plugins),
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
    await Promise.all([
      materializePluginArtifacts(plugins),
      writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: {
        ...Object.fromEntries(desktopPlugins.map(([name, artifact]) => [name, `file:${join(plugins, artifact)}`]))
      }, dsh: { profile: { bundles: desktopPlugins.map(([name]) => name) } } })),
      writeFile(join(profile, 'cordis.patch.yml'), '# upstream patch documentation\n[]\n# OPC desktop baseline. Community bundle patches provide the actual plugin rows.\n- id: opc-brand\n')
    ])
    try {
      await expect(ensureOpcDesktopProfile(root, plugins)).resolves.toMatchObject({ changed: true })
      const patch = await readFile(join(profile, 'cordis.patch.yml'), 'utf8')
      expect(patch).not.toMatch(/^\[\]$/mu)
      expect(patch).toContain('- id: opc-brand')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
