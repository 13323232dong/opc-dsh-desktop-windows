import { readFileSync } from 'node:fs'
import { join } from 'node:path'

interface PackageMetadata {
  version?: unknown
  dependencies?: Record<string, unknown>
}

function readPackageMetadata(path: string): PackageMetadata | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as PackageMetadata
  } catch {
    return undefined
  }
}

function validVersion(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function bundledHarnessVersion(appPath: string): string | undefined {
  const installedMetadata = readPackageMetadata(
    join(appPath, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
  )
  const installedVersion = validVersion(installedMetadata?.version)
  if (installedVersion) return installedVersion

  const appMetadata = readPackageMetadata(join(appPath, 'package.json'))
  return validVersion(appMetadata?.dependencies?.['@deepseek-ai/dsh'])
}

export function aboutDetail(
  desktopVersion: string,
  _harnessVersion: string | undefined,
  locale: 'en' | 'zh'
): string {
  if (locale === 'zh') {
    return `伟东 OPC Desktop 版本：${desktopVersion}\n统一发行版本：${desktopVersion}\n\n桌面端版本统一管理内置 Harness 与插件。`
  }
  return `Weidong OPC Desktop version: ${desktopVersion}\nUnified release version: ${desktopVersion}\n\nThe Desktop release version governs the bundled Harness and plugins.`
}
