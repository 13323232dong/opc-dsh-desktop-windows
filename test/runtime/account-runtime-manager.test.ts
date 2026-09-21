import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AccountRuntimeManager, type AccountRuntimeFactory, type RuntimeHandle } from '../../src/main/runtime/account-runtime-manager'
import { InMemoryCredentialStore, type AccountCredential } from '../../src/main/accounts/credential-store'
import type { AccountLayout } from '../../src/main/accounts/account-storage'
import type { DesktopPrincipal } from '../../src/shared/account-contracts'

interface SecondBrainInitializationInput {
  principal: DesktopPrincipal
  layout: AccountLayout
}

async function createManager() {
  const root = await mkdtemp(join(tmpdir(), 'opc-runtime-manager-'))
  const credentials = new InMemoryCredentialStore()
  const handle: RuntimeHandle = { descriptor: { runtimeId: 'runtime-1', accountKey: '', dshHome: '', workspace: '', dshOrigin: 'http://127.0.0.1:32100', brokerOrigin: 'http://127.0.0.1:32200', startedAt: '2026-09-06T00:00:00.000Z' }, stop: vi.fn(async () => undefined) }
  const factory: AccountRuntimeFactory = { start: vi.fn(async ({ principal, layout }) => ({ ...handle, descriptor: { ...handle.descriptor, accountKey: principal.accountKey, dshHome: layout.dshHome, workspace: layout.workspace } })) }
  const tokens = { revoke: vi.fn(async () => undefined) }
  const secondBrain = { initialize: vi.fn<(input: SecondBrainInitializationInput) => Promise<void>>(async () => undefined) }
  const onSecondBrainInitializationError = vi.fn<(principal: DesktopPrincipal, error: Error) => void>()
  const manager = new AccountRuntimeManager({
    root,
    credentialStore: credentials,
    runtimeFactory: factory,
    localTokenStore: tokens,
    secondBrain,
    onSecondBrainInitializationError
  })
  return { root, credentials, handle, factory, tokens, secondBrain, onSecondBrainInitializationError, manager }
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
      expect(fixture.secondBrain.initialize).toHaveBeenCalledOnce()
      expect(fixture.secondBrain.initialize).toHaveBeenCalledWith({
        principal: context.principal,
        layout: expect.objectContaining({
          root: expect.stringContaining(context.principal.accountKey),
          workspace: context.descriptor.workspace
        })
      })
      expect(fixture.manager.snapshot().phase).toBe('active')
    } finally { await rm(fixture.root, { recursive: true, force: true }) }
  })

  it('does not block a successful login while the second-brain skeleton initializes', async () => {
    const fixture = await createManager()
    let releaseInitialization: (() => void) | undefined
    fixture.secondBrain.initialize.mockImplementation(() => new Promise<void>((resolve) => {
      releaseInitialization = resolve
    }))
    try {
      await fixture.credentials.saveFor(a, credential(a))

      const context = await fixture.manager.switchTo(a)

      expect(context.principal).toMatchObject(a)
      expect(fixture.manager.snapshot().phase).toBe('active')
      expect(fixture.secondBrain.initialize).toHaveBeenCalledOnce()
    } finally {
      releaseInitialization?.()
      await rm(fixture.root, { recursive: true, force: true })
    }
  })

  it('keeps login active and reports diagnostics when second-brain initialization fails', async () => {
    const fixture = await createManager()
    fixture.secondBrain.initialize.mockRejectedValueOnce(new Error('disk_permission_denied'))
    try {
      await fixture.credentials.saveFor(a, credential(a))

      const context = await fixture.manager.switchTo(a)
      await vi.waitFor(() => expect(fixture.onSecondBrainInitializationError).toHaveBeenCalledWith(
        expect.objectContaining({ accountKey: context.principal.accountKey }),
        expect.objectContaining({ message: 'disk_permission_denied' })
      ))

      expect(fixture.manager.snapshot().phase).toBe('active')
      expect(fixture.factory.start).toHaveBeenCalledOnce()
    } finally { await rm(fixture.root, { recursive: true, force: true }) }
  })

  it('initializes once per active account and never reuses another account directory', async () => {
    const fixture = await createManager()
    try {
      await fixture.credentials.saveFor(a, credential(a))
      await fixture.credentials.saveFor(b, credential(b))

      const contextA = await fixture.manager.switchTo(a)
      await fixture.manager.switchTo(a)
      const contextB = await fixture.manager.switchTo(b)

      expect(fixture.secondBrain.initialize).toHaveBeenCalledTimes(2)
      const first = fixture.secondBrain.initialize.mock.calls[0]![0]
      const second = fixture.secondBrain.initialize.mock.calls[1]![0]
      expect(first.principal.accountKey).toBe(contextA.principal.accountKey)
      expect(second.principal.accountKey).toBe(contextB.principal.accountKey)
      expect(first.principal.accountKey).not.toBe(second.principal.accountKey)
      expect(first.layout.root).not.toBe(second.layout.root)
      expect(first.layout.root).toContain(first.principal.accountKey)
      expect(second.layout.root).toContain(second.principal.accountKey)
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
