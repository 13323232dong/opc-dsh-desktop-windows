import { readdir } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()
const patchDirectory = resolve(root, 'patches')

function parsePatchName(filename) {
  const match = /^@deepseek-ai\+(.+)\+(\d+\.\d+\.\d+(?:-[^.]+(?:\.\d+)?)?)\.patch$/u.exec(filename)
  if (!match) return undefined

  return {
    filename,
    packageName: `@deepseek-ai/${match[1]}`,
    sourceVersion: match[2]
  }
}

function checkPatch(patch, reverse = false) {
  // patch-package paths already contain node_modules after stripping a/ or b/.
  const result = spawnSync('patch', ['--dry-run', '--batch', '--forward', '--fuzz=0', ...(reverse ? ['--reverse'] : []), '-p1', '-d', root, '-i', resolve(patchDirectory, patch.filename)], {
    encoding: 'utf8'
  })

  return {
    ok: result.status === 0,
    detail: [result.error?.message, result.stdout, result.stderr].filter(Boolean).join('\n').trim()
      || `patch exited ${result.status ?? 'without a status'}`
  }
}

function assessPatch(patch) {
  try {
    const installed = JSON.parse(readFileSync(resolve(root, 'node_modules', patch.packageName, 'package.json'), 'utf8'))
    if (installed.version !== patch.sourceVersion) {
      return { ...patch, status: 'NEEDS_MIGRATION', detail: `Package version mismatch: patch ${patch.sourceVersion}, installed ${installed.version ?? 'unknown'}` }
    }
  } catch (error) {
    return { ...patch, status: 'NEEDS_MIGRATION', detail: `Cannot verify installed package: ${error instanceof Error ? error.message : String(error)}` }
  }
  const forward = checkPatch(patch)
  const reverse = forward.ok ? undefined : checkPatch(patch, true)

  return {
    ...patch,
    status: forward.ok ? 'APPLIES' : reverse?.ok ? 'ALREADY_APPLIED' : 'NEEDS_MIGRATION',
    detail: forward.detail
  }
}

async function main() {
  const entries = (await readdir(patchDirectory)).filter((entry) => entry.endsWith('.patch')).sort()
  const unknown = entries.filter((entry) => !parsePatchName(entry))
  if (entries.length === 0 || unknown.length > 0) {
    console.error(entries.length === 0 ? 'No desktop core patches found; audit cannot pass.' : `Unrecognized patch filenames: ${unknown.join(', ')}`)
    process.exitCode = 1
    return
  }
  const patches = entries.map(parsePatchName).filter(Boolean)
  const results = patches.map(assessPatch)
  const incompatible = results.filter((result) => result.status === 'NEEDS_MIGRATION')

  for (const result of results) {
    console.log(`${result.status}\t${result.packageName}\t${result.sourceVersion}\t${result.filename}`)
    if (result.status === 'NEEDS_MIGRATION') console.error(`${result.filename}:\n${result.detail}\n`)
  }

  if (incompatible.length > 0) {
    console.error(`\n${incompatible.length}/${results.length} desktop core patches need migration before this harness package set can be released.`)
    process.exitCode = 1
  }
}

await main()
