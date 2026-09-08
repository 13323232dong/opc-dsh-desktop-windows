const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u

export interface DesktopPrincipal {
  tenantId: string
  userId: string
  sessionId: string
  accountKey: string
}

export interface AccountOwnerMetadata {
  schemaVersion: 1
  accountKey: string
  tenantId: string
  userId: string
  createdAt: string
  lastOpenedAt: string
}

export type AccountSwitchPhase =
  | 'signed-out'
  | 'validating'
  | 'stopping'
  | 'starting'
  | 'active'
  | 'failed'

export type PrincipalInput = Omit<DesktopPrincipal, 'accountKey'>

export function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && IDENTIFIER_PATTERN.test(value)
}

export function assertPrincipalInput(input: PrincipalInput): PrincipalInput {
  if (!isSafeIdentifier(input.tenantId)) throw new Error('desktop_invalid_tenant_id')
  if (!isSafeIdentifier(input.userId)) throw new Error('desktop_invalid_user_id')
  if (!isSafeIdentifier(input.sessionId)) throw new Error('desktop_invalid_session_id')
  return { ...input }
}
