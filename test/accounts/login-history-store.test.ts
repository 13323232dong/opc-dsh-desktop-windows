import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LoginHistoryStore } from '../../src/main/accounts/login-history-store'

describe('LoginHistoryStore', () => {
  it('keeps account labels separate from encrypted remembered passwords', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-login-history-'))
    const cipher = {
      encrypt: async (value: string) => Buffer.from(`encrypted:${value}`),
      decrypt: async (value: Buffer) => value.toString('utf8').replace('encrypted:', '')
    }
    const store = new LoginHistoryStore({ root, cipher })

    try {
      await store.record({ username: 'merchant-a', password: 'secret-password', rememberPassword: true })

      await expect(store.list()).resolves.toEqual([{ username: 'merchant-a', hasPassword: true }])
      await expect(store.loadPassword('MERCHANT-A')).resolves.toBe('secret-password')
      const metadata = await readFile(join(root, 'login-history', 'v2', 'accounts.json'), 'utf8')
      expect(metadata).not.toContain('secret-password')

      await store.clearPassword('merchant-a')
      await expect(store.list()).resolves.toEqual([{ username: 'merchant-a', hasPassword: false }])
      await expect(store.loadPassword('merchant-a')).resolves.toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
