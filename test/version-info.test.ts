import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { aboutDetail, bundledHarnessVersion } from '../src/main/version-info'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })))
})

describe('desktop version information', () => {
  it('reports the version of the Harness package that is actually bundled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-version-info-'))
    temporaryRoots.push(root)
    const harnessRoot = join(root, 'node_modules', '@deepseek-ai', 'dsh')
    await mkdir(harnessRoot, { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { '@deepseek-ai/dsh': '0.1.0-rc.7' }
    }))
    await writeFile(join(harnessRoot, 'package.json'), JSON.stringify({
      version: '0.1.0-rc.8'
    }))

    expect(bundledHarnessVersion(root)).toBe('0.1.0-rc.8')
  })

  it('falls back to the app dependency when installed package metadata is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-version-info-'))
    temporaryRoots.push(root)
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { '@deepseek-ai/dsh': '0.1.0-rc.8' }
    }))

    expect(bundledHarnessVersion(root)).toBe('0.1.0-rc.8')
  })

  it('uses the Desktop release as the only product version shown to users', () => {
    const zh = aboutDetail('0.1.1', '0.1.0-rc.8', 'zh')
    const en = aboutDetail('0.1.1', '0.1.0-rc.8', 'en')
    expect(zh).toContain('伟东 OPC Desktop 版本：0.1.1')
    expect(zh).not.toContain('0.1.0-rc.8')
    expect(en).toContain('Weidong OPC Desktop version: 0.1.1')
    expect(en).not.toContain('0.1.0-rc.8')
  })
})
