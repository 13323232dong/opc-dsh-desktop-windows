import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { LoginHistoryStore } from '../../src/main/accounts/login-history-store'

function secretStore() {
  const values = new Map<string, string>()
  return {
    values,
    get: vi.fn(async (account: string) => values.get(account)),
    set: vi.fn(async (account: string, value: string) => { values.set(account, value) }),
    remove: vi.fn(async (account: string) => { values.delete(account) })
  }
}

describe('LoginHistoryStore', () => {
  it('remembers the newest account while keeping its password out of metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const secrets = secretStore()
    const store = new LoginHistoryStore({ root, secrets })
    try {
      await store.record({ username: ' Test7 ', password: 'secret-password', rememberPassword: true })

      await expect(store.list()).resolves.toEqual([{ username: 'Test7', hasPassword: true }])
      await expect(store.loadPassword('test7')).resolves.toBe('secret-password')
      expect(await readFile(join(root, 'login-history', 'v1', 'accounts.json'), 'utf8')).not.toContain('secret-password')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('retains the account but clears the password when remember password is disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const secrets = secretStore()
    const store = new LoginHistoryStore({ root, secrets })
    try {
      await store.record({ username: 'test7', password: 'old-password', rememberPassword: true })
      await store.record({ username: 'test7', password: 'new-password', rememberPassword: false })

      await expect(store.list()).resolves.toEqual([{ username: 'test7', hasPassword: false }])
      await expect(store.loadPassword('test7')).resolves.toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('serializes concurrent updates and caps retained accounts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const secrets = secretStore()
    const store = new LoginHistoryStore({ root, secrets, maximumEntries: 2 })
    try {
      await Promise.all([
        store.record({ username: 'one', password: 'one-password', rememberPassword: true }),
        store.record({ username: 'two', password: 'two-password', rememberPassword: true }),
        store.record({ username: 'three', password: 'three-password', rememberPassword: true })
      ])

      await expect(store.list()).resolves.toEqual([
        { username: 'three', hasPassword: true },
        { username: 'two', hasPassword: true }
      ])
      expect(secrets.values.has('username:one')).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects traversal-like usernames before reading secrets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const secrets = secretStore()
    const store = new LoginHistoryStore({ root, secrets })
    try {
      await expect(store.loadPassword('../escape')).rejects.toThrow('desktop_login_history_username_invalid')
      expect(secrets.get).not.toHaveBeenCalled()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
