import { spawn } from 'node:child_process'
import { accountKeyFor } from './account-key'
import type { DesktopPrincipal } from '../../shared/account-contracts'

export interface AccountCredential {
  tenantId: string
  userId: string
  sessionId: string
  accessToken: string
}

/**
 * Production wiring supplies a macOS Keychain implementation. Keeping this
 * interface narrow prevents a runtime from ever selecting credentials by an
 * arbitrary file path or another account's identity.
 */
export interface CredentialStore {
  load(principal: DesktopPrincipal): Promise<AccountCredential | undefined>
  save(principal: DesktopPrincipal, credential: AccountCredential): Promise<void>
  remove(principal: DesktopPrincipal): Promise<void>
}

export class InMemoryCredentialStore implements CredentialStore {
  private readonly credentials = new Map<string, AccountCredential>()

  async load(principal: DesktopPrincipal): Promise<AccountCredential | undefined> {
    const credential = this.credentials.get(principal.accountKey)
    return credential ? { ...credential } : undefined
  }

  async save(principal: DesktopPrincipal, credential: AccountCredential): Promise<void> {
    this.credentials.set(principal.accountKey, { ...credential })
  }

  async saveFor(
    principal: Pick<AccountCredential, 'tenantId' | 'userId' | 'sessionId'>,
    credential: AccountCredential
  ): Promise<void> {
    await this.save({ ...principal, accountKey: accountKeyFor(principal.tenantId, principal.userId) }, credential)
  }

  async remove(principal: DesktopPrincipal): Promise<void> {
    this.credentials.delete(principal.accountKey)
  }
}

export interface KeychainCommandResult { stdout: string }
export type KeychainCommand = (
  executable: string,
  args: string[],
  options: { stdin?: string }
) => Promise<KeychainCommandResult>

export interface MacOsKeychainCredentialStoreOptions {
  platform?: NodeJS.Platform
  run?: KeychainCommand
}

/**
 * Stores the opaque desktop session credential in a macOS Keychain generic
 * password item. The token travels over stdin, never argv or application logs.
 */
export class MacOsKeychainCredentialStore implements CredentialStore {
  private readonly platform: NodeJS.Platform
  private readonly run: KeychainCommand
  private static readonly service = 'cc.ohmycode.opc.desktop'

  constructor(options: MacOsKeychainCredentialStoreOptions = {}) {
    this.platform = options.platform ?? process.platform
    this.run = options.run ?? defaultKeychainCommand
  }

  async load(principal: DesktopPrincipal): Promise<AccountCredential | undefined> {
    this.requireMacOs()
    try {
      const result = await this.run('security', [
        'find-generic-password', '-w', '-s', MacOsKeychainCredentialStore.service, '-a', keychainAccount(principal)
      ], {})
      const credential = parseCredential(result.stdout)
      assertCredentialIdentity(principal, credential)
      return credential
    } catch (error) {
      if (isKeychainItemMissing(error)) return undefined
      throw error
    }
  }

  async save(principal: DesktopPrincipal, credential: AccountCredential): Promise<void> {
    this.requireMacOs()
    assertCredentialIdentity(principal, credential)
    await this.run('security', [
      'add-generic-password', '-U', '-s', MacOsKeychainCredentialStore.service, '-a', keychainAccount(principal), '-w'
    ], { stdin: JSON.stringify(credential) })
  }

  async remove(principal: DesktopPrincipal): Promise<void> {
    this.requireMacOs()
    try {
      await this.run('security', [
        'delete-generic-password', '-s', MacOsKeychainCredentialStore.service, '-a', keychainAccount(principal)
      ], {})
    } catch (error) {
      if (!isKeychainItemMissing(error)) throw error
    }
  }

  private requireMacOs(): void {
    if (this.platform !== 'darwin') throw new Error('desktop_keychain_platform_unsupported')
  }
}

function keychainAccount(principal: DesktopPrincipal): string {
  return `tenant:${principal.tenantId}:user:${principal.userId}`
}

function assertCredentialIdentity(principal: DesktopPrincipal, credential: AccountCredential): void {
  if (credential.tenantId !== principal.tenantId || credential.userId !== principal.userId || credential.sessionId !== principal.sessionId || !credential.accessToken) {
    throw new Error('desktop_account_credential_mismatch')
  }
}

function parseCredential(raw: string): AccountCredential {
  try {
    const parsed = JSON.parse(raw) as Partial<AccountCredential>
    if (typeof parsed.tenantId !== 'string' || typeof parsed.userId !== 'string' || typeof parsed.sessionId !== 'string' || typeof parsed.accessToken !== 'string') throw new Error('invalid')
    return { tenantId: parsed.tenantId, userId: parsed.userId, sessionId: parsed.sessionId, accessToken: parsed.accessToken }
  } catch {
    throw new Error('desktop_keychain_credential_invalid')
  }
}

function isKeychainItemMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 44
}

async function defaultKeychainCommand(executable: string, args: string[], options: { stdin?: string }): Promise<KeychainCommandResult> {
  return await new Promise<KeychainCommandResult>((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'ignore'] })
    let stdout = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout += chunk })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) resolve({ stdout })
      else {
        const error = new Error('desktop_keychain_command_failed') as Error & { code?: number }
        error.code = code ?? undefined
        reject(error)
      }
    })
    if (options.stdin) child.stdin.end(options.stdin)
    else child.stdin.end()
  })
}
