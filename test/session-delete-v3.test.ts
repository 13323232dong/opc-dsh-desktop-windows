import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import { afterEach, describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const posix = process.platform !== 'win32'
const retainedLockFiles = posix ? ['session.lock'] : []
const fixtures: Array<{ root: string; dispose: () => Promise<unknown> }> = []

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'session-delete-v3-'))
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  const fiber = await ctx.plugin(JsonlSessionPersistence, { root, compression: 'none' })
  fixtures.push({ root, dispose: () => fiber.dispose() })
  const persistence = ctx.sessionPersistence as JsonlSessionPersistence & {
    delete(id: ReturnType<typeof SessionId>): Promise<boolean>
  }
  return { root, persistence }
}

async function materialize(persistence: Awaited<ReturnType<typeof fixture>>['persistence'], rawId: string) {
  const id = SessionId(rawId)
  const handle = await persistence.create({
    version: SESSION_FORMAT_VERSION, id, createdAt: 1, isSeeded: false, delegationDepth: 0
  })
  await handle.flush()
  await handle.close()
  return id
}

function sessionDir(root: string, id: string) {
  return path.join(root, '_no-cwd', id)
}

function generation(root: string, id: string, version = SESSION_FORMAT_VERSION) {
  return path.join(sessionDir(root, id), version === 0 ? 'session.jsonl' : `session.v${version}.jsonl`)
}

afterEach(async () => {
  vi.restoreAllMocks()
  for (const fixture of fixtures.splice(0)) {
    await fixture.dispose()
    await rm(fixture.root, { recursive: true, force: true })
  }
})

describe('Session V3 permanent deletion', () => {
  it('deletes only the target and rejects fresh reads without affecting another session', async () => {
    const { root, persistence } = await fixture()
    const removed = await materialize(persistence, 'removed')
    const kept = await materialize(persistence, 'kept')
    const retained = await readFile(generation(root, kept))
    const reader = await persistence.open(removed, 'read')
    const snapshot = await reader.read()

    expect(await persistence.delete(removed)).toBe(true)
    expect(await persistence.stat(removed)).toBeUndefined()
    expect((await persistence.list()).map((entry) => entry.header.id)).toEqual([kept])
    await expect(persistence.open(removed, 'read')).rejects.toThrow(/not found/)
    await expect(persistence.open(removed, 'write')).rejects.toThrow(/not found/)
    await expect(reader.read()).rejects.toThrow(/not found/)
    expect(snapshot.events).toEqual([])
    expect(await readFile(generation(root, kept))).toEqual(retained)
    expect(await persistence.delete(removed)).toBe(false)
    expect(await persistence.delete(SessionId('missing'))).toBe(false)
    await reader.close()
  })

  it('refuses pending creators and live writers, then permits deletion after close', async () => {
    const { persistence } = await fixture()
    const id = SessionId('pending')
    const owner = await persistence.create({
      version: SESSION_FORMAT_VERSION, id, createdAt: 1, isSeeded: false, delegationDepth: 0
    })
    await expect(persistence.delete(id)).rejects.toThrow(/owned/)
    await owner.flush()
    await expect(persistence.delete(id)).rejects.toThrow(/owned/)
    await owner.close()
    expect(await persistence.delete(id)).toBe(true)
  })

  it('respects a real writer in another process and releases failed local claims', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'foreign-writer')
    const script = `
      import { Context } from '@deepseek-ai/cordis';
      import SessionStore, { SessionId } from '@deepseek-ai/dsh-session';
      import Jsonl from '@deepseek-ai/dsh-session-persistence-jsonl';
      const ctx = new Context();
      await ctx.plugin(SessionStore);
      const fiber = await ctx.plugin(Jsonl, { root: process.env.DELETE_TEST_ROOT, compression: 'none' });
      const owner = await ctx.sessionPersistence.open(SessionId('foreign-writer'), 'write');
      process.stdout.write('ready\\n');
      process.stdin.once('data', async () => { await owner.close(); await fiber.dispose(); process.exit(0); });
    `
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      cwd: projectRoot, env: { ...process.env, DELETE_TEST_ROOT: root }, stdio: ['pipe', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr.on('data', (value) => { stderr += String(value) })
    try {
      await new Promise<void>((resolve, reject) => {
        child.stdout.once('data', () => resolve())
        child.once('error', reject)
        child.once('exit', (code) => reject(new Error(`writer exited ${code}: ${stderr}`)))
      })
      await expect(persistence.delete(id)).rejects.toThrow(/owned/)
      const exited = once(child, 'exit')
      child.stdin.write('close\n')
      expect((await exited)[0]).toBe(0)
      expect(await persistence.delete(id)).toBe(true)
    } finally {
      if (child.exitCode === null) {
        const exited = once(child, 'exit')
        child.kill()
        await exited
      }
    }
  }, 15000)

  it('removes every historical generation without resurrection and preserves the lock inode', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'history')
    const current = JSON.parse((await readFile(generation(root, id), 'utf8')).trim())
    await writeFile(generation(root, id, 2), `${JSON.stringify({ ...current, version: 2 })}\n`)
    const lock = path.join(sessionDir(root, id), 'session.lock')
    const before = posix ? await stat(lock, { bigint: true }) : undefined
    expect(await persistence.delete(id)).toBe(true)
    if (before) {
      const after = await stat(lock, { bigint: true })
      expect([after.dev, after.ino]).toEqual([before.dev, before.ino])
    }
    expect(await readdir(sessionDir(root, id))).toEqual(retainedLockFiles)
    await expect(persistence.open(id, 'read')).rejects.toThrow(/not found/)
    expect(await persistence.stat(id)).toBeUndefined()
    await materialize(persistence, id)
    if (before) expect((await stat(lock, { bigint: true })).ino).toBe(before.ino)
  })

  it('retains unknown files, temporary files and workspace-like directories', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'retention')
    const extra = ['attachment.txt', 'session.migration.orphan.jsonl.tmp', 'session.v03.jsonl']
    for (const name of extra) await writeFile(path.join(sessionDir(root, id), name), 'keep')
    const workspace = path.join(sessionDir(root, id), 'workspace', 'note.txt')
    await mkdir(path.dirname(workspace))
    await writeFile(workspace, 'keep workspace')
    expect(await persistence.delete(id)).toBe(true)
    for (const name of extra) expect(await readFile(path.join(sessionDir(root, id), name), 'utf8')).toBe('keep')
    expect(await readFile(workspace, 'utf8')).toBe('keep workspace')
  })

  it('encodes traversal-looking IDs without touching the neighboring session', async () => {
    const { root, persistence } = await fixture()
    const kept = await materialize(persistence, 'kept')
    const id = await materialize(persistence, '../kept')
    expect(await persistence.delete(id)).toBe(true)
    expect(await readFile(generation(root, kept), 'utf8')).toContain('kept')
  })

  it.skipIf(!posix).each(['generation', 'directory', 'lock'] as const)('refuses a symlinked %s', async (target) => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'symlink')
    const source = target === 'directory' ? sessionDir(root, id)
      : target === 'lock' ? path.join(sessionDir(root, id), 'session.lock') : generation(root, id)
    const moved = `${source}.original`
    await rename(source, moved)
    await symlink(moved, source)
    await expect(persistence.delete(id)).rejects.toThrow(/symbolic|symlink|directory|regular/i)
    expect(await stat(moved)).toBeDefined()
  })

  it('preflights all generations before deleting any, rejecting identity mismatch', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'mismatch')
    const current = JSON.parse((await readFile(generation(root, id), 'utf8')).trim())
    await writeFile(generation(root, id, 2), `${JSON.stringify({ ...current, version: 2, id: 'other' })}\n`)
    await expect(persistence.delete(id)).rejects.toThrow(/does not match|identify|identity/)
    expect(await readFile(generation(root, id), 'utf8')).toContain(id)
  })

  it.skipIf(!posix)('releases its claim and lease after a filesystem durability failure', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'failure')
    const current = JSON.parse((await readFile(generation(root, id), 'utf8')).trim())
    await writeFile(generation(root, id, 2), `${JSON.stringify({ ...current, version: 2 })}\n`)
    const backend = persistence as unknown as { syncDirPosix(dir: string): Promise<void> }
    const barrier = vi.spyOn(backend, 'syncDirPosix').mockRejectedValueOnce(new Error('injected sync failure'))
    await expect(persistence.delete(id)).rejects.toThrow('injected sync failure')
    barrier.mockRestore()
    // The newest generation stays authoritative if deleting an old one could not be made durable.
    expect(await readFile(generation(root, id), 'utf8')).toContain(id)
    const owner = await persistence.open(id, 'write')
    await owner.close()
    expect(await persistence.delete(id)).toBe(true)
  })

  it('keeps a previously observed historical snapshot but never republishes it after deletion', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'historical-reader')
    const header = JSON.parse((await readFile(generation(root, id), 'utf8')).trim())
    await writeFile(generation(root, id, 2), `${JSON.stringify({ ...header, version: 2 })}\n`)
    await rm(generation(root, id))
    const reader = await persistence.open(id, 'read')
    const snapshot = await reader.read()
    expect(await persistence.delete(id)).toBe(true)
    // Snapshot retention does not republish a generation; new handles must miss.
    expect(await reader.read()).toEqual(snapshot)
    await expect(persistence.open(id, 'read')).rejects.toThrow(/not found/)
    await expect(persistence.open(id, 'write')).rejects.toThrow(/not found/)
    expect(await readdir(sessionDir(root, id))).toEqual(retainedLockFiles)
    await reader.close()
  })

  it.each(['future', 'mixed', 'directory'] as const)('fails closed on a %s generation', async (kind) => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, `invalid-${kind}`)
    const header = JSON.parse((await readFile(generation(root, id), 'utf8')).trim())
    if (kind === 'future') {
      await writeFile(generation(root, id, SESSION_FORMAT_VERSION + 1), `${JSON.stringify({ ...header, version: SESSION_FORMAT_VERSION + 1 })}\n`)
    } else if (kind === 'mixed') {
      await writeFile(`${generation(root, id)}.zstd`, 'foreign encoding')
    } else {
      await mkdir(generation(root, id, 2))
    }
    await expect(persistence.delete(id)).rejects.toThrow()
    expect(await readFile(generation(root, id), 'utf8')).toContain(id)
  })

  it('does not delete an identity recreated by another backend before acquiring the lease', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'recreated')
    const otherCtx = new Context()
    await otherCtx.plugin(SessionStore)
    const fiber = await otherCtx.plugin(JsonlSessionPersistence, { root, compression: 'none' })
    const other = otherCtx.sessionPersistence as typeof persistence
    const backend = persistence as unknown as {
      acquireLease(id: ReturnType<typeof SessionId>, cwd?: string, dir?: string): Promise<{ release(): Promise<void> }>
    }
    const acquire = backend.acquireLease.bind(backend)
    const race = vi.spyOn(backend, 'acquireLease').mockImplementationOnce(async (...args) => {
      await other.delete(id)
      await materialize(other, id)
      return acquire(...args)
    })
    try {
      await expect(persistence.delete(id)).rejects.toThrow(/changed before deletion/)
      race.mockRestore()
      expect(await readFile(generation(root, id), 'utf8')).toContain(id)
      const writer = await persistence.open(id, 'write')
      await writer.close()
    } finally {
      await fiber.dispose()
    }
  })

  it('reports release failures after commit and still frees the local claim', async () => {
    const { root, persistence } = await fixture()
    const id = await materialize(persistence, 'release-failure')
    const backend = persistence as unknown as {
      acquireLease(id: ReturnType<typeof SessionId>, cwd?: string, dir?: string): Promise<{ release(): Promise<void> }>
    }
    const acquire = backend.acquireLease.bind(backend)
    const releaseFailure = vi.spyOn(backend, 'acquireLease').mockImplementationOnce(async (...args) => {
      const lease = await acquire(...args)
      return { release: async () => { await lease.release(); throw new Error('injected release failure') } }
    })
    await expect(persistence.delete(id)).rejects.toThrow('injected release failure')
    releaseFailure.mockRestore()
    expect(await readdir(sessionDir(root, id))).toEqual(retainedLockFiles)
    expect(await persistence.delete(id)).toBe(false)
    await materialize(persistence, id)
    expect(await persistence.delete(id)).toBe(true)
  })
})
