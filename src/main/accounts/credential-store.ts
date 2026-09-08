import { accountKeyFor } from './account-key'

export interface AccountCredential {
  tenantId: string
  userId: string
  sessionId: string
  accessToken: string
}

/**
 * Production wiring supplies a macOS Keychain implementation. Keeping this
 * interface narrow prevents a runtime from ever selecting credentials by an
 * arbitrary file path or another account's identity.
 */
export interface CredentialStore {
  load(accountKey: string): Promise<AccountCredential | undefined>
  save(accountKey: string, credential: AccountCredential): Promise<void>
  remove(accountKey: string): Promise<void>
}

export class InMemoryCredentialStore implements CredentialStore {
  private readonly credentials = new Map<string, AccountCredential>()

  async load(accountKey: string): Promise<AccountCredential | undefined> {
    const credential = this.credentials.get(accountKey)
    return credential ? { ...credential } : undefined
  }

  async save(accountKey: string, credential: AccountCredential): Promise<void> {
    this.credentials.set(accountKey, { ...credential })
  }

  async saveFor(
    principal: Pick<AccountCredential, 'tenantId' | 'userId' | 'sessionId'>,
    credential: AccountCredential
  ): Promise<void> {
    await this.save(accountKeyFor(principal.tenantId, principal.userId), credential)
  }

  async remove(accountKey: string): Promise<void> {
    this.credentials.delete(accountKey)
  }
}
