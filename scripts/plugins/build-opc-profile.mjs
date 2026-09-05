import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  DESKTOP_PROFILE_MANIFEST,
  scanClientBundleSource,
  validateDesktopProfile
} from '../../packages/opc-profile/index.js'

function parseArguments(argv) {
  const index = argv.indexOf('--out')
  if (index < 0 || !argv[index + 1]) throw new Error('usage: build-opc-profile.mjs --out <directory>')
  const clients = []
  for (let position = 0; position < argv.length; position += 1) {
    if (argv[position] !== '--client') continue
    const file = argv[position + 1]
    if (!file) throw new Error('missing file after --client')
    clients.push(resolve(file))
    position += 1
  }
  return { output: resolve(argv[index + 1]), clients }
}

const { output, clients } = parseArguments(process.argv.slice(2))
const issues = validateDesktopProfile(DESKTOP_PROFILE_MANIFEST)
if (issues.length) throw new Error(`invalid OPC desktop profile: ${issues.join('; ')}`)

const clientFindings = (await Promise.all(clients.map(async (file) => (
  scanClientBundleSource(file, await readFile(file, 'utf8'))
)))).flat()
if (clientFindings.length) {
  throw new Error(`client bundles contain Node-only imports: ${clientFindings.map((finding) => `${finding.file} -> ${finding.module}`).join(', ')}`)
}

await mkdir(output, { recursive: true })
await writeFile(
  resolve(output, 'opc-desktop-profile.json'),
  `${JSON.stringify(DESKTOP_PROFILE_MANIFEST, null, 2)}\n`,
  { encoding: 'utf8', mode: 0o644 }
)
