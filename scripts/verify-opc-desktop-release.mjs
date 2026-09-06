import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DESKTOP_PROFILE_MANIFEST } from '../packages/opc-profile/index.js'
import { createReleaseManifest } from '../packages/opc-profile/release-manifest.js'

const platform = process.argv[2]
const arch = process.argv[3]
if (platform !== 'win32' || arch !== 'x64') {
  throw new Error('usage: verify-opc-desktop-release.mjs win32 x64')
}

const root = resolve('packages/opc-profile')
const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'))
const manifest = await createReleaseManifest(DESKTOP_PROFILE_MANIFEST, root, {
  version: packageJson.version,
  platform,
  arch
})

await writeFile(
  resolve(root, 'release-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { encoding: 'utf8', mode: 0o644 }
)
