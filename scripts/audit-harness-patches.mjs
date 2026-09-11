import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = process.cwd()
const patchDirectory = resolve(root, 'patches')
const nodeModules = resolve(root, 'node_modules')

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
  const result = spawnSync('patch', ['--dry-run', '--batch', '--forward', '-p1', '-d', nodeModules, '-i', resolve(patchDirectory, patch.filename)], {
    encoding: 'utf8'
  })

  return {
    ...patch,
    applies: result.status === 0,
    detail: (result.stderr || result.stdout || `patch exited ${result.status ?? 'without a status'}`).trim()
  }
}

async function main() {
  const entries = await readdir(patchDirectory)
  const patches = entries.map(parsePatchName).filter(Boolean)
  const results = patches.map(assessPatch)
  const incompatible = results.filter((result) => !result.applies)

  for (const result of results) {
    const status = result.applies ? 'APPLIES' : 'NEEDS_MIGRATION'
    console.log(`${status}\t${result.packageName}\t${result.sourceVersion}\t${result.filename}`)
  }

  if (incompatible.length > 0) {
    console.error(`\n${incompatible.length}/${results.length} desktop core patches need migration before this harness package set can be released.`)
    process.exitCode = 1
  }
}

await main()
