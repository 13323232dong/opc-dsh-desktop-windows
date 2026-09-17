import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const bundle = join(
  process.cwd(),
  'packages',
  'opc-profile',
  'plugins',
  'opc-dsh-assets-workbench-0.1.1.tgz'
)

function packageManifest(): Record<string, unknown> {
  return JSON.parse(execFileSync('tar', ['-xOf', bundle, 'package/package.json'], { encoding: 'utf8' }))
}

describe('packaged assets workbench', () => {
  it('provides the DSH bundle required by the desktop profile', () => {
    const manifest = packageManifest() as { dsh?: { bundle?: { patch?: string } } }
    expect(manifest.dsh?.bundle?.patch).toBe('./cordis.patch.yml')
    expect(execFileSync('tar', ['-tf', bundle], { encoding: 'utf8' })).toContain('package/cordis.patch.yml')
  })
})
