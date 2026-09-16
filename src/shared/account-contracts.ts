const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u

export interface DesktopPrincipal {
  tenantId: string
  userId: string
  sessionId: string
  accountKey: string
  /** Server-asserted labels used only for local DSH account display. */
  tenantName?: string
  accountName?: string
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

export interface DesktopAccountProjection {
  authenticated: true
  userId: string
  tenantName?: string
  accountName?: string
}

export function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && IDENTIFIER_PATTERN.test(value)
}

export function assertPrincipalInput(input: PrincipalInput): PrincipalInput {
  if (!isSafeIdentifier(input.tenantId)) throw new Error('desktop_invalid_tenant_id')
  if (!isSafeIdentifier(input.userId)) throw new Error('desktop_invalid_user_id')
  if (!isSafeIdentifier(input.sessionId)) throw new Error('desktop_invalid_session_id')
  return {
    tenantId: input.tenantId,
    userId: input.userId,
    sessionId: input.sessionId,
    ...(safeDisplayName(input.tenantName) ? { tenantName: safeDisplayName(input.tenantName) } : {}),
    ...(safeDisplayName(input.accountName) ? { accountName: safeDisplayName(input.accountName) } : {})
  }
}

function safeDisplayName(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized && normalized.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(normalized) ? normalized : undefined
}

/** The renderer receives labels and an opaque user identifier, never credentials. */
export function desktopAccountProjection(principal: DesktopPrincipal): DesktopAccountProjection {
  return {
    authenticated: true,
    userId: principal.userId,
    ...(safeDisplayName(principal.tenantName) ? { tenantName: safeDisplayName(principal.tenantName) } : {}),
    ...(safeDisplayName(principal.accountName) ? { accountName: safeDisplayName(principal.accountName) } : {})
  }
}
