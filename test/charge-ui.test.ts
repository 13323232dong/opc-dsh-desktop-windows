import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, it, expect } from 'vitest'

function load() {
  let plugin: any
  vm.runInNewContext(readFileSync('packages/dsh-desktop-client-ui/client.js', 'utf8'), {
    window: { __ModuleLoader__: { load: (definition: any) => { plugin = definition.factory(() => ({})) } } }
  })
  return plugin
}
describe('charge details display', () => {
  it('retains microcredit precision without Number conversion', () => {
    const { formatCreditMicros } = load()
    expect(formatCreditMicros('1')).toBe('<0.0001 积分')
    expect(formatCreditMicros('0')).toBe('0 积分')
    expect(formatCreditMicros('1234567')).toBe('1.2345 积分')
    expect(formatCreditMicros('999999999999999999')).toBe('999999999999.9999 积分')
  })
  it('does not call BYOK free, and keeps unknown status explicit', () => {
    const { chargeStatus } = load()
    expect(chargeStatus({ billingMode: 'byok' })).toBe('平台未扣积分，费用由服务商结算')
    expect(chargeStatus({ status: 'reserved' })).toBe('处理中预扣')
    expect(chargeStatus({ status: 'future' })).toBe('状态待确认')
  })
  it('keeps only action-linked manual tool charges and totals their true amounts', () => {
    const { isManualToolCharge, manualChargeSummary } = load()
    const toolCharge = { chargedCreditMicros: '1200000', reservedCreditMicros: '0', refundedCreditMicros: '200000', billingContext: { actionId: 'audio-generate' } }
    const chatCharge = { chargedCreditMicros: '9999999', reservedCreditMicros: '0', refundedCreditMicros: '0', billingContext: { conversationId: 'conversation-a' } }
    const modelCharge = { chargedCreditMicros: '9999999', billingContext: { actionId: 'model:2:1' } }
    expect(isManualToolCharge(toolCharge)).toBe(true)
    expect(isManualToolCharge(chatCharge)).toBe(false)
    expect(isManualToolCharge(modelCharge)).toBe(false)
    expect(manualChargeSummary([toolCharge])).toEqual({ chargedCreditMicros: 1200000n, reservedCreditMicros: 0n, refundedCreditMicros: 200000n })
  })
  it('indexes charges by action and keeps unmatched trajectory rows at zero', () => {
    const { chargeByAction } = load()
    const charges = chargeByAction([
      { chargedCreditMicros: '300000', reservedCreditMicros: '0', refundedCreditMicros: '0', billingContext: { actionId: 'tool-a' } },
      { chargedCreditMicros: '200000', reservedCreditMicros: '100000', refundedCreditMicros: '0', billingContext: { actionId: 'tool-a' } }
    ])
    expect(charges.get('tool-a')).toEqual({ chargedCreditMicros: 500000n, reservedCreditMicros: 100000n, refundedCreditMicros: 0n })
    expect(charges.get('missing')).toBeUndefined()
  })
  it('queries only when expanded and stops polling on unmount', async () => {
    let definition: any
    let component: any
    const state: any[] = []
    const effects: Array<() => any> = []
    let index = 0
    let requests = 0
    let timer: (() => void) | undefined
    let cleared = 0
    let defer = false
    const pending: Array<(value: any) => void> = []
    const listeners = new Set()
    const React = {
      createElement: (type: any, props: any, ...children: any[]) => ({ type, props: { ...props, children } }),
      useState: (initial: any) => { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], (value: any) => { state[i] = typeof value === 'function' ? value(state[i]) : value }] },
      useRef: (initial: any) => { const i = index++; return state[i] ||= { current: initial } },
      useEffect: (effect: any) => effects.push(effect)
    }
    vm.runInNewContext(readFileSync('packages/dsh-desktop-client-ui/client.js', 'utf8'), {
      window: {
        __ModuleLoader__: { load: (value: any) => { definition = value } },
        dshDesktopCredits: { chargeDetails: async () => { requests++; if (defer) return new Promise(resolve => pending.push(resolve)); return { summary: { reservedCreditMicros: '1' }, items: [] } } },
        addEventListener: (_: any, listener: any) => listeners.add(listener),
        removeEventListener: (_: any, listener: any) => listeners.delete(listener)
      },
      setTimeout: (callback: any, delay: number) => { expect(delay).toBe(5000); timer = callback; return 1 },
      clearTimeout: () => { cleared++ }
    })
    definition.factory(() => React).apply({ slots: {
      inject: (name: string, callback: any) => name === 'conversation.trajectory.charges' && callback(),
      register: (_: any, value: any) => { component = value }
    } })
    const closed = component({ conversationId: 'a' })
    effects.pop()!()
    expect(requests).toBe(0)
    closed.props.children[0].props.onClick()
    index = 0
    component({ conversationId: 'a' })
    const cleanup = effects.pop()!()
    await Promise.resolve()
    await new Promise(resolve => setImmediate(resolve))
    expect(requests).toBe(1)
    expect(timer).toBeTypeOf('function')
    expect(listeners.size).toBe(1)
    defer = true
    timer!()
    expect(requests).toBe(2)
    cleanup()
    expect(cleared).toBeGreaterThan(0)
    expect(listeners.size).toBe(0)
    index = 0
    component({ conversationId: 'b' })
    const cleanupB = effects.pop()!()
    expect(requests).toBe(3)
    pending[0]!({ summary: { reservedCreditMicros: '0' }, items: [{ id: 'old-account-action' }] })
    await new Promise(resolve => setImmediate(resolve))
    expect(state[2]).toBeNull()
    pending[1]!({ summary: { reservedCreditMicros: '0' }, items: [] })
    await new Promise(resolve => setImmediate(resolve))
    expect(state[2].conversationId).toBe('b')
    expect(state[2].items).toEqual([])
    cleanupB()
    expect(listeners.size).toBe(0)
  })
})
