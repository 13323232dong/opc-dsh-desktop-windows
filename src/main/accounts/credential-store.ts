import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { accountKeyFor } from './account-key'
import type { MacOsKeychainBackend } from './macos-keychain'
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

export interface SafeStorageAdapter {
  isEncryptionAvailable(): boolean
  encryptString(value: string): Buffer
  decryptString(value: Buffer): string
}

export interface ElectronSafeStorageCredentialStoreOptions {
  root: string
  safeStorage: SafeStorageAdapter
}

/**
 * Electron safeStorage uses the macOS Keychain as its encryption-key backend.
 * The opaque OPC session is stored only as ciphertext and never passed to an
 * external command, which avoids exposing it through process arguments.
 */
export class ElectronSafeStorageCredentialStore implements CredentialStore {
  constructor(private readonly options: ElectronSafeStorageCredentialStoreOptions) {}

  async load(principal: DesktopPrincipal): Promise<AccountCredential | undefined> {
    this.assertAvailable()
    try {
      const encrypted = await readFile(this.pathFor(principal))
      const credential = parseCredential(this.options.safeStorage.decryptString(encrypted))
      assertCredentialIdentity(principal, credential)
      return credential
    } catch (error) {
      if (isFileMissing(error)) return undefined
      throw error
    }
  }

  async save(principal: DesktopPrincipal, credential: AccountCredential): Promise<void> {
    this.assertAvailable()
    assertCredentialIdentity(principal, credential)
    const destination = this.pathFor(principal)
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
    const temporary = `${destination}.${process.pid}.tmp`
    await writeFile(temporary, this.options.safeStorage.encryptString(JSON.stringify(credential)), { mode: 0o600 })
    await rename(temporary, destination)
  }

  async remove(principal: DesktopPrincipal): Promise<void> {
    try { await rm(this.pathFor(principal), { force: true }) } catch { /* Logout must still complete locally. */ }
  }

  private assertAvailable(): void {
    if (!this.options.safeStorage.isEncryptionAvailable()) throw new Error('desktop_keychain_unavailable')
  }

  private pathFor(principal: DesktopPrincipal): string {
    return join(this.options.root, 'credentials', 'v1', `${principal.accountKey}.bin`)
  }
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

export interface MacOsKeychainCredentialStoreOptions {
  platform?: NodeJS.Platform
  backend?: MacOsKeychainBackend
}

/**
 * Stores the opaque desktop session credential in a macOS Keychain generic
 * password item. The token travels over stdin, never argv or application logs.
 */
export class MacOsKeychainCredentialStore implements CredentialStore {
  private readonly platform: NodeJS.Platform
  private readonly backend: MacOsKeychainBackend
  private static readonly service = 'cc.ohmycode.opc.desktop'

  constructor(options: MacOsKeychainCredentialStoreOptions = {}) {
    this.platform = options.platform ?? process.platform
    if (!options.backend) throw new Error('desktop_keychain_backend_required')
    this.backend = options.backend
  }

  async load(principal: DesktopPrincipal): Promise<AccountCredential | undefined> {
    this.requireMacOs()
    const raw = await this.backend.get(MacOsKeychainCredentialStore.service, keychainAccount(principal))
    if (raw === undefined) return undefined
    const credential = parseCredential(raw)
    assertCredentialIdentity(principal, credential)
    return credential
  }

  async save(principal: DesktopPrincipal, credential: AccountCredential): Promise<void> {
    this.requireMacOs()
    assertCredentialIdentity(principal, credential)
    await this.backend.set(MacOsKeychainCredentialStore.service, keychainAccount(principal), JSON.stringify(credential))
  }

  async remove(principal: DesktopPrincipal): Promise<void> {
    this.requireMacOs()
    await this.backend.remove(MacOsKeychainCredentialStore.service, keychainAccount(principal))
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

function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT'
}
