import { describe, expect, it, vi } from 'vitest'
import { ApiSessionAgentController } from '../node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/agent.js'
import { SessionCommandController } from '../node_modules/@deepseek-ai/dsh-api-session-controller/lib/types/commands.js'
import WorkspaceRegistry from '@deepseek-ai/dsh-workspace'

function fixture(status = 'idle', owned = true) {
  const id = 'delete-target'
  const session = { id, header: { id, cwd: '/project' }, snapshotEvents: () => [] }
  const live = new Map([[id, { id, session, status }]])
  const sessions = new Map([[id, session]])
  const persistence = { delete: vi.fn(async () => true), stat: vi.fn(async () => undefined) }
  const ctx = {
    agents: { get: id => live.get(id) }, sessions: { get: id => sessions.get(id) },
    on: vi.fn(), emit: vi.fn(), get: key => key === 'sessionPersistence' ? persistence : undefined,
    typert: { lookups: { configure: vi.fn() }, contexts: { configureHost: vi.fn() } },
    workspaceRegistry: { forgetSession: vi.fn(async () => {}) }
  }
  ctx.workspaceRegistry.deleteSession = async (id, remove) => { const deleted = await remove(); await ctx.workspaceRegistry.forgetSession(id); return deleted }
  const agents = new ApiSessionAgentController(ctx)
  const dispose = vi.fn(async () => { live.delete(id); sessions.delete(id) })
  if (owned && agents.retainHandle) agents.retainHandle({ agent: live.get(id), dispose })
  return { id, ctx, agents, dispose, persistence, commands: new SessionCommandController(ctx, agents, '/project'), live, sessions }
}

function workspaceFixture() {
  const registry = Object.create(WorkspaceRegistry.prototype)
  const records = new Map([['workspace', { id: 'workspace', sessionIds: ['delete-target', 'keep'] }]])
  registry.state = { initialized: true, workspaceIds: ['workspace'], archivedSessionIds: ['delete-target', 'keep'] }
  registry.ctx = { get: () => ({ stat: async () => undefined }), sessions: { get: () => undefined } }
  registry.table = records
  registry.global = { set: vi.fn(async () => {}) }
  registry.headers = new Map([['delete-target', {}], ['keep', {}]])
  registry.sessionPaths = new Map([['delete-target', '/project'], ['keep', '/project']])
  registry.invalidSessionPaths = new Map([['delete-target', new Error('missing')]])
  registry.entities = new Map([['workspace', { detachSession: vi.fn(async id => { records.set('workspace', { ...records.get('workspace'), sessionIds: records.get('workspace').sessionIds.filter(value => value !== id) }) }) }]])
  registry.operationTail = Promise.resolve()
  return { registry, records }
}

describe('Session V3 controller deletion', () => {
  it('rejects a running owned agent before disposal or storage mutation', async () => {
    const f = fixture('running')
    await expect(f.commands.delete({ sessionId: f.id })).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(f.dispose).not.toHaveBeenCalled()
    expect(f.persistence.delete).not.toHaveBeenCalled()
  })
  it('rejects a live agent owned by another capability', async () => {
    const f = fixture('idle', false)
    await expect(f.commands.delete({ sessionId: f.id })).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(f.persistence.delete).not.toHaveBeenCalled()
  })
  it('awaits owned disposal before storage deletion and forgets indexes after commit', async () => {
    const f = fixture()
    const order = []
    f.dispose.mockImplementation(async () => { await Promise.resolve(); order.push('closed'); f.live.clear(); f.sessions.clear() })
    f.persistence.delete.mockImplementation(async () => { order.push('deleted'); return true })
    f.ctx.workspaceRegistry.forgetSession.mockImplementation(async () => { order.push('forgot') })
    expect(await f.commands.delete({ sessionId: f.id })).toEqual({ deleted: true })
    expect(order).toEqual(['closed', 'deleted', 'forgot'])
  })
  it('blocks create and resume while deletion owns the identity', async () => {
    const f = fixture()
    let release
    f.persistence.delete.mockImplementation(() => new Promise(resolve => { release = resolve }))
    const deleting = f.commands.delete({ sessionId: f.id })
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    await expect(f.agents.ensureSession(f.id, '/project', true)).rejects.toMatchObject({ code: 'session/agent-busy' })
    expect(await f.agents.resolveAgent(f.id)).toMatchObject({ error: { code: 'session/agent-busy' } })
    release(true)
    await deleting
  })
  it('never deletes after failed owned close', async () => {
    const f = fixture()
    f.dispose.mockRejectedValue(new Error('flush failed'))
    await expect(f.commands.delete({ sessionId: f.id })).rejects.toThrow('flush failed')
    expect(f.persistence.delete).not.toHaveBeenCalled()
    expect(f.ctx.workspaceRegistry.forgetSession).not.toHaveBeenCalled()
  })
  it('retries index cleanup even when the artifact is already absent', async () => {
    const f = fixture()
    f.live.clear(); f.sessions.clear()
    f.persistence.delete.mockResolvedValue(false)
    expect(await f.commands.delete({ sessionId: f.id })).toEqual({ deleted: true })
    expect(f.ctx.workspaceRegistry.forgetSession).toHaveBeenCalledWith(f.id)
  })
})

describe('Session V3 workspace deletion indexes', () => {
  it('forgets only the target from membership, archive and header caches, idempotently', async () => {
    const { registry, records } = workspaceFixture()
    await registry.forgetSession('delete-target')
    await registry.forgetSession('delete-target')
    expect(records.get('workspace').sessionIds).toEqual(['keep'])
    expect(registry.state.archivedSessionIds).toEqual(['keep'])
    expect([...registry.headers.keys()]).toEqual(['keep'])
    expect([...registry.sessionPaths.keys()]).toEqual(['keep'])
    expect(registry.invalidSessionPaths.size).toBe(0)
  })
  it('keeps a durable cleanup marker and resumes it after a failed archive write', async () => {
    const { registry, records } = workspaceFixture()
    registry.global.set.mockImplementationOnce(async () => {}).mockRejectedValueOnce(new Error('disk full'))
    await expect(registry.forgetSession('delete-target')).rejects.toThrow('disk full')
    expect(registry.state.pendingSessionForget).toBe('delete-target')
    await registry.recoverPendingSessionForget()
    expect(records.get('workspace').sessionIds).toEqual(['keep'])
    expect(registry.state.archivedSessionIds).toEqual(['keep'])
    expect(registry.state.pendingSessionForget).toBeUndefined()
  })
})
