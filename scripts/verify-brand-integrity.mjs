import { access, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendRoot = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)

const requiredFiles = [
  path.join(projectRoot, 'build', 'app-icon.png'),
  path.join(projectRoot, 'build', 'evan-super-employee.svg'),
  path.join(frontendRoot, 'dsh-desktop-logo.png'),
  path.join(frontendRoot, 'dsh-desktop-evan-logo.svg')
]

for (const file of requiredFiles) {
  await access(file, constants.R_OK)
}

const [client, installer, sourceIcon, installedIcon, sourceLogo, installedLogo] = await Promise.all([
  readFile(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8'),
  readFile(path.join(projectRoot, 'scripts', 'install-brand-assets.mjs'), 'utf8'),
  readFile(requiredFiles[0]),
  readFile(requiredFiles[2]),
  readFile(requiredFiles[1]),
  readFile(requiredFiles[3])
])

const forbidden = ['FishLogo', 'BrandWordmark', 'dsh-desktop-logo-light.png', 'dsh-desktop-logo-dark.png']
for (const token of forbidden) {
  if (client.includes(token)) throw new Error(`desktop client must not reference legacy brand token: ${token}`)
}

if (!client.includes("const PRODUCT_NAME = 'Evan超级管家'")) {
  throw new Error('desktop client must declare the Evan product name')
}
if (!client.includes("const EVAN_LOGO_URL = '/dsh-desktop-evan-logo.svg'")) {
  throw new Error('desktop client must render the packaged Evan logo')
}
if (!installer.includes("'build', 'app-icon.png'") || !installer.includes("'build', 'evan-super-employee.svg'")) {
  throw new Error('brand installer must source the Evan app icon and logo')
}
if (!sourceIcon.equals(installedIcon)) throw new Error('packaged Harness favicon differs from the Evan app icon')
if (!sourceLogo.equals(installedLogo)) throw new Error('packaged Harness logo differs from the Evan source logo')

console.log('Brand integrity verified: Evan icon and UI logo are the only desktop product brand assets.')
