import { describe, expect, it, vi } from 'vitest'
import { MacOsKeychainCredentialStore } from '../../src/main/accounts/credential-store'

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
  it('uses a tenant and user scoped Keychain account without exposing the token in command arguments', async () => {
    const run = vi.fn(async () => ({ stdout: '' }))
    const store = new MacOsKeychainCredentialStore({ platform: 'darwin', run })

    await store.save(principal, credential)

    expect(run).toHaveBeenCalledWith('security', [
      'add-generic-password', '-U', '-s', 'cc.ohmycode.opc.desktop',
      '-a', 'tenant:tenant-a:user:user-a', '-w'
    ], expect.objectContaining({ stdin: expect.stringContaining('secret-access-token') }))
  })

  it('rejects a credential whose identity does not match the Keychain owner', async () => {
    const run = vi.fn(async () => ({ stdout: JSON.stringify({ ...credential, userId: 'user-b' }) }))
    const store = new MacOsKeychainCredentialStore({ platform: 'darwin', run })

    await expect(store.load(principal)).rejects.toThrow('desktop_account_credential_mismatch')
  })

  it('returns undefined for a missing Keychain item and deletes only the current account item', async () => {
    const missing = vi.fn(async () => {
      const error = new Error('not found') as Error & { code?: number }
      error.code = 44
      throw error
    })
    const store = new MacOsKeychainCredentialStore({ platform: 'darwin', run: missing })
    await expect(store.load(principal)).resolves.toBeUndefined()

    const remove = vi.fn(async () => ({ stdout: '' }))
    await new MacOsKeychainCredentialStore({ platform: 'darwin', run: remove }).remove(principal)
    expect(remove).toHaveBeenCalledWith('security', [
      'delete-generic-password', '-s', 'cc.ohmycode.opc.desktop', '-a', 'tenant:tenant-a:user:user-a'
    ], expect.any(Object))
  })
})
