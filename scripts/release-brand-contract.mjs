import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

async function sha256(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

export async function verifyReleaseBrandContract(overrides = {}) {
  const contract = overrides.contract ?? await readJson(path.join(projectRoot, 'build', 'release-brand-contract.json'))
  const packageJson = overrides.packageJson ?? await readJson(path.join(projectRoot, 'package.json'))
  const build = packageJson.build ?? {}

  const assertions = [
    ['productName', build.productName, contract.productName],
    ['artifactName', build.artifactName, contract.macArtifactName],
    ['mac.icon', build.mac?.icon, 'build/icon.icns'],
    ['win.icon', build.win?.icon, 'build/icon.ico'],
    ['nsis.artifactName', build.nsis?.artifactName, contract.windowsArtifactName]
  ]
  for (const [label, actual, expected] of assertions) {
    if (actual !== expected) {
      throw new Error(`release brand contract mismatch: ${label} expected ${expected}, received ${String(actual)}`)
    }
  }

  if (overrides.packageJson === undefined) {
    const iconSha256 = await sha256(path.join(projectRoot, contract.iconSource))
    const logoSha256 = await sha256(path.join(projectRoot, contract.logoSource))
    if (iconSha256 !== contract.iconSha256) {
      throw new Error('release brand contract mismatch: approved app icon changed; update the contract only after visual approval')
    }
    if (logoSha256 !== contract.logoSha256) {
      throw new Error('release brand contract mismatch: approved Evan logo changed; update the contract only after visual approval')
    }
  }

  return {
    productName: contract.productName,
    appName: contract.appName,
    applicationPath: contract.applicationPath,
    iconSha256: contract.iconSha256,
    logoSha256: contract.logoSha256
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await verifyReleaseBrandContract()
  console.log(`Release brand contract verified: ${result.productName}, ${result.iconSha256}`)
}
