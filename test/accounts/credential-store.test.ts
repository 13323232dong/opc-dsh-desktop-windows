import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { ElectronSafeStorageCredentialStore, MacOsKeychainCredentialStore } from '../../src/main/accounts/credential-store'
import { NativeMacOsKeychainBackend } from '../../src/main/accounts/macos-keychain'

const principal = {
  tenantId: 'tenant-a',
  userId: 'user-a',
  sessionId: 'session-a',
  accountKey: 'a'.repeat(64)
}

const credential = {
  tenantId: principal.tenantId,
  userId: principal.userId,
  sessionId: principal.sessionId,
  accessToken: 'secret-access-token'
}

describe('MacOsKeychainCredentialStore', () => {
  it('uses a tenant and user scoped native Keychain entry', async () => {
    const backend = { get: vi.fn(), set: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) }
    const store = new MacOsKeychainCredentialStore({ platform: 'darwin', backend })

    await store.save(principal, credential)

    expect(backend.set).toHaveBeenCalledWith(
      'cc.ohmycode.opc.desktop',
      'tenant:tenant-a:user:user-a',
      JSON.stringify(credential)
    )
  })

  it('rejects a credential whose identity does not match the Keychain owner', async () => {
    const backend = { get: vi.fn(async () => JSON.stringify({ ...credential, userId: 'user-b' })), set: vi.fn(), remove: vi.fn() }
    const store = new MacOsKeychainCredentialStore({ platform: 'darwin', backend })

    await expect(store.load(principal)).rejects.toThrow('desktop_account_credential_mismatch')
  })

  it('returns undefined for a missing Keychain item and deletes only the current account item', async () => {
    const backend = { get: vi.fn(async () => undefined), set: vi.fn(), remove: vi.fn(async () => undefined) }
    const store = new MacOsKeychainCredentialStore({ platform: 'darwin', backend })
    await expect(store.load(principal)).resolves.toBeUndefined()

    await store.remove(principal)
    expect(backend.remove).toHaveBeenCalledWith('cc.ohmycode.opc.desktop', 'tenant:tenant-a:user:user-a')
  })

  it.runIf(process.platform === 'darwin')('round-trips an opaque credential through the real macOS Keychain API', async () => {
    const backend = new NativeMacOsKeychainBackend({ helperPath: join(process.cwd(), 'build', 'opc-keychain-helper') })
    const account = `integration:${randomUUID()}`
    const value = JSON.stringify({ ...credential, accessToken: `opaque-${randomUUID()}` })
    try {
      await backend.set('cc.ohmycode.opc.desktop.test', account, value)
      await expect(backend.get('cc.ohmycode.opc.desktop.test', account)).resolves.toBe(value)
    } finally {
      await backend.remove('cc.ohmycode.opc.desktop.test', account)
    }
  })
})

describe('ElectronSafeStorageCredentialStore', () => {
  it('stores an opaque session as Keychain-backed ciphertext rather than plaintext', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-desktop-credentials-'))
    const safeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: (value: string) => Buffer.from(Buffer.from(value).toString('base64')),
      decryptString: (value: Buffer) => Buffer.from(value.toString(), 'base64').toString('utf8')
    }
    try {
      const store = new ElectronSafeStorageCredentialStore({ root, safeStorage })
      await store.save(principal, credential)
      await expect(store.load(principal)).resolves.toEqual(credential)
      const contents = await readFile(join(root, 'credentials', 'v1', `${principal.accountKey}.bin`), 'utf8')
      expect(contents).not.toContain(credential.accessToken)
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})

describe('desktop credential-store wiring', () => {
  it('uses native Keychain on macOS and safeStorage on Windows', async () => {
    const main = await readFile('src/main/index.ts', 'utf8')

    expect(main).toContain('new MacOsKeychainCredentialStore({')
    expect(main).toContain("new NativeMacOsKeychainBackend({ helperPath: desktopResourcePath('opc-keychain-helper') })")
    expect(main).toContain("process.platform === 'darwin'")
    expect(main).toContain('new ElectronSafeStorageCredentialStore({')
  })
})
