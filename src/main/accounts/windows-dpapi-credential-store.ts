import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { isAccountKey } from './account-key'
import type { AccountCredential, CredentialStore } from './credential-store'
import type { DesktopPrincipal } from '../../shared/account-contracts'

/**
 * The Electron main process supplies this adapter with `safeStorage`.
 * It uses Keychain on macOS and DPAPI on Windows, while keeping Electron out
 * of this module so persistence and principal-boundary rules stay testable.
 */
export interface WindowsCredentialCodec {
  encryptString(value: string): Promise<Buffer>
  decryptString(value: Buffer): Promise<string>
}

export interface WindowsDpapiCredentialStoreOptions {
  root: string
  codec: WindowsCredentialCodec
}

/**
 * Persists only an opaque desktop session. Electron safeStorage delegates to
 * Keychain on macOS and Windows DPAPI on Windows, so another OS user cannot
 * decrypt this account file.
 */
export class ElectronSafeStorageCredentialStore implements CredentialStore {
  constructor(private readonly options: WindowsDpapiCredentialStoreOptions) {}

  async load(principal: DesktopPrincipal): Promise<AccountCredential | undefined> {
    const path = this.pathFor(principal)
    let encoded: string
    try {
      encoded = await readFile(path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
      throw error
    }

    let credential: AccountCredential
    try {
      const encrypted = Buffer.from(encoded.trim(), 'base64')
      if (encrypted.length === 0) throw new Error('empty')
      credential = parseCredential(await this.options.codec.decryptString(encrypted))
    } catch {
      throw new Error('desktop_windows_credential_unreadable')
    }
    assertCredentialIdentity(principal, credential)
    return credential
  }

  async save(principal: DesktopPrincipal, credential: AccountCredential): Promise<void> {
    assertCredentialIdentity(principal, credential)
    const path = this.pathFor(principal)
    const encrypted = await this.options.codec.encryptString(JSON.stringify(credential))
    if (encrypted.length === 0) throw new Error('desktop_windows_credential_unreadable')
    await mkdir(dirname(path), { recursive: true })
    const temporary = `${path}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`
    await writeFile(temporary, `${encrypted.toString('base64')}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    await rename(temporary, path)
  }

  async remove(principal: DesktopPrincipal): Promise<void> {
    try {
      await rm(this.pathFor(principal), { force: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }

  private pathFor(principal: DesktopPrincipal): string {
    if (!isAccountKey(principal.accountKey)) throw new Error('desktop_account_key_invalid')
    return join(this.options.root, 'credentials', 'v1', `${principal.accountKey}.bin`)
  }
}

/** @deprecated Use ElectronSafeStorageCredentialStore for new platform wiring. */
export class WindowsDpapiCredentialStore extends ElectronSafeStorageCredentialStore {}

function assertCredentialIdentity(principal: DesktopPrincipal, credential: AccountCredential): void {
  if (
    credential.tenantId !== principal.tenantId ||
    credential.userId !== principal.userId ||
    credential.sessionId !== principal.sessionId ||
    credential.accessToken.length === 0
  ) throw new Error('desktop_account_credential_mismatch')
}

function parseCredential(raw: string): AccountCredential {
  try {
    const parsed = JSON.parse(raw) as Partial<AccountCredential>
    if (
      typeof parsed.tenantId !== 'string' ||
      typeof parsed.userId !== 'string' ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.accessToken !== 'string'
    ) throw new Error('invalid')
    return {
      tenantId: parsed.tenantId,
      userId: parsed.userId,
      sessionId: parsed.sessionId,
      accessToken: parsed.accessToken
    }
  } catch {
    throw new Error('desktop_windows_credential_unreadable')
  }
}
