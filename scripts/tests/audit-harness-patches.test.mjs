import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const script = fileURLToPath(new URL('../audit-harness-patches.mjs', import.meta.url))
const filename = '@deepseek-ai+fixture+0.1.5-rc.2.patch'
const patch = `diff --git a/node_modules/@deepseek-ai/fixture/index.js b/node_modules/@deepseek-ai/fixture/index.js
--- a/node_modules/@deepseek-ai/fixture/index.js
+++ b/node_modules/@deepseek-ai/fixture/index.js
@@ -1 +1 @@
-export const value = 'before'
+export const value = 'after'
`

async function fixture(t, source = "export const value = 'before'\n") {
  const root = await mkdtemp(join(tmpdir(), 'harness-patch-audit-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const target = join(root, 'node_modules/@deepseek-ai/fixture/index.js')
  await mkdir(join(root, 'patches'))
  await mkdir(join(root, 'node_modules/@deepseek-ai/fixture'), { recursive: true })
  await writeFile(target, source)
  await writeFile(join(root, 'node_modules/@deepseek-ai/fixture/package.json'), JSON.stringify({ name: '@deepseek-ai/fixture', version: '0.1.5-rc.2' }))
  await writeFile(join(root, 'patches', filename), patch)
  return { root, target }
}

function audit(root) {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' })
}

test('audits patch-package paths from the project root without modifying installed files', async (t) => {
  const { root, target } = await fixture(t)
  const result = audit(root)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /APPLIES\s+@deepseek-ai\/fixture/)
  assert.equal(await readFile(target, 'utf8'), "export const value = 'before'\n")
})

test('accepts an already applied patch and leaves its content unchanged', async (t) => {
  const { root, target } = await fixture(t, "export const value = 'after'\n")
  const result = audit(root)
  assert.equal(result.status, 0, result.stdout + result.stderr)
  assert.match(result.stdout, /ALREADY_APPLIED/)
  assert.equal(await readFile(target, 'utf8'), "export const value = 'after'\n")
})

test('fails for incompatible source and prints the failing patch diagnostic', async (t) => {
  const { root } = await fixture(t, "export const changed = 'upstream'\n")
  const result = audit(root)
  assert.equal(result.status, 1)
  assert.match(result.stdout, /NEEDS_MIGRATION/)
  assert.match(result.stderr, /FAILED|failed|Hunk/)
})

test('does not silently pass an empty patch directory', async (t) => {
  const { root } = await fixture(t)
  await rm(join(root, 'patches', filename))
  const result = audit(root)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /no.*patch|没有.*补丁/i)
})

test('does not silently skip unrecognized patch filenames', async (t) => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'patches', 'unrecognized.patch'), patch)
  const result = audit(root)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /unrecognized.patch/)
})

test('rejects a patch whose version differs from the installed package', async (t) => {
  const { root } = await fixture(t)
  await writeFile(join(root, 'node_modules/@deepseek-ai/fixture/package.json'), JSON.stringify({ name: '@deepseek-ai/fixture', version: '0.1.2-rc.1' }))
  const result = audit(root)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /version.*mismatch/i)
})
