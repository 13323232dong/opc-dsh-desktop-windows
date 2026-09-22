import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { finalizeRelease } from './finalize-windows-release.mjs'

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const result = await finalizeRelease(resolve('dist'), packageJson.version)
console.log(`Finalized packaged Windows update metadata for ${result.installer}.`)
