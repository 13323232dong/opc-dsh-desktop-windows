import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { LoginHistoryStore, SafeStorageLoginSecretStore } from '../../src/main/accounts/login-history-store'

function createSecretBackend() {
  const values = new Map<string, string>()
  return {
    values,
    backend: {
      get: vi.fn(async (account: string) => values.get(account)),
      set: vi.fn(async (account: string, value: string) => { values.set(account, value) }),
      remove: vi.fn(async (account: string) => { values.delete(account) })
    }
  }
}

describe('LoginHistoryStore', () => {
  it('lists the newest remembered account without writing its password to metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const { backend } = createSecretBackend()
    const store = new LoginHistoryStore({ root, secrets: backend })
    try {
      await store.record({ username: ' Test7 ', password: 'secret-password', rememberPassword: true })

      await expect(store.list()).resolves.toEqual([{ username: 'Test7', hasPassword: true }])
      await expect(store.loadPassword('test7')).resolves.toBe('secret-password')
      expect(await readFile(join(root, 'login-history', 'v1', 'accounts.json'), 'utf8')).not.toContain('secret-password')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps the account but removes its saved password when remembering is disabled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const { backend } = createSecretBackend()
    const store = new LoginHistoryStore({ root, secrets: backend })
    try {
      await store.record({ username: 'test7', password: 'old-password', rememberPassword: true })
      await store.record({ username: 'test7', password: 'new-password', rememberPassword: false })

      await expect(store.list()).resolves.toEqual([{ username: 'test7', hasPassword: false }])
      await expect(store.loadPassword('test7')).resolves.toBeUndefined()
      expect(backend.remove).toHaveBeenCalledOnce()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('bounds account history and rejects invalid account lookups', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const { backend } = createSecretBackend()
    const store = new LoginHistoryStore({ root, secrets: backend, maximumEntries: 3 })
    try {
      for (const username of ['one', 'two', 'three', 'four']) {
        await store.record({ username, password: `${username}-password`, rememberPassword: true })
      }

      await expect(store.list()).resolves.toEqual([
        { username: 'four', hasPassword: true },
        { username: 'three', hasPassword: true },
        { username: 'two', hasPassword: true }
      ])
      await expect(store.loadPassword('../escape')).rejects.toThrow('desktop_login_history_username_invalid')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('serializes concurrent records so the last request wins without leaving a stale password', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const { backend, values } = createSecretBackend()
    let releaseFirstWrite!: () => void
    backend.set.mockImplementationOnce(async (account: string, value: string) => {
      await new Promise<void>((resolve) => { releaseFirstWrite = resolve })
      values.set(account, value)
    })
    const store = new LoginHistoryStore({ root, secrets: backend })
    try {
      const remember = store.record({ username: 'test7', password: 'old-password', rememberPassword: true })
      await vi.waitFor(() => expect(releaseFirstWrite).toBeTypeOf('function'))
      const forget = store.record({ username: 'test7', password: 'new-password', rememberPassword: false })
      releaseFirstWrite()
      await Promise.all([remember, forget])

      await expect(store.list()).resolves.toEqual([{ username: 'test7', hasPassword: false }])
      await expect(store.loadPassword('test7')).resolves.toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('clears a saved password while retaining the cached account', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const { backend } = createSecretBackend()
    const store = new LoginHistoryStore({ root, secrets: backend })
    try {
      await store.record({ username: 'test7', password: 'secret-password', rememberPassword: true })
      await store.clearPassword('test7')

      await expect(store.list()).resolves.toEqual([{ username: 'test7', hasPassword: false }])
      await expect(store.loadPassword('test7')).resolves.toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('SafeStorageLoginSecretStore', () => {
  it('stores Windows login passwords only as OS-protected ciphertext', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-secrets-'))
    const safeStorage = {
      isEncryptionAvailable: () => true,
      encryptString: (value: string) => Buffer.from(Buffer.from(value).toString('base64')),
      decryptString: (value: Buffer) => Buffer.from(value.toString(), 'base64').toString('utf8')
    }
    const store = new SafeStorageLoginSecretStore({ root, safeStorage })
    try {
      await store.set('username:test7', 'secret-password')
      await expect(store.get('username:test7')).resolves.toBe('secret-password')
      const secretDirectory = join(root, 'login-history', 'v1', 'secrets')
      const [secretFile] = await readdir(secretDirectory)
      expect(secretFile).toMatch(/^[a-f0-9]{64}\.bin$/u)
      expect(await readFile(join(secretDirectory, secretFile!), 'utf8')).not.toContain('secret-password')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
