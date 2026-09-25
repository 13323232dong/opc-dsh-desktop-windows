import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const fixtures: string[] = []

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((fixture) => rm(fixture, { recursive: true, force: true })))
})

async function createFixture(packagedLogin?: string) {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'opc-windows-login-'))
  fixtures.push(fixture)
  const resources = path.join(fixture, 'dist', 'win-unpacked', 'resources')
  await Promise.all([
    mkdir(path.join(fixture, 'scripts'), { recursive: true }),
    mkdir(path.join(fixture, 'build'), { recursive: true }),
    mkdir(path.join(resources, 'opc-profile'), { recursive: true })
  ])
  await symlink(path.join(root, 'node_modules'), path.join(fixture, 'node_modules'), 'junction')
  await copyFile(path.join(root, 'scripts', 'verify-packaged-windows-release.mjs'),
    path.join(fixture, 'scripts', 'verify-packaged-windows-release.mjs'))
  const login = await readFile(path.join(root, 'build', 'login.html'), 'utf8')
  const installer = Buffer.from('installer fixture')
  const name = 'Evan超级管家-windows-x64-setup.exe'
  await Promise.all([
    writeFile(path.join(fixture, 'package.json'), JSON.stringify({ version: '1.0.0' })),
    writeFile(path.join(fixture, 'build', 'login.html'), login),
    writeFile(path.join(resources, 'login.html'), packagedLogin ?? login),
    writeFile(path.join(resources, 'splash.html'), ''),
    writeFile(path.join(resources, 'evan-super-employee.svg'), ''),
    writeFile(path.join(resources, 'opc-profile', 'release-manifest.json'), '{"plugins":[]}'),
    writeFile(path.join(fixture, 'dist', name), installer),
    writeFile(path.join(fixture, 'dist', 'latest.yml'), JSON.stringify({
      version: '1.0.0',
      files: [{ url: name, size: installer.length,
        sha512: createHash('sha512').update(installer).digest('base64') }]
    }))
  ])
  return fixture
}

function verify(fixture: string) {
  return execFileSync(process.execPath,
    [path.join(fixture, 'scripts', 'verify-packaged-windows-release.mjs'), 'x64'],
    { encoding: 'utf8', stdio: 'pipe' })
}

describe('packaged Windows login provenance', () => {
  it('accepts a login page identical to the build source', async () => {
    expect(verify(await createFixture())).toContain('Packaged Windows release verified')
  })

  it('rejects an old login page even when its product name is already correct', async () => {
    const fixture = await createFixture('<h1>Evan超级管家</h1><button>登录</button>')
    expect(() => verify(fixture)).toThrow('packaged Windows login page does not match build/login.html')
  })

  it('fails closed when the source login page is unavailable', async () => {
    const fixture = await createFixture()
    await rm(path.join(fixture, 'build', 'login.html'))
    expect(() => verify(fixture)).toThrow('ENOENT')
  })
})
