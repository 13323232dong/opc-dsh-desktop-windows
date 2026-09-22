import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')

describe('Windows release parity', () => {
  it('packages the same login, brand, and profile resources as macOS', async () => {
    const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      build: { extraResources: Array<{ from: string; to: string }> }
    }
    const resources = packageJson.build.extraResources

    for (const resource of [
      ['packages/opc-profile', 'opc-profile'],
      ['build/login.html', 'login.html'],
      ['build/splash.html', 'splash.html'],
      ['build/evan-super-employee.svg', 'evan-super-employee.svg'],
      ['build/plugin-recovery.html', 'plugin-recovery.html'],
      ['build/safe-mode.html', 'safe-mode.html']
    ]) {
      expect(resources).toContainEqual({ from: resource[0], to: resource[1] })
    }
  })

  it('uses the current Evan installer and executable names in Windows CI', async () => {
    const workflow = await readFile(path.join(root, '.github', 'workflows', 'release.yml'), 'utf8')
    const candidate = await readFile(path.join(root, '.github', 'workflows', 'windows-candidate.yml'), 'utf8')

    for (const source of [workflow, candidate]) {
      expect(source).toContain('Evan超级管家-windows-x64-setup.exe')
      expect(source).not.toContain('opc-desktop-windows-x64-setup.exe')
    }
    expect(workflow).toContain('dist\\win-unpacked\\Evan超级管家.exe')
    expect(workflow).toContain('dist-dev\\win-unpacked\\Evan超级管家 Dev.exe')
    expect(workflow).not.toContain('DSH Desktop.exe')
  })

  it('verifies the packaged Windows login and every declared plugin artifact', async () => {
    const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    const verifier = await readFile(
      path.join(root, 'scripts', 'verify-packaged-windows-release.mjs'),
      'utf8'
    )

    expect(packageJson.scripts['package:win']).toContain('node scripts/finalize-packaged-windows-release.mjs')
    expect(packageJson.scripts['package:win']).toContain('npm run verify:package:win')
    expect(packageJson.scripts['verify:package:win']).toBe(
      'node scripts/verify-packaged-windows-release.mjs x64'
    )
    expect(verifier).toContain("'dist', 'win-unpacked', 'resources'")
    expect(verifier).toContain("'login.html'")
    expect(verifier).toContain("'evan-super-employee.svg'")
    expect(verifier).toContain("'opc-profile', 'release-manifest.json'")
    expect(verifier).toContain('packaged Windows plugin artifact is stale')
    expect(verifier).toContain('packaged Windows latest.yml does not match the installer')
  })
})
