import { assertPrincipalInput, type AccountSwitchPhase, type DesktopPrincipal, type PrincipalInput } from '../../shared/account-contracts'
import type { AccountRuntimeContext, RuntimeDescriptor } from '../../shared/runtime-contracts'
import { accountKeyFor } from '../accounts/account-key'
import { AccountStorage, type AccountLayout } from '../accounts/account-storage'
import type { AccountCredential, CredentialStore } from '../accounts/credential-store'
import { OwnedProcessTree, type OwnedProcess } from './owned-process-tree'

export interface RuntimeHandle {
  descriptor: RuntimeDescriptor
  stop(): Promise<void>
  ownedProcesses?: readonly OwnedProcess[]
}

export interface AccountRuntimeFactory {
  start(input: { principal: DesktopPrincipal; layout: AccountLayout; credential: AccountCredential }): Promise<RuntimeHandle>
}

export interface LocalTokenStore {
  revoke(principal: DesktopPrincipal): Promise<void>
}

export interface AccountRuntimeManagerOptions {
  root: string
  credentialStore: CredentialStore
  runtimeFactory: AccountRuntimeFactory
  localTokenStore: LocalTokenStore
  processTree?: OwnedProcessTree
}

export interface AccountRuntimeSnapshot {
  phase: AccountSwitchPhase
  context?: AccountRuntimeContext
  error?: string
}

/**
 * Serializes account changes. A failed change leaves no previous runtime
 * reachable: local filesystem and process state are never shared as fallback.
 */
export class AccountRuntimeManager {
  private readonly storage: AccountStorage
  private readonly processTree: OwnedProcessTree
  private phase: AccountSwitchPhase = 'signed-out'
  private context: AccountRuntimeContext | undefined
  private handle: RuntimeHandle | undefined
  private switching: Promise<AccountRuntimeContext> | undefined

  constructor(private readonly options: AccountRuntimeManagerOptions) {
    this.storage = new AccountStorage(options.root)
    this.processTree = options.processTree ?? new OwnedProcessTree()
  }

  snapshot(): AccountRuntimeSnapshot {
    return { phase: this.phase, context: this.context, error: this.phase === 'failed' ? 'desktop_account_switch_failed' : undefined }
  }

  switchTo(input: PrincipalInput): Promise<AccountRuntimeContext> {
    if (this.switching) return this.switching
    const operation = this.performSwitch(input).finally(() => { this.switching = undefined })
    this.switching = operation
    return operation
  }

  async signOut(): Promise<void> {
    await this.stopCurrent()
    this.phase = 'signed-out'
  }

  private async performSwitch(input: PrincipalInput): Promise<AccountRuntimeContext> {
    try {
      this.phase = 'validating'
      const validated = assertPrincipalInput(input)
      const principal: DesktopPrincipal = { ...validated, accountKey: accountKeyFor(validated.tenantId, validated.userId) }
      const credential = await this.options.credentialStore.load(principal.accountKey)
      this.assertCredential(credential, principal)
      const layout = await this.storage.open(principal)

      if (this.context && this.samePrincipal(this.context.principal, principal)) return this.context
      await this.stopCurrent()

      this.phase = 'starting'
      const handle = await this.options.runtimeFactory.start({ principal, layout, credential })
      const descriptor = { ...handle.descriptor, accountKey: principal.accountKey, dshHome: layout.dshHome, workspace: layout.workspace }
      for (const process of handle.ownedProcesses ?? []) this.processTree.register(descriptor.runtimeId, process)
      this.handle = handle
      this.context = { principal, descriptor }
      this.phase = 'active'
      return this.context
    } catch (error) {
      this.context = undefined
      this.handle = undefined
      this.phase = 'failed'
      throw error
    }
  }

  private assertCredential(credential: AccountCredential | undefined, principal: DesktopPrincipal): asserts credential is AccountCredential {
    if (!credential) throw new Error('desktop_account_credential_missing')
    if (credential.tenantId !== principal.tenantId || credential.userId !== principal.userId || credential.sessionId !== principal.sessionId || credential.accessToken.length === 0) {
      throw new Error('desktop_account_credential_mismatch')
    }
  }

  private samePrincipal(left: DesktopPrincipal, right: DesktopPrincipal): boolean {
    return left.accountKey === right.accountKey && left.sessionId === right.sessionId
  }

  private async stopCurrent(): Promise<void> {
    const current = this.context
    const handle = this.handle
    if (!current || !handle) return
    this.phase = 'stopping'
    this.context = undefined
    this.handle = undefined
    try {
      await this.options.localTokenStore.revoke(current.principal)
    } finally {
      try {
        await this.processTree.stop(current.descriptor.runtimeId)
      } finally {
        await handle.stop()
      }
    }
  }
}
