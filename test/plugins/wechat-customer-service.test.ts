import { describe, expect, it } from 'vitest'
import { DESKTOP_PROFILE_MANIFEST, OPC_PLUGIN_COMPATIBILITY_MATRIX } from '../../packages/opc-profile/index.js'
import { OPC_DESKTOP_PLUGINS } from '../../src/main/state/opc-profile-bootstrap'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

describe('desktop WeChat customer service', () => {
  it('ships the second brain retrieval dependency in both profile and bootstrap', () => {
    expect(DESKTOP_PROFILE_MANIFEST.plugins.find(p => p.name === '@opc/dsh-second-brain')).toMatchObject({version:'0.1.3'});
    expect(OPC_DESKTOP_PLUGINS.some(p => p[0] === '@opc/dsh-second-brain')).toBe(true);
  })
  it('registers one portable runtime and client with an explicit unsupported Windows adapter', () => {
    const plugins = DESKTOP_PROFILE_MANIFEST.plugins.filter(p => p.name === '@opc/DSH-ai-customer-service')
    expect(plugins).toHaveLength(1)
    if (!plugins[0]) throw new Error('customer service profile missing')
    expect(plugins[0]).toMatchObject({ version: '0.1.7', client: true, artifact: 'plugins/opc-DSH-ai-customer-service-0.1.7.tgz' })
    expect(OPC_PLUGIN_COMPATIBILITY_MATRIX.find(p => p.name === '@opc/DSH-ai-customer-service')).toMatchObject({ windowsDisposition: 'requires-native-adapter' })
    const plugin = plugins[0]
    expect(OPC_DESKTOP_PLUGINS.find(p => p[0] === plugin.name)?.[1]).toBe(plugin.artifact.replace('plugins/', ''))
  })
  it('pins the new customer-service and Agent Teams packages to the shipped artifact hashes', async () => {
    const root = resolve('packages/opc-profile')
    const manifest = JSON.parse(await readFile(resolve(root, 'release-manifest.json'), 'utf8'))
    for (const name of ['@opc/DSH-ai-customer-service', '@opc/dsh-second-brain', '@nanmicoder/dsh-agent-teams']) {
      const profile = DESKTOP_PROFILE_MANIFEST.plugins.find(p => p.name === name)
      const release = manifest.plugins.find((p: { name: string }) => p.name === name)
      expect(release).toBeDefined()
      expect(release).toMatchObject({ name, version: profile?.version, artifact: profile?.artifact })
      const digest = createHash('sha256').update(await readFile(resolve(root, release.artifact))).digest('hex')
      expect(release.sha256).toBe(digest)
    }
  })
  it('ships the permission tool and a callable AI customer-service tab label', () => {
    const artifact = resolve(
      'packages/opc-profile/plugins/opc-DSH-ai-customer-service-0.1.7.tgz'
    )
    const runtime = execFileSync(
      'tar',
      ['-xOf', artifact, 'package/src/index.mjs'],
      { encoding: 'utf8' }
    )
    const client = execFileSync(
      'tar',
      ['-xOf', artifact, 'package/src/client.jsx'],
      { encoding: 'utf8' }
    )
    const clientBundle = execFileSync(
      'tar',
      ['-xOf', artifact, 'package/lib/client.js'],
      { encoding: 'utf8' }
    )

    expect(runtime).toContain("['request_accessibility'")
    expect(runtime).toContain('wechat_customer_service_request_accessibility')
    expect(client).toContain("label:()=>'AI 客服'")
    expect(client).toContain("act('request-accessibility',{})")
    expect(clientBundle).toMatch(
      /^window\.__ModuleLoader__\.load\(\{ id: "@opc\/DSH-ai-customer-service", factory: \(require\) => \{/
    )
    expect(clientBundle).toContain('return module.exports;')
    const pluginManifest = JSON.parse(
      execFileSync('tar', ['-xOf', artifact, 'package/package.json'], { encoding: 'utf8' })
    )
    expect(pluginManifest.exports['./package.json']).toBe('./package.json')
  })
})
