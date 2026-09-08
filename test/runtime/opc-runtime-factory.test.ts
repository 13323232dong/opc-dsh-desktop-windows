import { describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { createOpcRuntimeFactory, type AccountHarness } from '../../src/main/runtime/opc-runtime-factory'

const principal = {
  tenantId: 'tenant-a', userId: 'user-a', sessionId: 'session-a', accountKey: 'a'.repeat(64)
}
const layout = {
  root: '/accounts/a', dshHome: '/accounts/a/dsh-home', workspace: '/accounts/a/workspace', logs: '/accounts/a/logs', ownerPath: '/accounts/a/owner.json'
}
const credential = { tenantId: 'tenant-a', userId: 'user-a', sessionId: 'session-a', accessToken: 'opaque-access-token' }

describe('createOpcRuntimeFactory', () => {
  it('starts DSH with account-only paths and an ephemeral broker registration', async () => {
    const broker = {
      registerRuntime: vi.fn(async () => ({ runtimeId: 'runtime-a', origin: 'http://127.0.0.1:40123', endpoint: 'http://127.0.0.1:40123/v1/runtimes/runtime-a', token: 'broker-secret' })),
      revokeRuntime: vi.fn()
    }
    const harness: AccountHarness = {
      start: vi.fn(async () => undefined),
      stop: vi.fn(async () => undefined),
      snapshot: vi.fn(() => ({ url: 'http://127.0.0.1:40124' }))
    }
    const buildHarness = vi.fn(() => harness)
    const factory = createOpcRuntimeFactory({ broker, buildHarness, createRuntimeId: () => 'runtime-a' })

    const handle = await factory.start({ principal, layout, credential })

    expect(buildHarness).toHaveBeenCalledWith(expect.objectContaining({
      dshHome: layout.dshHome,
      logPath: join(layout.logs, 'harness.log'),
      workspace: layout.workspace,
      environment: expect.objectContaining({
        OPC_LOCAL_BROKER_URL: 'http://127.0.0.1:40123/v1/runtimes/runtime-a',
        OPC_LOCAL_BROKER_TOKEN: 'broker-secret',
        OPC_ACCOUNT_KEY: principal.accountKey,
        OPC_TENANT_ID: principal.tenantId,
        OPC_USER_ID: principal.userId
      })
    }))
    expect(broker.registerRuntime).toHaveBeenCalledWith(expect.objectContaining({
      cloudSessionToken: credential.accessToken,
      mediaScopeId: principal.accountKey,
      capabilities: expect.arrayContaining([
        'media.status',
        'media.install',
        'media.claim',
        'media.run',
        'media.progress',
        'media.cancel'
      ])
    }))
    expect(harness.start).toHaveBeenCalledWith(layout.workspace)
    expect(handle.descriptor).toMatchObject({ runtimeId: 'runtime-a', accountKey: principal.accountKey, dshHome: layout.dshHome, workspace: layout.workspace })
    await handle.stop()
    expect(broker.revokeRuntime).toHaveBeenCalledWith('runtime-a')
    expect(harness.stop).toHaveBeenCalledOnce()
  })

  it('revokes the broker registration when DSH fails to provide a loopback origin', async () => {
    const broker = {
      registerRuntime: vi.fn(async () => ({ runtimeId: 'runtime-a', origin: 'http://127.0.0.1:40123', endpoint: 'http://127.0.0.1:40123/v1/runtimes/runtime-a', token: 'broker-secret' })),
      revokeRuntime: vi.fn()
    }
    const harness: AccountHarness = {
      start: vi.fn(async () => undefined), stop: vi.fn(async () => undefined), snapshot: vi.fn(() => ({ url: undefined }))
    }
    const factory = createOpcRuntimeFactory({ broker, buildHarness: () => harness, createRuntimeId: () => 'runtime-a' })

    await expect(factory.start({ principal, layout, credential })).rejects.toThrow('desktop_harness_origin_missing')
    expect(broker.revokeRuntime).toHaveBeenCalledWith('runtime-a')
    expect(harness.stop).toHaveBeenCalledOnce()
  })
})
