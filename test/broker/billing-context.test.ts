import { describe, expect, it } from 'vitest'
import { modelBillingAttribution } from '../../src/main/broker/billing-context'

describe('runtime billing attribution', () => {
  const headers = { 'x-deepseek-harness-session-id': 'child', 'x-opc-invocation-id': 'call1', 'x-opc-billing-context': Buffer.from(JSON.stringify({conversationId:'child',rootConversationId:'root',actionId:'action1',tenantId:'forged'})).toString('base64url') }
  it('keeps retries identical but separates explicit reruns and runtime accounts', () => {
    const first = modelBillingAttribution('r1',headers)
    expect(modelBillingAttribution('r1',headers)).toEqual(first)
    expect(modelBillingAttribution('r1',{...headers,'x-opc-invocation-id':'call2'}).idempotencyKey).not.toBe(first.idempotencyKey)
    expect(modelBillingAttribution('r2',headers).idempotencyKey).not.toBe(first.idempotencyKey)
    expect(first.billingContext).toEqual({conversationId:'child',rootConversationId:'root',actionId:'action1'})
  })
  it('never invents action association or conflates legacy identical calls', () => {
    expect(modelBillingAttribution('r',{}).billingContext).toBeUndefined()
    expect(modelBillingAttribution('r',{}).idempotencyKey).not.toBe(modelBillingAttribution('r',{}).idempotencyKey)
  })
  it('rejects malformed or conflicting context', () => {
    expect(() => modelBillingAttribution('r',{...headers,'x-deepseek-harness-session-id':'other'})).toThrow()
    expect(() => modelBillingAttribution('r',{'x-opc-billing-context':'not-json'})).toThrow()
  })
})
