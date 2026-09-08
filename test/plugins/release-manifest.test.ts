import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createReleaseManifest, verifyReleaseArtifacts } from '../../packages/opc-profile/release-manifest.js'
import { DESKTOP_PROFILE_MANIFEST } from '../../packages/opc-profile/index.js'

const profile = {
  schemaVersion: 1,
  id: 'opc-desktop',
  harnessVersion: '0.1.2-rc.1',
  plugins: [{
    name: '@opc/dsh-brand', version: '0.1.0', artifact: 'plugins/opc-dsh-brand-0.1.0.tgz',
    client: true, clientInject: [], requires: []
  }]
}

describe('OPC desktop release manifest', () => {
  it('refuses a release when an enabled plugin artifact is missing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-release-manifest-'))
    try {
      await expect(verifyReleaseArtifacts(profile, root)).resolves.toEqual([
        'missing plugin artifact: plugins/opc-dsh-brand-0.1.0.tgz'
      ])
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('records a stable SHA-256 for every artifact included in the release', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-release-manifest-'))
    try {
      await mkdir(join(root, 'plugins'))
      await writeFile(join(root, 'plugins', 'opc-dsh-brand-0.1.0.tgz'), 'verified plugin')
      const manifest = await createReleaseManifest(profile, root, { version: '0.7.3', platform: 'win32', arch: 'x64' })

      expect(manifest).toMatchObject({ version: '0.7.3', platform: 'win32', arch: 'x64' })
      expect(manifest.plugins[0]).toMatchObject({ name: '@opc/dsh-brand', artifact: 'plugins/opc-dsh-brand-0.1.0.tgz' })
      expect(manifest.plugins[0]?.sha256).toMatch(/^[a-f0-9]{64}$/)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('ships an artifact for every Windows desktop plugin declared by the profile', async () => {
    await expect(verifyReleaseArtifacts(DESKTOP_PROFILE_MANIFEST, join(process.cwd(), 'packages', 'opc-profile'))).resolves.toEqual([])
  })
})
