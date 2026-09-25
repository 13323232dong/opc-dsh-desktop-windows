import { createHash } from 'node:crypto'
import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const arch = process.argv[2] ?? 'x64'
if (arch !== 'x64') throw new Error(`Unsupported Windows release architecture: ${arch}`)

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

async function sha512(file) {
  return createHash('sha512').update(await readFile(file)).digest('base64')
}

const resources = path.join(projectRoot, 'dist', 'win-unpacked', 'resources')
const installer = path.join(projectRoot, 'dist', `Evan超级管家-windows-${arch}-setup.exe`)
await Promise.all([
  access(installer),
  access(path.join(projectRoot, 'dist', 'latest.yml')),
  access(path.join(resources, 'login.html')),
  access(path.join(resources, 'splash.html')),
  access(path.join(resources, 'evan-super-employee.svg')),
  access(path.join(resources, 'opc-profile', 'release-manifest.json'))
])

const metadata = parse(await readFile(path.join(projectRoot, 'dist', 'latest.yml'), 'utf8'))
const packageJson = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'))
const entry = metadata?.files?.find((file) => file?.url === path.basename(installer))
const installerStat = await stat(installer)
if (
  metadata?.version !== packageJson.version ||
  !entry ||
  entry.size !== installerStat.size ||
  entry.sha512 !== (await sha512(installer))
) {
  throw new Error('packaged Windows latest.yml does not match the installer')
}

const login = await readFile(path.join(resources, 'login.html'), 'utf8')
if (
  (await sha256(path.join(resources, 'login.html'))) !==
  (await sha256(path.join(projectRoot, 'build', 'login.html')))
) {
  throw new Error('packaged Windows login page does not match build/login.html')
}
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
