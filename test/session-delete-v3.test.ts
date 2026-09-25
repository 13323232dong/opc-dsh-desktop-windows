import { mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { afterEach, describe, expect, it } from 'vitest'

const cleanups: Array<() => Promise<void>> = []
const event = [{ type: 'turn/start', seq: SessionSeq(0), time: 1, data: { turn: 1 } }] as const

async function fixture(root?: string) {
  const directory = root ?? await mkdtemp(join(tmpdir(), 'opc-session-v3-'))
  if (!root) cleanups.push(() => rm(directory, { recursive: true, force: true }))
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const fiber = await ctx.plugin(JsonlSessionPersistence, { root: directory, compression: 'none' })
  cleanups.push(async () => { await fiber.dispose() })
  const store = ctx.sessionPersistence as JsonlSessionPersistence & {
    delete(id: ReturnType<typeof SessionId>): Promise<boolean>
  }
  async function create(name: string, materialize = true) {
    const id = SessionId(name)
    const header = { version: SESSION_FORMAT_VERSION, id, createdAt: 1, isSeeded: false } as const
    const handle = await store.create(header)
    if (materialize) await handle.append(event)
    const backend = store as unknown as { locate(value: typeof header): { path: string } }
    return { id, handle, path: backend.locate(header).path }
  }
  return { root: directory, store, create }
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

describe('Session V3 permanent deletion', () => {
  it('removes one log, keeps other sessions and workspace files, and allows idempotent retry', async () => {
    const { root, store, create } = await fixture()
    const removed = await create('remove')
    const kept = await create('keep')
    await removed.handle.close()
    await kept.handle.close()
    const workspaceFile = join(root, 'customer.txt')
    await writeFile(workspaceFile, 'keep')
    expect(await store.delete(removed.id)).toBe(true)
    expect(await store.stat(removed.id)).toBeUndefined()
    await expect(store.open(removed.id, 'read')).rejects.toThrow(/not found/i)
    expect((await store.list()).map(value => value.header.id)).toEqual([kept.id])
    expect(await readFile(workspaceFile, 'utf8')).toBe('keep')
    expect(await store.delete(removed.id)).toBe(false)
  })

  it.each([true, false])('refuses an owned writer (materialized=%s) without altering it', async materialized => {
    const { store, create } = await fixture()
    const session = await create('owned', materialized)
    await expect(store.delete(session.id)).rejects.toMatchObject({ name: 'SessionAlreadyOwnedError' })
    expect((await session.handle.read()).events).toHaveLength(materialized ? 1 : 0)
  })

  it('refuses a writer held by another backend instance and releases a failed deletion claim', async () => {
    const { root, create } = await fixture()
    const session = await create('other-owner')
    const peer = await fixture(root)
    await expect(peer.store.delete(session.id)).rejects.toMatchObject({ name: 'SessionAlreadyOwnedError' })
    await session.handle.close()
    expect(await peer.store.delete(session.id)).toBe(true)
  })

  it('refuses a writer held by another process', async () => {
    const { root, create } = await fixture()
    const session = await create('process-owner')
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import { Context } from '@deepseek-ai/cordis';
      import SessionStore from '@deepseek-ai/dsh-session';
      import Jsonl from '@deepseek-ai/dsh-session-persistence-jsonl';
      const ctx = new Context();
      await ctx.plugin(SessionStore);
      const fiber = await ctx.plugin(Jsonl, {root: process.argv[1], compression: 'none'});
      try { await ctx.sessionPersistence.delete(process.argv[2]); process.exitCode = 2; }
      catch (error) { console.log(error.name); process.exitCode = error.name === 'SessionAlreadyOwnedError' ? 0 : 3; }
      finally { await fiber.dispose(); }
    `, root, session.id], { cwd: process.cwd(), encoding: 'utf8', timeout: 10000 })
    expect(child.status, child.stderr).toBe(0)
    expect(child.stdout).toContain('SessionAlreadyOwnedError')
  })

  it('removes every log generation while retaining the lock inode and unrelated files', async () => {
    const { root, store, create } = await fixture()
    const session = await create('generations')
    await session.handle.close()
    const directory = dirname(session.path)
    const historical = join(directory, 'session.v2.jsonl')
    await writeFile(historical, 'historical generation')
    await writeFile(join(directory, 'attachment.txt'), 'attachment')
    const lock = join(directory, 'session.lock')
    const inode = (await stat(lock)).ino
    expect(await store.delete(session.id)).toBe(true)
    expect((await stat(lock)).ino).toBe(inode)
    expect(await readdir(directory)).toEqual(expect.arrayContaining(['session.lock', 'attachment.txt']))
    expect((await readdir(directory)).filter(name => name.endsWith('.jsonl'))).toEqual([])
    const restarted = await fixture(root)
    expect(await restarted.store.stat(session.id)).toBeUndefined()
    // Reusing the id still shares the stable kernel lock with other backend instances.
    const replacement = await create('generations')
    await expect(restarted.store.open(replacement.id, 'write')).rejects.toMatchObject({ name: 'SessionAlreadyOwnedError' })
  })

  it('retains the authoritative log if syncing historical deletion fails, and can retry', async () => {
    const { store, create } = await fixture()
    const session = await create('sync-failure')
    await session.handle.close()
    await writeFile(join(dirname(session.path), 'session.v2.jsonl'), 'historical generation')
    const backend = store as unknown as { syncDirPosix(directory: string): Promise<void> }
    const sync = backend.syncDirPosix.bind(backend)
    backend.syncDirPosix = async () => { throw new Error('injected sync failure') }
    await expect(store.delete(session.id)).rejects.toThrow('injected sync failure')
    expect(await store.stat(session.id)).toBeDefined()
    backend.syncDirPosix = sync
    expect(await store.delete(session.id)).toBe(true)
  })

  it('refuses malformed headers without removing the log and releases ownership for retry', async () => {
    const { store, create } = await fixture()
    const session = await create('malformed')
    await session.handle.close()
    const log = await readFile(session.path, 'utf8')
    await writeFile(session.path, 'not-json\n')
    await expect(store.delete(session.id)).rejects.toThrow(/header|corrupt/i)
    expect(await readFile(session.path, 'utf8')).toBe('not-json\n')
    await writeFile(session.path, log)
    expect(await store.delete(session.id)).toBe(true)
  })

  it('refuses a mismatched identity and a symlinked log without touching their targets', async () => {
    const { store, create } = await fixture()
    const source = await create('source')
    const target = await create('target')
    await source.handle.close()
    await target.handle.close()
    const targetLog = await readFile(target.path, 'utf8')
    await writeFile(source.path, targetLog)
    await expect(store.delete(source.id)).rejects.toThrow(/identity|mismatch|corrupt/i)
    await rm(source.path)
    await symlink(target.path, source.path)
    await expect(store.delete(source.id)).rejects.toThrow(/identity|mismatch|generation|corrupt/i)
    expect(await readFile(target.path, 'utf8')).toBe(targetLog)
  })

  it('deletes an empty flushed session and releases its claim for a new create', async () => {
    const { store, create } = await fixture()
    const empty = await create('empty', false)
    await empty.handle.flush()
    await empty.handle.close()
    expect(await store.delete(empty.id)).toBe(true)
    const replacement = await create('empty')
    expect((await replacement.handle.read()).events).toHaveLength(1)
  })
})
