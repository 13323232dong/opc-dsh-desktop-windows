import { createHash } from 'node:crypto'

const ACCOUNT_KEY_PATTERN = /^[a-f0-9]{64}$/u

/**
 * Stable opaque local account namespace. Tenant and user identifiers must
 * never become path components or appear in diagnostic filenames.
 */
export function accountKeyFor(tenantId: string, userId: string): string {
  return createHash('sha256')
    .update(`opc-account-v1\n${tenantId}\n${userId}`)
    .digest('hex')
}

export function isAccountKey(value: unknown): value is string {
  return typeof value === 'string' && ACCOUNT_KEY_PATTERN.test(value)
}
