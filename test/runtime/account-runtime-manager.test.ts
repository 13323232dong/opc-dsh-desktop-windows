import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AccountRuntimeManager, type AccountRuntimeFactory, type RuntimeHandle } from '../../src/main/runtime/account-runtime-manager'
import { InMemoryCredentialStore, type AccountCredential } from '../../src/main/accounts/credential-store'

async function createManager() {
  const root = await mkdtemp(join(tmpdir(), 'opc-runtime-manager-'))
  const credentials = new InMemoryCredentialStore()
  const handle: RuntimeHandle = { descriptor: { runtimeId: 'runtime-1', accountKey: '', dshHome: '', workspace: '', dshOrigin: 'http://127.0.0.1:32100', brokerOrigin: 'http://127.0.0.1:32200', startedAt: '2026-09-06T00:00:00.000Z' }, stop: vi.fn(async () => undefined) }
  const factory: AccountRuntimeFactory = { start: vi.fn(async ({ principal, layout }) => ({ ...handle, descriptor: { ...handle.descriptor, accountKey: principal.accountKey, dshHome: layout.dshHome, workspace: layout.workspace } })) }
  const tokens = { revoke: vi.fn(async () => undefined) }
  const manager = new AccountRuntimeManager({ root, credentialStore: credentials, runtimeFactory: factory, localTokenStore: tokens })
  return { root, credentials, handle, factory, tokens, manager }
}

const a = { tenantId: 'tenant-a', userId: 'user-a', sessionId: 'session-a' }
const b = { tenantId: 'tenant-b', userId: 'user-b', sessionId: 'session-b' }

function credential(principal: typeof a): AccountCredential {
  return { tenantId: principal.tenantId, userId: principal.userId, sessionId: principal.sessionId, accessToken: 'opaque-token' }
}

describe('AccountRuntimeManager', () => {
  it('starts a runtime only after its scoped credential and owner directory validate', async () => {
    const fixture = await createManager()
    try {
      await fixture.credentials.saveFor(a, credential(a))

      const context = await fixture.manager.switchTo(a)

      expect(context.principal).toMatchObject(a)
      expect(context.principal.accountKey).toMatch(/^[a-f0-9]{64}$/)
      expect(fixture.factory.start).toHaveBeenCalledOnce()
      expect(fixture.manager.snapshot().phase).toBe('active')
    } finally { await rm(fixture.root, { recursive: true, force: true }) }
  })

  it('revokes local authority and terminates the old runtime before starting another account', async () => {
    const fixture = await createManager()
    try {
      await fixture.credentials.saveFor(a, credential(a))
      await fixture.credentials.saveFor(b, credential(b))
      await fixture.manager.switchTo(a)
      await fixture.manager.switchTo(b)

      expect(fixture.handle.stop).toHaveBeenCalledTimes(1)
      expect(fixture.tokens.revoke).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-a', userId: 'user-a' }))
      expect(fixture.factory.start).toHaveBeenCalledTimes(2)
      expect(fixture.manager.snapshot().context?.principal).toMatchObject(b)
    } finally { await rm(fixture.root, { recursive: true, force: true }) }
  })

  it('fails closed without starting or preserving a previous account when credentials do not match', async () => {
    const fixture = await createManager()
    try {
      await fixture.credentials.saveFor(a, { ...credential(a), tenantId: 'tenant-b' })

      await expect(fixture.manager.switchTo(a)).rejects.toThrow('desktop_account_credential_mismatch')
      expect(fixture.factory.start).not.toHaveBeenCalled()
      expect(fixture.manager.snapshot()).toMatchObject({ phase: 'failed', context: undefined })
    } finally { await rm(fixture.root, { recursive: true, force: true }) }
  })
})
