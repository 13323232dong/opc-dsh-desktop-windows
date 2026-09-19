import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { verifyReleaseBrandContract } from './release-brand-contract.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

const arch = process.argv[2] ?? process.arch
const contract = await verifyReleaseBrandContract()
const app = path.join(projectRoot, 'dist', `mac-${arch}`, contract.appName)
const resources = path.join(app, 'Contents', 'Resources')
const expectedArtifacts = [
  path.join(projectRoot, 'dist', `Evan超级管家-mac-${arch}.dmg`),
  path.join(projectRoot, 'dist', `Evan超级管家-mac-${arch}.zip`)
]

for (const target of [app, ...expectedArtifacts]) await access(target)

const packagedPng = await sha256(path.join(resources, 'icon.png'))
if (packagedPng !== contract.iconSha256) {
  throw new Error(`packaged icon.png is not the approved icon: ${packagedPng}`)
}

const generatedIcns = await sha256(path.join(projectRoot, 'build', 'icon.icns'))
const packagedIcns = await sha256(path.join(resources, 'icon.icns'))
if (packagedIcns !== generatedIcns) {
  throw new Error(`packaged icon.icns is stale: expected ${generatedIcns}, received ${packagedIcns}`)
}

const login = await readFile(path.join(resources, 'login.html'), 'utf8')
if (!login.includes(contract.productName)) throw new Error('packaged login page does not contain the approved product name')
for (const legacyName of ['伟东 OPC', '伟东 OPC Dev', 'Evan-AI管家']) {
  if (login.includes(legacyName)) throw new Error(`packaged login page contains legacy product name: ${legacyName}`)
}

console.log(`Packaged macOS release verified: ${app}`)
