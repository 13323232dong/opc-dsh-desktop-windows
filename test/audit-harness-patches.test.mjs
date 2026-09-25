import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

const script = resolve(import.meta.dirname, '../scripts/audit-harness-patches.mjs')
const roots = []
const packagePath = 'node_modules/@deepseek-ai/dsh-fixture/lib/index.js'
const patchName = '@deepseek-ai+dsh-fixture+0.1.5-rc.2.patch'
const patch = `diff --git a/${packagePath} b/${packagePath}
--- a/${packagePath}
+++ b/${packagePath}
@@ -1 +1 @@
-export const value = 'before'
+export const value = 'after'
`

async function fixture(content = "export const value = 'before'\n") {
  const root = await mkdtemp(join(tmpdir(), 'harness-patch-audit-'))
  roots.push(root)
  await mkdir(join(root, 'patches'))
  await mkdir(join(root, 'node_modules/@deepseek-ai/dsh-fixture/lib'), { recursive: true })
  await writeFile(join(root, packagePath), content)
  await writeFile(join(root, 'patches', patchName), patch)
  return root
}

function audit(root) {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('harness patch audit', () => {
  it('resolves patch-package paths from the project root and does not modify files', async () => {
    const root = await fixture()
    const result = audit(root)
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toContain('APPLIES\t@deepseek-ai/dsh-fixture')
    expect(await readFile(join(root, packagePath), 'utf8')).toBe("export const value = 'before'\n")
  })

  it('reports actual hunk failures instead of missing-file errors', async () => {
    const root = await fixture("export const value = 'different'\n")
    const result = audit(root)
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('NEEDS_MIGRATION')
    expect(result.stderr).toMatch(/hunk.*fail/i)
    expect(result.stderr).not.toContain('No file to patch')
  })

  it('fails with actionable evidence if the dependency is missing', async () => {
    const root = await fixture()
    await rm(join(root, packagePath))
    const result = audit(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/No file to patch|can't find file/i)
  })

  it('does not report an empty patch inventory as a successful audit', async () => {
    const root = await fixture()
    await rm(join(root, 'patches', patchName))
    const result = audit(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toMatch(/no.*patch/i)
  })
})
