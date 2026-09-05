import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'

export interface EgoLiteAdapterOptions {
  exists?: (path: string) => Promise<boolean>
  launch?: (executablePath: string, args: string[]) => Promise<void>
  platform?: NodeJS.Platform
}

export interface EgoLiteDiscovery {
  available: boolean
  executablePath?: string
}

export interface EgoLiteLaunchRequest {
  executablePath: string
  profileDirectory: string
  initialUrl?: string
  allowedDomains?: readonly string[]
}

/** Minimal, explicit adapter. It never inherits a browser's default profile. */
export class EgoLiteAdapter {
  private readonly exists: (path: string) => Promise<boolean>
  private readonly launchProcess: (executablePath: string, args: string[]) => Promise<void>
  private readonly platform: NodeJS.Platform

  constructor(options: EgoLiteAdapterOptions = {}) {
    this.exists = options.exists ?? executableExists
    this.launchProcess = options.launch ?? spawnDetached
    this.platform = options.platform ?? process.platform
  }

  async discover(configuredPath?: string): Promise<EgoLiteDiscovery> {
    const candidates = configuredPath ? [configuredPath, ...knownEgoLitePaths(this.platform)] : knownEgoLitePaths(this.platform)
    for (const candidate of candidates) if (await this.exists(candidate)) return { available: true, executablePath: candidate }
    return { available: false }
  }

  async launch(request: EgoLiteLaunchRequest): Promise<void> {
    if (!(await this.exists(request.executablePath))) throw new Error('desktop_ego_not_installed')
    if (request.initialUrl && request.allowedDomains) {
      this.assertAllowedUrl(request.initialUrl, request.allowedDomains)
    }
    const args = [`--user-data-dir=${request.profileDirectory}`, '--no-first-run']
    if (request.initialUrl) args.push(request.initialUrl)
    await this.launchProcess(request.executablePath, args)
  }

  assertAllowedUrl(value: string, allowedDomains: readonly string[]): URL {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !allowedDomains.some((domain) => hostname === domain.toLowerCase())
    ) {
      throw new Error('desktop_ego_domain_not_allowed')
    }
    return url
  }
}

export function knownEgoLitePaths(platform: NodeJS.Platform = process.platform): string[] {
  if (platform === 'darwin') return [
    '/Applications/Ego Lite.app/Contents/MacOS/Ego Lite',
    '/Applications/Ego.app/Contents/MacOS/Ego',
    '/usr/local/bin/ego-lite',
    '/opt/homebrew/bin/ego-lite'
  ]
  if (platform === 'win32') return ['C:\\Program Files\\Ego Lite\\Ego Lite.exe']
  return ['/usr/bin/ego-lite', '/usr/local/bin/ego-lite']
}

async function executableExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

async function spawnDetached(executablePath: string, args: string[]): Promise<void> {
  const child = spawn(executablePath, args, { detached: true, stdio: 'ignore', windowsHide: true })
  child.unref()
}
