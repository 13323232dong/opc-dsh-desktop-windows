import { describe, expect, it } from 'vitest'
import { memberToolActivity } from '../../packages/opc-profile/agent-teams-desktop/source/lib/snapshot.js'

describe('Agent Teams Session V3 event reads', () => {
  it('reads the live session snapshot', async () => {
    let reads = 0
    const ctx = {
      agents: { get: () => ({ session: { snapshotEvents: () => { reads += 1; return [] } } }) }
    }
    expect(await memberToolActivity(ctx, 'member-1')).toEqual([])
    expect(reads).toBe(1)
  })

  it('opens stored sessions read-only and closes the handle', async () => {
    const calls = []
    const handle = {
      read: async () => { calls.push('read'); return { events: [] } },
      close: async () => { calls.push('close') }
    }
    const ctx = {
      agents: { get: () => undefined },
      get: () => ({ open: async (_id, access) => { calls.push(access); return handle } }),
      logger: { debug: () => { throw new Error('unexpected persistence error') } }
    }
    expect(await memberToolActivity(ctx, 'member-2')).toEqual([])
    expect(calls).toEqual(['read', 'read', 'close'])
  })
})
