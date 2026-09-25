import { readdir } from 'node:fs/promises'
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

function assessPatch(patch) {
  // patch-package paths include node_modules; strip only the a/ or b/ prefix.
  const result = spawnSync('patch', ['--dry-run', '--batch', '--forward', '-p1', '-d', root, '-i', resolve(patchDirectory, patch.filename)], {
    encoding: 'utf8'
  })

  return {
    ...patch,
    applies: result.status === 0,
    detail: [result.error?.message, result.stderr, result.stdout].filter(Boolean).join('\n').trim()
      || `patch exited ${result.status ?? 'without a status'}`
  }
}

async function main() {
  const entries = await readdir(patchDirectory)
  const patches = entries.sort().map(parsePatchName).filter(Boolean)
  if (patches.length === 0) {
    console.error('No recognized desktop core patches found; compatibility has not been audited.')
    process.exitCode = 1
    return
  }
  const results = patches.map(assessPatch)
  const incompatible = results.filter((result) => !result.applies)

  for (const result of results) {
    const status = result.applies ? 'APPLIES' : 'NEEDS_MIGRATION'
    console.log(`${status}\t${result.packageName}\t${result.sourceVersion}\t${result.filename}`)
    if (!result.applies) console.error(`\n${result.filename}:\n${result.detail}`)
  }

  if (incompatible.length > 0) {
    console.error(`\n${incompatible.length}/${results.length} desktop core patches need migration before this harness package set can be released.`)
    process.exitCode = 1
  }
}

await main()
