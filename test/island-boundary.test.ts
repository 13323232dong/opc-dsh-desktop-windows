import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')

describe('OPC desktop island boundary', () => {
  it('uses separate production and development application identities', async () => {
    const [packageRaw, developmentRaw] = await Promise.all([
      readFile(path.join(root, 'package.json'), 'utf8'),
      readFile(path.join(root, 'electron-builder.dev.cjs'), 'utf8')
    ])
    const packageJson = JSON.parse(packageRaw) as {
      name: string
      build: { appId: string; productName: string; artifactName: string }
    }

    expect(packageJson.name).toBe('opc-dsh-desktop')
    expect(packageJson.build).toMatchObject({
      appId: 'cc.ohmycode.opc.desktop',
      productName: '伟东 OPC',
      artifactName: 'opc-desktop-${os}-${arch}.${ext}'
    })
    expect(developmentRaw).toContain("appId: 'cc.ohmycode.opc.desktop.dev'")
    expect(developmentRaw).toContain("productName: '伟东 OPC Dev'")
    expect(developmentRaw).toContain("output: 'dist-dev'")
  })

  it('does not point the fork at the upstream desktop update service', async () => {
    const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      build: { publish: Array<{ url: string }> }
    }

    expect(packageJson.build.publish.some((entry) => entry.url.includes('dshdesktop.com'))).toBe(false)
  })
})
