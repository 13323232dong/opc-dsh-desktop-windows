import { describe, expect, it, vi } from 'vitest'
import { DesktopAuthController, type DesktopAuthProvider } from '../../src/main/accounts/desktop-auth-controller'

const session = {
  principal: { tenantId: 'tenant-a', userId: 'user-a', sessionId: 'session-a' },
  credential: { tenantId: 'tenant-a', userId: 'user-a', sessionId: 'session-a', accessToken: 'opaque-token' }
}

describe('DesktopAuthController', () => {
  it('does not activate a DSH runtime before an authenticated desktop session is available', async () => {
    const provider: DesktopAuthProvider = { signIn: vi.fn(async () => undefined), currentSession: vi.fn(async () => undefined), signOut: vi.fn(async () => undefined) }
    const runtime = { switchTo: vi.fn(), signOut: vi.fn(async () => undefined) }
    const credentials = { save: vi.fn(), remove: vi.fn() }
    const controller = new DesktopAuthController({ provider, runtime: runtime as never, credentials: credentials as never })

    await expect(controller.restore()).resolves.toBeUndefined()
    expect(runtime.switchTo).not.toHaveBeenCalled()
  })

  it('persists the verified session before starting the matching account runtime', async () => {
    const provider: DesktopAuthProvider = { signIn: vi.fn(async () => session), currentSession: vi.fn(async () => undefined), signOut: vi.fn(async () => undefined) }
    const runtime = { switchTo: vi.fn(async (principal) => ({ principal })), signOut: vi.fn(async () => undefined) }
    const credentials = { save: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) }
    const controller = new DesktopAuthController({ provider, runtime: runtime as never, credentials: credentials as never })

    const context = await controller.signIn({ username: 'merchant', password: 'password' })

    expect(context?.principal).toMatchObject(session.principal)
    expect(credentials.save).toHaveBeenCalledWith(expect.objectContaining(session.principal), session.credential)
    expect(runtime.switchTo).toHaveBeenCalledWith(session.principal)
  })

  it('rejects an identity-mismatched provider response without writing credentials or starting DSH', async () => {
    const provider: DesktopAuthProvider = { signIn: vi.fn(async () => ({ ...session, credential: { ...session.credential, tenantId: 'tenant-b' } })), currentSession: vi.fn(async () => undefined), signOut: vi.fn(async () => undefined) }
    const runtime = { switchTo: vi.fn(), signOut: vi.fn(async () => undefined) }
    const credentials = { save: vi.fn(), remove: vi.fn() }
    const controller = new DesktopAuthController({ provider, runtime: runtime as never, credentials: credentials as never })

    await expect(controller.signIn({ username: 'merchant', password: 'password' })).rejects.toThrow('desktop_auth_account_changed')
    expect(credentials.save).not.toHaveBeenCalled()
    expect(runtime.switchTo).not.toHaveBeenCalled()
  })

  it('continues every logout cleanup step when stopping the runtime fails', async () => {
    const runtimeError = new Error('runtime_stop_failed')
    const provider: DesktopAuthProvider = { signIn: vi.fn(), currentSession: vi.fn(), signOut: vi.fn(async () => undefined) }
    const runtime = {
      switchTo: vi.fn(),
      snapshot: vi.fn(() => ({ context: { principal: { ...session.principal, accountKey: 'account-a' } } })),
      signOut: vi.fn(async () => { throw runtimeError })
    }
    const credentials = { save: vi.fn(), remove: vi.fn(async () => undefined) }
    const controller = new DesktopAuthController({ provider, runtime: runtime as never, credentials: credentials as never })

    await expect(controller.signOut()).rejects.toBe(runtimeError)
    expect(credentials.remove).toHaveBeenCalledOnce()
    expect(provider.signOut).toHaveBeenCalledOnce()
  })

  it('continues remote logout when removing local credentials fails', async () => {
    const credentialError = new Error('credential_remove_failed')
    const provider: DesktopAuthProvider = { signIn: vi.fn(), currentSession: vi.fn(), signOut: vi.fn(async () => undefined) }
    const runtime = {
      switchTo: vi.fn(),
      snapshot: vi.fn(() => ({ context: { principal: { ...session.principal, accountKey: 'account-a' } } })),
      signOut: vi.fn(async () => undefined)
    }
    const credentials = { save: vi.fn(), remove: vi.fn(async () => { throw credentialError }) }
    const controller = new DesktopAuthController({ provider, runtime: runtime as never, credentials: credentials as never })

    await expect(controller.signOut()).rejects.toBe(credentialError)
    expect(provider.signOut).toHaveBeenCalledOnce()
  })
})
