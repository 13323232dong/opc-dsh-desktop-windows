import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { InMemoryCredentialStore } from '../../src/main/accounts/credential-store'
import { OpcDesktopAuthProvider } from '../../src/main/accounts/opc-desktop-auth-provider'

const principal = { tenantId: 'tenant-a', userId: 'user-a', sessionId: 'session-a' }

describe('OpcDesktopAuthProvider', () => {
  it('logs in with the server-asserted identity and restores only a verified session', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-desktop-auth-'))
    const credentials = new InMemoryCredentialStore()
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/login')) return new Response(JSON.stringify(principal), { headers: { 'set-cookie': 'opc_session=opaque-token; HttpOnly' } })
      return new Response(JSON.stringify(principal))
    })
    try {
      const provider = new OpcDesktopAuthProvider({ apiBaseUrl: 'https://opc.example.test', credentials, activeAccountPath: join(root, 'active.json'), fetch: fetcher as typeof fetch })
      const signedIn = await provider.signIn({ username: 'merchant', password: 'correct-password' })
      expect(signedIn).toMatchObject({ principal, credential: { accessToken: 'opaque-token' } })
      await credentials.saveFor(principal, signedIn!.credential)
      const restored = await new OpcDesktopAuthProvider({ apiBaseUrl: 'https://opc.example.test', credentials, activeAccountPath: join(root, 'active.json'), fetch: fetcher as typeof fetch }).currentSession()
      expect(restored?.principal).toEqual(principal)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('accepts the OPC success envelope but rejects a login whose verified tenant differs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-desktop-auth-'))
    const credentials = new InMemoryCredentialStore()
    const fetcher = vi.fn(async (url: string) => url.endsWith('/login')
      ? new Response(JSON.stringify({ success: true, data: principal }), { headers: { 'set-cookie': 'opc_session=opaque-token; HttpOnly' } })
      : new Response(JSON.stringify({ success: true, data: { ...principal, tenantId: 'tenant-b' } })))
    try {
      const provider = new OpcDesktopAuthProvider({ apiBaseUrl: 'https://opc.example.test', credentials, activeAccountPath: join(root, 'active.json'), fetch: fetcher as typeof fetch })
      await expect(provider.signIn({ username: 'merchant', password: 'correct-password' })).rejects.toThrow('desktop_auth_account_changed')
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
