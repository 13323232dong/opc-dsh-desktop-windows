import { accountKeyFor } from './account-key'
import type { AccountCredential, CredentialStore } from './credential-store'
import type { AccountRuntimeManager } from '../runtime/account-runtime-manager'
import type { AccountRuntimeContext } from '../../shared/runtime-contracts'
import type { PrincipalInput } from '../../shared/account-contracts'

export interface DesktopAuthSession {
  principal: PrincipalInput
  credential: AccountCredential
}

/**
 * Cloud authentication is injected rather than implemented against the web
 * cookie API. OPC has no desktop PKCE grant yet, so this contract prevents a
 * desktop build from treating an arbitrary browser session as a login.
 */
export interface DesktopAuthProvider {
  currentSession(): Promise<DesktopAuthSession | undefined>
  signIn(input: { username: string; password: string }): Promise<DesktopAuthSession | undefined>
  signOut(): Promise<void>
}

export interface DesktopAuthControllerOptions {
  provider: DesktopAuthProvider
  runtime: Pick<AccountRuntimeManager, 'switchTo' | 'signOut' | 'snapshot'>
  credentials: CredentialStore
}

export class DesktopAuthController {
  constructor(private readonly options: DesktopAuthControllerOptions) {}

  async restore(): Promise<AccountRuntimeContext | undefined> {
    return await this.activate(await this.options.provider.currentSession())
  }

  async signIn(input: { username: string; password: string }): Promise<AccountRuntimeContext | undefined> {
    return await this.activate(await this.options.provider.signIn(input))
  }

  async signOut(): Promise<void> {
    const context = this.options.runtime.snapshot?.()?.context
    await this.options.runtime.signOut()
    if (context) await this.options.credentials.remove(context.principal)
    await this.options.provider.signOut()
  }

  private async activate(session: DesktopAuthSession | undefined): Promise<AccountRuntimeContext | undefined> {
    if (!session) return undefined
    const principal = session.principal
    if (
      session.credential.tenantId !== principal.tenantId ||
      session.credential.userId !== principal.userId ||
      session.credential.sessionId !== principal.sessionId ||
      !session.credential.accessToken
    ) throw new Error('desktop_auth_account_changed')

    const scoped = { ...principal, accountKey: accountKeyFor(principal.tenantId, principal.userId) }
    await this.options.credentials.save(scoped, session.credential)
    return await this.options.runtime.switchTo(principal)
  }
}
