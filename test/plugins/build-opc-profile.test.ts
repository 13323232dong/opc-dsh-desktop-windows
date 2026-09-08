import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const roots: string[] = []

describe('build-opc-profile script', () => {
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('writes the validated immutable profile declaration without copying plugin packages', async () => {
    const output = await mkdtemp(join(tmpdir(), 'opc-profile-output-'))
    roots.push(output)

    const result = spawnSync(process.execPath, ['scripts/plugins/build-opc-profile.mjs', '--out', output], {
      cwd: process.cwd(),
      encoding: 'utf8'
    })

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    const manifest = JSON.parse(await readFile(join(output, 'opc-desktop-profile.json'), 'utf8'))
    expect(manifest.id).toBe('opc-desktop')
    expect(manifest.plugins).toContainEqual(expect.objectContaining({ name: '@opc/dsh-brand' }))
  })

  it('blocks a client bundle that imports a Node-only module', async () => {
    const output = await mkdtemp(join(tmpdir(), 'opc-profile-output-'))
    roots.push(output)
    const client = join(output, 'client.js')
    await writeFile(client, 'import { readFile } from "node:fs/promises"')

    const result = spawnSync(process.execPath, [
      'scripts/plugins/build-opc-profile.mjs', '--out', output, '--client', client
    ], { cwd: process.cwd(), encoding: 'utf8' })

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('Node-only imports')
  })
})
