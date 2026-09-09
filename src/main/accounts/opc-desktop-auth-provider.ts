import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { accountKeyFor } from './account-key'
import type { CredentialStore } from './credential-store'
import type { DesktopAuthProvider, DesktopAuthSession } from './desktop-auth-controller'
import type { PrincipalInput } from '../../shared/account-contracts'

export interface DesktopSignInInput {
  username: string
  password: string
}

interface ActiveAccountRecord extends PrincipalInput {
  schemaVersion: 1
}

interface OpcDesktopAuthProviderOptions {
  apiBaseUrl: string
  /** Development-only loopback API support; production auth remains HTTPS-only. */
  allowInsecureApiBaseUrl?: boolean
  credentials: CredentialStore
  activeAccountPath: string
  fetch?: typeof fetch
}

/**
 * Owns the desktop's opaque OPC session cookie. The cookie is never exposed to
 * renderer code or persisted outside Keychain; the small activation record is
 * only enough to locate the matching Keychain item on the next app launch.
 */
export class OpcDesktopAuthProvider implements DesktopAuthProvider {
  private readonly baseUrl: URL
  private readonly fetcher: typeof fetch
  private active: DesktopAuthSession | undefined

  constructor(private readonly options: OpcDesktopAuthProviderOptions) {
    this.baseUrl = normalizeApiBaseUrl(options.apiBaseUrl, options.allowInsecureApiBaseUrl === true)
    this.fetcher = options.fetch ?? fetch
  }

  async currentSession(): Promise<DesktopAuthSession | undefined> {
    const record = await this.readActiveAccount()
    if (!record) return undefined
    const principal = principalFrom(record)
    const credential = await this.options.credentials.load({ ...principal, accountKey: accountKeyFor(principal.tenantId, principal.userId) })
    if (!credential) {
      await this.clearActiveAccount()
      return undefined
    }
    try {
      const verified = await this.verify(credential.accessToken)
      if (!samePrincipal(verified, principal)) throw new Error('desktop_auth_account_changed')
      const session = { principal: verified, credential: { ...credential, ...verified } }
      this.active = session
      return session
    } catch {
      await this.options.credentials.remove({ ...principal, accountKey: accountKeyFor(principal.tenantId, principal.userId) })
      await this.clearActiveAccount()
      return undefined
    }
  }

  async signIn(input: DesktopSignInInput): Promise<DesktopAuthSession | undefined> {
    const username = input.username.trim()
    if (!username || !input.password) throw new Error('desktop_auth_credentials_required')
    const response = await this.fetcher(this.url('/api/v1/auth/login'), {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ username, password: input.password })
    })
    if (!response.ok) throw new Error(`desktop_auth_login_failed:${response.status}`)
    const token = sessionTokenFrom(response)
    if (!token) throw new Error('desktop_auth_session_cookie_missing')
    const principal = principalFromApiResponse(await response.json())
    const verified = await this.verify(token)
    if (!samePrincipal(principal, verified)) throw new Error('desktop_auth_account_changed')
    const session: DesktopAuthSession = {
      principal: verified,
      credential: { ...verified, accessToken: token }
    }
    this.active = session
    await this.writeActiveAccount(verified)
    return session
  }

  async requestRegistrationCode(input: { username: string; password: string; email: string }): Promise<void> {
    await this.postAuth('/api/v1/auth/registration/request-code', input)
  }

  async confirmRegistration(input: { username: string; password: string; email: string; code: string }): Promise<void> {
    await this.postAuth('/api/v1/auth/registration/confirm', input)
  }

  async signOut(): Promise<void> {
    const active = this.active
    this.active = undefined
    try {
      if (active) {
        await this.fetcher(this.url('/api/v1/auth/logout'), {
          method: 'POST', headers: { cookie: `opc_session=${active.credential.accessToken}` }
        })
      }
    } finally {
      await this.clearActiveAccount()
    }
  }

  private async verify(token: string): Promise<PrincipalInput> {
    const response = await this.fetcher(this.url('/api/v1/auth/me'), {
      headers: { accept: 'application/json', cookie: `opc_session=${token}` }
    })
    if (!response.ok) throw new Error(`desktop_auth_session_invalid:${response.status}`)
    return principalFromApiResponse(await response.json())
  }

  private url(path: string): string {
    return new URL(path, this.baseUrl).toString()
  }

  private async postAuth(path: string, body: unknown): Promise<void> {
    const response = await this.fetcher(this.url(path), {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (response.ok) return
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(payload?.error?.message || `desktop_auth_registration_failed:${response.status}`)
  }

  private async readActiveAccount(): Promise<ActiveAccountRecord | undefined> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.options.activeAccountPath, 'utf8'))
      if (!parsed || typeof parsed !== 'object') return undefined
      const value = parsed as Partial<ActiveAccountRecord>
      if (value.schemaVersion !== 1) return undefined
      return { schemaVersion: 1, ...principalFrom(value) }
    } catch {
      return undefined
    }
  }

  private async writeActiveAccount(principal: PrincipalInput): Promise<void> {
    await mkdir(dirname(this.options.activeAccountPath), { recursive: true })
    const temporary = `${this.options.activeAccountPath}.${process.pid}.tmp`
    await writeFile(temporary, `${JSON.stringify({ schemaVersion: 1, ...principal })}\n`, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, this.options.activeAccountPath)
  }

  private async clearActiveAccount(): Promise<void> {
    await rm(this.options.activeAccountPath, { force: true })
  }
}

function normalizeApiBaseUrl(value: string, allowInsecureLoopback: boolean): URL {
  const url = new URL(value)
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
  const secure = url.protocol === 'https:'
  if ((!secure && !(allowInsecureLoopback && url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash) {
    throw new Error('desktop_auth_api_base_invalid')
  }
  return new URL('/', url)
}

function sessionTokenFrom(response: Response): string | undefined {
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie') ?? '']
  for (const cookie of cookies) {
    const match = /(?:^|,\s*)opc_session=([^;\s,]+)/u.exec(cookie)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return undefined
}

function principalFrom(value: unknown): PrincipalInput {
  if (!value || typeof value !== 'object') throw new Error('desktop_auth_principal_invalid')
  const input = value as Partial<PrincipalInput>
  if (typeof input.tenantId !== 'string' || typeof input.userId !== 'string' || typeof input.sessionId !== 'string') {
    throw new Error('desktop_auth_tenant_required')
  }
  return { tenantId: input.tenantId, userId: input.userId, sessionId: input.sessionId }
}

function principalFromApiResponse(value: unknown): PrincipalInput {
  if (value && typeof value === 'object' && 'success' in value && 'data' in value) {
    const envelope = value as { success?: unknown; data?: unknown }
    if (envelope.success !== true) throw new Error('desktop_auth_api_response_invalid')
    return principalFrom(envelope.data)
  }
  return principalFrom(value)
}

function samePrincipal(left: PrincipalInput, right: PrincipalInput): boolean {
  return left.tenantId === right.tenantId && left.userId === right.userId && left.sessionId === right.sessionId
}
