export interface DesktopCreditBalance {
  credits: string
  cnyEquivalent: string
}

interface CreditBalanceEnvelope {
  success?: unknown
  data?: { credits?: unknown; cnyEquivalent?: unknown }
  error?: { message?: unknown }
}

export function parseCreditBalanceResponse(responseOk: boolean, status: number, payload: CreditBalanceEnvelope | null): DesktopCreditBalance {
  if (!responseOk || payload?.success !== true) {
    throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : `desktop_credit_balance_failed:${status}`)
  }
  const credits = normalizeCredits(payload.data?.credits)
  if (credits === undefined) throw new Error(`desktop_credit_balance_failed:${status}`)
  const providedCny = payload.data?.cnyEquivalent
  const cnyEquivalent = typeof providedCny === 'string' && providedCny.trim()
    ? providedCny.trim()
    : (Number(credits) / 100).toFixed(2)
  return { credits, cnyEquivalent }
}

function normalizeCredits(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? String(value) : undefined
  if (typeof value === 'string' && /^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value.trim())) return value.trim()
  return undefined
}
