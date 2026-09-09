import { spawn } from 'node:child_process'

export interface MacOsKeychainBackend {
  get(service: string, account: string): Promise<string | undefined>
  set(service: string, account: string, value: string): Promise<void>
  remove(service: string, account: string): Promise<void>
}

export interface KeychainHelperResult { stdout: string }
export type KeychainHelperCommand = (
  executable: string,
  args: string[],
  options: { stdin?: string }
) => Promise<KeychainHelperResult>

export interface NativeMacOsKeychainBackendOptions {
  helperPath: string
  run?: KeychainHelperCommand
}

/**
 * Delegates Security.framework calls to a tiny process. A native helper fault
 * cannot take down Electron, and the credential is sent over stdin, not argv.
 */
export class NativeMacOsKeychainBackend implements MacOsKeychainBackend {
  private readonly run: KeychainHelperCommand

  constructor(private readonly options: NativeMacOsKeychainBackendOptions) {
    this.run = options.run ?? defaultHelperCommand
  }

  async get(service: string, account: string): Promise<string | undefined> {
    try {
      return (await this.run(this.options.helperPath, ['get', service, account], {})).stdout
    } catch (error) {
      if (isNotFound(error)) return undefined
      throw error
    }
  }

  async set(service: string, account: string, value: string): Promise<void> {
    await this.run(this.options.helperPath, ['set', service, account], { stdin: value })
  }

  async remove(service: string, account: string): Promise<void> {
    try {
      await this.run(this.options.helperPath, ['remove', service, account], {})
    } catch (error) {
      if (!isNotFound(error)) throw error
    }
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 2
}

async function defaultHelperCommand(executable: string, args: string[], options: { stdin?: string }): Promise<KeychainHelperResult> {
  return await new Promise<KeychainHelperResult>((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'ignore'] })
    let stdout = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout += chunk })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve({ stdout })
      else {
        const error = new Error('desktop_keychain_helper_failed') as Error & { code?: number }
        error.code = code ?? undefined
        reject(error)
      }
    })
    child.stdin.end(options.stdin)
  })
}
