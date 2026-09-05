import { describe, expect, it } from 'vitest'
import { assertPrincipalInput, isSafeIdentifier } from '../../src/shared/account-contracts'
import { failure, isLocalCapability } from '../../src/shared/broker-contracts'
import { isLoopbackOrigin } from '../../src/shared/runtime-contracts'

describe('desktop shared contracts', () => {
  it('accepts bounded opaque identity identifiers and copies the input', () => {
    const input = { tenantId: 'tenant-a', userId: 'user_a', sessionId: 'session:1' }
    const result = assertPrincipalInput(input)

    expect(result).toEqual(input)
    expect(result).not.toBe(input)
  })

  it.each(['', '../tenant', 'tenant/a', 'x'.repeat(129), ' tenant'])('rejects unsafe identifiers: %j', (value) => {
    expect(isSafeIdentifier(value)).toBe(false)
  })

  it('rejects invalid principal boundaries by field', () => {
    expect(() => assertPrincipalInput({ tenantId: 'ok', userId: '../user', sessionId: 'session' })).toThrow('desktop_invalid_user_id')
  })

  it('allows only declared local capabilities', () => {
    expect(isLocalCapability('ego.run')).toBe(true)
    expect(isLocalCapability('shell.execute')).toBe(false)
  })

  it('makes errors safe to carry across process boundaries', () => {
    expect(failure('desktop_denied', '不允许访问该本机能力', 'request-1')).toEqual({
      success: false,
      error: { code: 'desktop_denied', message: '不允许访问该本机能力', retryable: false, requestId: 'request-1' }
    })
  })

  it.each([
    ['http://127.0.0.1:32100', true],
    ['http://[::1]:32100', true],
    ['https://127.0.0.1:32100', false],
    ['http://localhost:32100', false],
    ['not a url', false]
  ])('validates loopback origins: %s', (origin, expected) => {
    expect(isLoopbackOrigin(origin)).toBe(expected)
  })
})
