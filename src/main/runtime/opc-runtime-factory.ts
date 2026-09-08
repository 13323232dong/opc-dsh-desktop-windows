import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { DesktopPrincipal } from '../../shared/account-contracts'
import { isLoopbackOrigin, type RuntimeDescriptor } from '../../shared/runtime-contracts'
import type { AccountCredential } from '../accounts/credential-store'
import type { AccountLayout } from '../accounts/account-storage'
import type { LocalCapabilityBroker, RegisteredBrokerRuntime } from '../broker/local-capability-broker'
import type { AccountRuntimeFactory, RuntimeHandle } from './account-runtime-manager'

export interface AccountHarness {
  start(launchDirectory: string): Promise<void>
  stop(): Promise<void>
  snapshot(): { url?: string }
}

export interface AccountHarnessConfiguration {
  dshHome: string
  workspace: string
  logPath: string
  environment: Readonly<Record<string, string>>
}

export interface OpcRuntimeFactoryOptions {
  broker: Pick<LocalCapabilityBroker, 'registerRuntime' | 'revokeRuntime'>
  buildHarness(configuration: AccountHarnessConfiguration): AccountHarness
  createRuntimeId?: () => string
}

/**
 * Bridges account switching to the DSH Host. All account paths are produced
 * by AccountStorage, while broker credentials exist only for this Runtime.
 */
export function createOpcRuntimeFactory(options: OpcRuntimeFactoryOptions): AccountRuntimeFactory {
  const createRuntimeId = options.createRuntimeId ?? randomUUID
  return {
    async start(input): Promise<RuntimeHandle> {
      const runtimeId = createRuntimeId()
      const broker = await options.broker.registerRuntime({
        runtimeId,
        capabilities: [
          'cloud.proxy',
          'filesystem.pick',
          'filesystem.reveal',
          'ego.status',
          'ego.launch',
          'ego.run',
          'media.status',
          'media.install',
          'media.claim',
          'media.run',
          'media.progress',
          'media.cancel'
        ],
        workspace: input.layout.workspace,
        mediaScopeId: input.principal.accountKey,
        cloudSessionToken: input.credential.accessToken
      })
      const harness = options.buildHarness({
        dshHome: input.layout.dshHome,
        workspace: input.layout.workspace,
        logPath: join(input.layout.logs, 'harness.log'),
        environment: brokerEnvironment(input.principal, broker)
      })
      try {
        await harness.start(input.layout.workspace)
        const dshOrigin = harness.snapshot().url
        if (!dshOrigin || !isLoopbackOrigin(dshOrigin)) throw new Error('desktop_harness_origin_missing')
        return {
          descriptor: runtimeDescriptor(input.principal, input.layout, runtimeId, dshOrigin, broker),
          stop: async () => {
            options.broker.revokeRuntime(runtimeId)
            await harness.stop()
          }
        }
      } catch (error) {
        options.broker.revokeRuntime(runtimeId)
        await harness.stop()
        throw error
      }
    }
  }
}

function brokerEnvironment(principal: DesktopPrincipal, broker: RegisteredBrokerRuntime): Readonly<Record<string, string>> {
  return {
    OPC_LOCAL_BROKER_URL: broker.endpoint,
    OPC_LOCAL_BROKER_TOKEN: broker.token,
    OPC_ACCOUNT_KEY: principal.accountKey,
    OPC_TENANT_ID: principal.tenantId,
    OPC_USER_ID: principal.userId,
    OPC_LOGIN_SESSION_ID: principal.sessionId,
    OPC_DSH_TENANT_ID: principal.tenantId,
    OPC_DSH_USER_ID: principal.userId,
    OPC_DSH_LOGIN_SESSION_ID: principal.sessionId
  }
}

function runtimeDescriptor(
  principal: DesktopPrincipal,
  layout: AccountLayout,
  runtimeId: string,
  dshOrigin: string,
  broker: RegisteredBrokerRuntime
): RuntimeDescriptor {
  return {
    runtimeId,
    accountKey: principal.accountKey,
    dshHome: layout.dshHome,
    workspace: layout.workspace,
    dshOrigin,
    brokerOrigin: broker.origin,
    startedAt: new Date().toISOString()
  }
}
