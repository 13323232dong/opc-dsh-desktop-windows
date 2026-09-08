import { describe, expect, it } from 'vitest'
import { accountKeyFor, isAccountKey } from '../../src/main/accounts/account-key'

describe('accountKeyFor', () => {
  it('derives a stable opaque key from the tenant and user boundary', () => {
    const first = accountKeyFor('tenant-a', 'user-1')
    expect(first).toBe(accountKeyFor('tenant-a', 'user-1'))
    expect(first).not.toBe(accountKeyFor('tenant-a', 'user-2'))
    expect(first).not.toContain('tenant-a')
    expect(first).not.toContain('user-1')
    expect(isAccountKey(first)).toBe(true)
  })

  it.each(['', 'acct_', 'acct_bad/path', 'other_abcdef'])('rejects invalid keys: %s', (value) => {
    expect(isAccountKey(value)).toBe(false)
  })
})
