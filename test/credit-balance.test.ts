import { describe, expect, it } from 'vitest'
import { parseCreditBalanceResponse } from '../src/main/credit-balance'

describe('parseCreditBalanceResponse', () => {
  it('accepts the compute balance API envelope', () => {
    expect(parseCreditBalanceResponse(true, 200, {
      success: true,
      data: { credits: 1250 }
    })).toEqual({ credits: '1250', cnyEquivalent: '12.50' })
  })

  it('keeps a server-provided CNY amount', () => {
    expect(parseCreditBalanceResponse(true, 200, {
      success: true,
      data: { credits: '5000', cnyEquivalent: '45.00' }
    })).toEqual({ credits: '5000', cnyEquivalent: '45.00' })
  })

  it('surfaces the authenticated API error', () => {
    expect(() => parseCreditBalanceResponse(false, 401, {
      success: false,
      error: { message: '登录已失效，请重新登录' }
    })).toThrow('登录已失效，请重新登录')
  })
})
