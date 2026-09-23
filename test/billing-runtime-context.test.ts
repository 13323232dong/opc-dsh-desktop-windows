import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

function contextFor(session: any, sessions: Map<string, any>, turn = 2, step = 3) {
  const patch = readFileSync(new URL('../patches/@deepseek-ai+dsh-agent-loop+0.1.2-rc.1.patch', import.meta.url), 'utf8')
  const additions = patch.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.slice(1)).join('\n')
  const start = additions.indexOf('function billingContextFor(')
  const end = additions.indexOf('// END BILLING CONTEXT', start)
  const fn = runInNewContext(`(${additions.slice(start, end).trim()})`)
  return fn(session, sessions, 'agent-one', turn, step)
}

describe('runtime billing attribution', () => {
  it('uses conversation identity, not auth identity', () => {
    const result = contextFor({ id: 'conversation', header: {} }, new Map())
    expect(result).toEqual({ conversationId: 'conversation', rootConversationId: 'conversation', turnId: '2', actionId: 'model:2:3', agentId: 'agent-one', actionName: '模型调用' })
  })
  it('resolves a nested child through actual delegation lineage', () => {
    const root = { id: 'root', header: {} }
    const child = { id: 'child', header: { origin: 'subagent', parentSession: 'root' } }
    const grandchild = { id: 'grandchild', header: { origin: 'subagent', parentSession: 'child' } }
    expect(contextFor(grandchild, new Map([['root', root], ['child', child]]))).toMatchObject({ conversationId: 'grandchild', rootConversationId: 'root', taskId: 'grandchild' })
  })
  it('does not charge a manually forked conversation to its source', () => {
    expect(contextFor({ id: 'fork', header: { parentSession: 'source', isSeeded: true } }, new Map())).toMatchObject({ rootConversationId: 'fork' })
  })
  it('does not invent a root when ancestry is missing or cyclic', () => {
    const child = { id: 'child', header: { origin: 'subagent', parentSession: 'missing' } }
    expect(contextFor(child, new Map())).not.toHaveProperty('rootConversationId')
    expect(contextFor(child, new Map([['missing', child]]))).not.toHaveProperty('rootConversationId')
  })
})
