import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { accountKeyFor } from '../../src/main/accounts/account-key'
import { AccountStorage } from '../../src/main/accounts/account-storage'

const roots: string[] = []

async function testRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'opc-account-storage-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('AccountStorage', () => {
  it('creates an isolated account tree and atomically persists its owner metadata', async () => {
    const root = await testRoot()
    const storage = new AccountStorage(root, () => new Date('2026-09-06T10:00:00.000Z'))
    const accountKey = accountKeyFor('tenant-a', 'user-a')

    const layout = await storage.open({ accountKey, tenantId: 'tenant-a', userId: 'user-a' })

    expect(layout.root).toBe(join(root, 'accounts', 'v1', accountKey))
    expect(layout.dshHome).toBe(join(layout.root, 'dsh-home'))
    expect(layout.workspace).toBe(join(layout.root, 'workspace'))
    expect(JSON.parse(await readFile(layout.ownerPath, 'utf8'))).toMatchObject({
      schemaVersion: 1,
      accountKey,
      tenantId: 'tenant-a',
      userId: 'user-a',
      createdAt: '2026-09-06T10:00:00.000Z'
    })
  })

  it('fails closed when an existing account directory belongs to a different principal', async () => {
    const root = await testRoot()
    const storage = new AccountStorage(root)
    const accountKey = accountKeyFor('tenant-a', 'user-a')
    const layout = await storage.open({ accountKey, tenantId: 'tenant-a', userId: 'user-a' })
    await writeFile(layout.ownerPath, JSON.stringify({
      schemaVersion: 1, accountKey, tenantId: 'tenant-b', userId: 'user-a', createdAt: 'x', lastOpenedAt: 'x'
    }))

    await expect(storage.open({ accountKey, tenantId: 'tenant-a', userId: 'user-a' }))
      .rejects.toThrow('desktop_account_owner_mismatch')
  })

  it('fails closed when owner metadata is malformed or missing in a pre-existing directory', async () => {
    const root = await testRoot()
    const accountKey = accountKeyFor('tenant-a', 'user-a')
    await mkdir(join(root, 'accounts', 'v1', accountKey), { recursive: true })
    const storage = new AccountStorage(root)

    await expect(storage.open({ accountKey, tenantId: 'tenant-a', userId: 'user-a' }))
      .rejects.toThrow('desktop_account_owner_missing')

    await writeFile(join(root, 'accounts', 'v1', accountKey, 'owner.json'), '{not json')
    await expect(storage.open({ accountKey, tenantId: 'tenant-a', userId: 'user-a' }))
      .rejects.toThrow('desktop_account_owner_invalid')
  })
})
