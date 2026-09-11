import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const CURRENT_VERSION = '0.1.2-rc.1'
const TARGET_VERSION = '0.1.5-rc.2'
const CURRENT_DIRECTORY = `packages/harness-${CURRENT_VERSION}`
const TARGET_DIRECTORY = `packages/harness-${TARGET_VERSION}`

function parseArgs(argv) {
  const source = argv[0]
  if (!source) {
    throw new Error('usage: node scripts/sync-harness-release.mjs <packed-release-root> [--write]')
  }
  return { source: resolve(source), write: argv.includes('--write') }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

function tarballFor(name, sourceValue, available) {
  const currentFile = basename(sourceValue)
  const expected = currentFile.replace(CURRENT_VERSION, TARGET_VERSION)
  if (!available.has(expected)) {
    throw new Error(`missing official ${TARGET_VERSION} tarball for ${name}: expected ${expected}`)
  }
  return expected
}

export async function planHarnessSync(root, packedRoot) {
  const manifest = await readJson(resolve(root, 'package.json'))
  const dshPackages = await readJson(resolve(packedRoot, 'npm-dsh-index.json'))
  const vendorPackages = await readJson(resolve(packedRoot, 'npm-vendor-index.json'))
  const dshAvailable = new Set(dshPackages)
  const vendorAvailable = new Set(vendorPackages)
  const rewrittenDependencies = { ...manifest.dependencies }
  let changed = 0

  for (const [name, value] of Object.entries(manifest.dependencies ?? {})) {
    if (typeof value !== 'string' || !value.includes(CURRENT_DIRECTORY)) continue
    const available = value.includes('/npm-vendor/') ? vendorAvailable : dshAvailable
    const file = tarballFor(name, value, available)
    const section = value.includes('/npm-vendor/') ? 'npm-vendor' : 'npm-dsh'
    rewrittenDependencies[name] = `file:${TARGET_DIRECTORY}/${section}/${file}`
    changed += 1
  }

  if (changed === 0) throw new Error(`no ${CURRENT_VERSION} dependencies were found in package.json`)
  return { manifest, rewrittenDependencies, changed }
}

async function main() {
  const { source, write } = parseArgs(process.argv.slice(2))
  const root = process.cwd()
  const plan = await planHarnessSync(root, source)
  console.log(`validated ${plan.changed} desktop dependency references against DSH ${TARGET_VERSION}`)
  if (!write) return

  const target = resolve(root, TARGET_DIRECTORY)
  await rm(target, { recursive: true, force: true })
  await mkdir(target, { recursive: true })
  await cp(resolve(source, 'npm-dsh'), resolve(target, 'npm-dsh'), { recursive: true })
  await cp(resolve(source, 'npm-vendor'), resolve(target, 'npm-vendor'), { recursive: true })
  await writeFile(resolve(target, 'README.md'), `# Harness ${TARGET_VERSION} local package set\n\nGenerated from the official DeepSeek Harness release pack. See \`docs/harness-0.1.5-compatibility-audit.md\` for the candidate upgrade scope and verification gates.\n`)

  const nextManifest = { ...plan.manifest, dependencies: plan.rewrittenDependencies }
  await writeFile(resolve(root, 'package.json'), `${JSON.stringify(nextManifest, null, 2)}\n`)
  console.log(`wrote ${TARGET_DIRECTORY} and updated package.json`)
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) await main()
