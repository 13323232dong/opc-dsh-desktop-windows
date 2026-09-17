export interface MerchantConsoleHandoffOptions {
  apiBaseUrl: string
  accessToken: string
  /** Development-only support for an explicitly configured loopback API. */
  allowInsecureLoopback?: boolean
  fetch?: typeof fetch
}

/**
 * Exchanges the desktop's protected session for a short-lived browser handoff.
 * The browser receives only the one-time fragment token, never the desktop
 * session cookie stored in Keychain.
 */
export async function createMerchantConsoleHandoff(options: MerchantConsoleHandoffOptions): Promise<string> {
  const origin = trustedApiOrigin(options.apiBaseUrl, options.allowInsecureLoopback === true)
  const fetcher = options.fetch ?? fetch
  const response = await fetcher(new URL('/api/v1/auth/console-handoffs', origin).toString(), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      cookie: `opc_session=${options.accessToken}`
    },
    body: JSON.stringify({ surface: 'merchant' }),
    signal: AbortSignal.timeout(10_000)
  })
  const payload = await response.json().catch(() => null) as { success?: unknown; data?: { exchangeUrl?: unknown }; error?: { message?: unknown } } | null
  const exchangeUrl = payload?.data?.exchangeUrl
  if (!response.ok || payload?.success !== true) {
    throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : 'desktop_merchant_handoff_failed')
  }
  if (!isMerchantHandoffUrl(exchangeUrl, origin)) throw new Error('desktop_merchant_handoff_url_invalid')
  return exchangeUrl
}

function trustedApiOrigin(value: string, allowInsecureLoopback: boolean): URL {
  const origin = new URL(value)
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(origin.hostname)
  const secure = origin.protocol === 'https:'
  const allowedLoopback = allowInsecureLoopback && origin.protocol === 'http:' && loopback
  if ((!secure && !allowedLoopback) || origin.username || origin.password || origin.search || origin.hash) throw new Error('desktop_merchant_handoff_api_invalid')
  return new URL('/', origin)
}

function isMerchantHandoffUrl(value: unknown, origin: URL): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.origin === origin.origin
      && url.pathname === '/login/handoff'
      && url.searchParams.get('surface') === 'merchant'
      && /^[A-Za-z0-9_-]{32,128}$/u.test(url.hash.slice(1))
  } catch {
    return false
  }
}
