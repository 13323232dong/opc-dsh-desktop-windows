import { createHash } from 'node:crypto'

const ACCOUNT_KEY_PATTERN = /^acct_[a-f0-9]{32}$/u

/**
 * Stable opaque local account namespace. Tenant and user identifiers must
 * never become path components or appear in diagnostic filenames.
 */
export function accountKeyFor(tenantId: string, userId: string): string {
  const digest = createHash('sha256').update(tenantId).update('\u0000').update(userId).digest('hex')
  return `acct_${digest.slice(0, 32)}`
}

export function isAccountKey(value: unknown): value is string {
  return typeof value === 'string' && ACCOUNT_KEY_PATTERN.test(value)
}
