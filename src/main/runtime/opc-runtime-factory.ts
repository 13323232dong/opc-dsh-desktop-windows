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
 * Completes the host-owned environment used by OPC desktop plugins.
 * Development builds run beside the local Harness API, while production
 * builds require an explicit service URL from opc-desktop.env.
 */
export function resolveOpcDesktopEnvironment(
  configured: Readonly<Record<string, string>>,
  developmentBuild: boolean
): Readonly<Record<string, string>> {
  const configuredApi = configured.OPC_PUBLIC_API_BASE_URL?.trim()
  const useLocalApi = configured.OPC_DESKTOP_USE_LOCAL_API === '1'
  const apiBaseUrl = configuredApi && (useLocalApi || !isLoopbackHttpUrl(configuredApi))
    ? configuredApi
    : configuredApi
      ? 'https://opc.ohmycode.cc'
      : undefined
  const explicitTaskProxy = configured.OPC_TASKS_PROXY_URL?.trim()
  const environment = apiBaseUrl === undefined
    ? { ...configured }
    : { ...configured, OPC_PUBLIC_API_BASE_URL: apiBaseUrl }
  if (explicitTaskProxy) return { ...environment, OPC_TASKS_PROXY_URL: explicitTaskProxy }
  if (!developmentBuild) return environment
  return { ...environment, OPC_TASKS_PROXY_URL: 'http://127.0.0.1:3010' }
}

function isLoopbackHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
  } catch {
    return false
  }
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
    // Existing DSH plugins use the prefixed names. These values are account
    // identity only; the opaque OPC session remains inside the local Broker.
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
