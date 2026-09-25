import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

class RemoteError extends Error {
  constructor(public code: string, message: string, public data: unknown) { super(message) }
}

async function controller(status?: string, owned = true) {
  const source = await readFile(path.resolve(import.meta.dirname, '../node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js'), 'utf8')
  const start = source.indexOf('var SessionCommandController = class {')
  const end = source.indexOf('\nfunction resolvePromptFileReceipts', start)
  expect(start).toBeGreaterThan(0)
  expect(end).toBeGreaterThan(start)
  const Controller = vm.runInNewContext(`${source.slice(start, end)}; SessionCommandController`, {
    RemoteError,
    remoteErrorOf: (error: unknown) => error instanceof RemoteError ? error : undefined,
    hasApiSessionSubagentOwner: () => false
  })
  let live = status ? { status } : undefined
  const remove = vi.fn(async () => true)
  const forget = vi.fn(async () => {})
  const dispose = vi.fn(async () => { if (owned) live = undefined })
  const ctx = {
    agents: { get: () => live },
    sessions: { get: () => live },
    get: () => ({ delete: remove }),
    workspaceRegistry: { forgetSession: forget },
    emit: vi.fn()
  }
  const instance = new Controller(ctx, { disposeOwned: dispose })
  instance.readSessionState = async () => ({ header: { id: 'target' } })
  return { instance, remove, forget, dispose }
}

describe('Session V3 deletion controller', () => {
  it('rejects a running agent before invoking its teardown capability', async () => {
    const { instance, dispose, remove, forget } = await controller('running')
    await expect(instance.delete({ sessionId: 'target' })).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(dispose).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(forget).not.toHaveBeenCalled()
  })

  it('refuses a live agent whose ownership belongs to another capability', async () => {
    const { instance, remove } = await controller('idle', false)
    await expect(instance.delete({ sessionId: 'target' })).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(remove).not.toHaveBeenCalled()
  })

  it('retires its own idle agent before storage deletion and workspace cleanup', async () => {
    const { instance, dispose, remove, forget } = await controller('idle')
    await expect(instance.delete({ sessionId: 'target' })).resolves.toEqual({ deleted: true })
    expect(dispose.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]!)
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(forget.mock.invocationCallOrder[0]!)
    expect(forget).toHaveBeenCalledWith('target')
  })

  it('keeps workspace membership when storage deletion fails', async () => {
    const { instance, remove, forget } = await controller()
    remove.mockRejectedValueOnce(new Error('storage unavailable'))
    await expect(instance.delete({ sessionId: 'target' })).rejects.toMatchObject({ code: 'gateway/internal' })
    expect(forget).not.toHaveBeenCalled()
  })

  it('rechecks activity after waiting for an in-flight agent activation', async () => {
    const source = await readFile(path.resolve(import.meta.dirname, '../node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js'), 'utf8')
    const start = source.indexOf('async disposeOwned(sessionId) {')
    const end = source.indexOf('\n\tasync resolve(', start)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const disposeOwned = vm.runInNewContext(`({ ${source.slice(start, end)} }).disposeOwned`, { RemoteError })
    const dispose = vi.fn()
    const handle = { agent: { status: 'running' }, dispose }
    const owner = { resumes: new Map([['target', Promise.resolve(handle)]]), creations: new Map(), handles: new Map([['target', handle]]) }
    await expect(disposeOwned.call(owner, 'target')).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(dispose).not.toHaveBeenCalled()
  })
})
