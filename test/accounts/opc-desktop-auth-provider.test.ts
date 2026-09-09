import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { InMemoryCredentialStore } from '../../src/main/accounts/credential-store'
import { OpcDesktopAuthProvider } from '../../src/main/accounts/opc-desktop-auth-provider'

const principal = { tenantId: 'tenant-a', userId: 'user-a', sessionId: 'session-a' }

describe('OpcDesktopAuthProvider', () => {
  it('allows the loopback HTTP API only for development builds', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-desktop-auth-'))
    const credentials = new InMemoryCredentialStore()
    try {
      expect(() => new OpcDesktopAuthProvider({
        apiBaseUrl: 'http://127.0.0.1:3001',
        allowInsecureApiBaseUrl: true,
        credentials,
        activeAccountPath: join(root, 'active.json')
      })).not.toThrow()
      expect(() => new OpcDesktopAuthProvider({
        apiBaseUrl: 'http://127.0.0.1:3001',
        credentials,
        activeAccountPath: join(root, 'active.json')
      })).toThrow('desktop_auth_api_base_invalid')
      expect(() => new OpcDesktopAuthProvider({
        apiBaseUrl: 'http://example.test',
        allowInsecureApiBaseUrl: true,
        credentials,
        activeAccountPath: join(root, 'active.json')
      })).toThrow('desktop_auth_api_base_invalid')
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('logs in with server-asserted identity and restores only a verified Keychain session', async () => {
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
      await credentials.save({ ...principal, accountKey: '1'.repeat(64) }, signedIn!.credential)
      // The controller normally saves by the deterministic account key; this verifies a fresh provider reads and validates it.
      await credentials.saveFor(principal, signedIn!.credential)
      const restored = await new OpcDesktopAuthProvider({ apiBaseUrl: 'https://opc.example.test', credentials, activeAccountPath: join(root, 'active.json'), fetch: fetcher as typeof fetch }).currentSession()
      expect(restored?.principal).toEqual(principal)
      expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/api/v1/auth/me'), expect.objectContaining({ headers: expect.objectContaining({ cookie: 'opc_session=opaque-token' }) }))
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('accepts the production API success envelope for login and session verification', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-desktop-auth-'))
    const credentials = new InMemoryCredentialStore()
    const response = JSON.stringify({ success: true, data: principal })
    const fetcher = vi.fn(async (url: string) => url.endsWith('/login')
      ? new Response(response, { headers: { 'set-cookie': 'opc_session=opaque-token; HttpOnly' } })
      : new Response(response))
    try {
      const provider = new OpcDesktopAuthProvider({ apiBaseUrl: 'https://opc.example.test', credentials, activeAccountPath: join(root, 'active.json'), fetch: fetcher as typeof fetch })
      await expect(provider.signIn({ username: 'merchant', password: 'correct-password' })).resolves.toMatchObject({ principal })
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('fails closed when /auth/me does not match the stored account', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-desktop-auth-'))
    const credentials = new InMemoryCredentialStore()
    const fetcher = vi.fn(async (url: string) => url.endsWith('/login')
      ? new Response(JSON.stringify(principal), { headers: { 'set-cookie': 'opc_session=opaque-token; HttpOnly' } })
      : new Response(JSON.stringify({ ...principal, tenantId: 'tenant-b' })))
    try {
      const provider = new OpcDesktopAuthProvider({ apiBaseUrl: 'https://opc.example.test', credentials, activeAccountPath: join(root, 'active.json'), fetch: fetcher as typeof fetch })
      await expect(provider.signIn({ username: 'merchant', password: 'correct-password' })).rejects.toThrow('desktop_auth_account_changed')
    } finally { await rm(root, { recursive: true, force: true }) }
  })
})
