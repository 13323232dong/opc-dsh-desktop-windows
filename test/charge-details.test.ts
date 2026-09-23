import { describe, expect, it } from 'vitest'
import { chargeDetailsQuery, parseChargeDetailsResponse } from '../src/main/charge-details'

describe('charge details secure bridge', () => {
  const row = { id: 'a', createdAt: '2026-09-23T00:00:00Z', actionName: '工具', agentId: null, provider: null, model: null, status: 'settled', billingMode: 'platform', association: 'linked', chargedCreditMicros: '1', reservedCreditMicros: '0', refundedCreditMicros: '0', billingContext: null, usage: {}, pricing: {} }
  const parsePricing = (pricing: unknown) => parseChargeDetailsResponse(true, 200, { success: true, data: { summary: row, items: [{ ...row, pricing }], nextCursor: null } }).items[0]!.pricing
  it('preserves nested historical service snapshots and exact string amounts', () => {
    const pricing = { lineItems: [{ provider: 'voice', pricing: { unitPrice: '9007199254740993', version: 1 }, usage: { seconds: 2 }, charged: true, note: null }] }
    expect(parsePricing(pricing)).toEqual(pricing)
  })
  it('rejects oversized, cyclic and unsafe snapshot shapes', () => {
    const cycle: any = {}; cycle.self = cycle
    for (const pricing of [{ lineItems: Array(101).fill(1) }, { text: 'x'.repeat(4097) }, { number: Infinity }, cycle, JSON.parse('{"__proto__":{"bad":true}}')]) expect(() => parsePricing(pricing)).toThrow('格式异常')
  })
  it('only forwards supported query fields', () => {
    expect(chargeDetailsQuery({ conversationId: 'a/b', sort: 'amount', limit: 20, tenantId: 'other' }).toString()).toBe('conversationId=a%2Fb&sort=amount&limit=20')
  })
  it('rejects invalid pagination and filters', () => {
    for (const input of [{limit: 101}, {limit: 1.5}, {sort: 'bad'}, {conversationId: ''}, {cursor: 'x'.repeat(4097)}]) {
      expect(() => chargeDetailsQuery(input)).toThrow()
    }
  })
  it('preserves exact integer amounts and projects only billing fields', () => {
    const data = {summary:{chargedCreditMicros:'9007199254740993',reservedCreditMicros:'0',refundedCreditMicros:'1'},items:[],nextCursor:null,secret:'hidden'}
    expect(parseChargeDetailsResponse(true, 200, {success:true,data})).toEqual({summary:data.summary,items:[],nextCursor:null})
  })
  it('uses Chinese safe errors and rejects corrupted amounts', () => {
    expect(() => parseChargeDetailsResponse(false,401,null)).toThrow('登录已过期')
    expect(() => parseChargeDetailsResponse(false,500,{error:{message:'sensitive provider failure'}})).toThrow('扣费明细读取失败')
    expect(() => parseChargeDetailsResponse(true,200,{success:true,data:{summary:{chargedCreditMicros:1}}})).toThrow('格式异常')
  })
})
