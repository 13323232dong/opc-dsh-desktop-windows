import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arch = process.argv[2] ?? 'x64'
if (arch !== 'x64') throw new Error(`Unsupported Windows release architecture: ${arch}`)

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

const resources = path.join(projectRoot, 'dist', 'win-unpacked', 'resources')
const installer = path.join(projectRoot, 'dist', `Evan超级管家-windows-${arch}-setup.exe`)
await Promise.all([
  access(installer),
  access(path.join(resources, 'login.html')),
  access(path.join(resources, 'splash.html')),
  access(path.join(resources, 'evan-super-employee.svg')),
  access(path.join(resources, 'opc-profile', 'release-manifest.json'))
])

const login = await readFile(path.join(resources, 'login.html'), 'utf8')
if (!login.includes('Evan超级管家')) {
  throw new Error('packaged Windows login page does not contain the approved product name')
}
for (const legacyName of ['伟东 OPC', '伟东 OPC Dev', 'Evan-AI管家']) {
  if (login.includes(legacyName)) {
    throw new Error(`packaged Windows login page contains legacy product name: ${legacyName}`)
  }
}

const profileManifest = JSON.parse(
  await readFile(path.join(resources, 'opc-profile', 'release-manifest.json'), 'utf8')
)
for (const plugin of profileManifest.plugins ?? []) {
  if (typeof plugin?.artifact !== 'string' || typeof plugin?.sha256 !== 'string') continue
  const artifact = path.join(resources, 'opc-profile', plugin.artifact)
  await access(artifact)
  if ((await sha256(artifact)) !== plugin.sha256) {
    throw new Error(`packaged Windows plugin artifact is stale: ${plugin.artifact}`)
  }
}

console.log(`Packaged Windows release verified: ${installer}`)
