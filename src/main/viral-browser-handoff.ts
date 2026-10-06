interface ViralBrowserHandoffOptions {
  apiBaseUrl: string
  webBaseUrl: string
  sessionToken: string
  fetcher?: typeof fetch
}

/** Keeps the desktop session in the main process and returns only a one-time browser handoff. */
export async function createViralBrowserHandoffUrl(options: ViralBrowserHandoffOptions): Promise<string> {
  const api = new URL(options.apiBaseUrl)
  const web = new URL(options.webBaseUrl)
  if (!safeOrigin(api) || !safeOrigin(web) || !options.sessionToken) throw new Error('desktop_viral_handoff_config_invalid')

  const response = await (options.fetcher ?? fetch)(new URL('/api/v1/auth/console-handoffs', api), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      cookie: `opc_session=${options.sessionToken}`
    },
    body: JSON.stringify({ surface: 'merchant' }),
    signal: AbortSignal.timeout(15_000)
  })
  const payload = await response.json().catch(() => null) as { success?: unknown; data?: { exchangeUrl?: unknown } } | null
  if (!response.ok || payload?.success !== true) throw new Error(`desktop_viral_handoff_failed:${response.status}`)
  if (typeof payload.data?.exchangeUrl !== 'string') throw new Error('desktop_viral_handoff_url_invalid')

  let handoff: URL
  try { handoff = new URL(payload.data.exchangeUrl) } catch { throw new Error('desktop_viral_handoff_url_invalid') }
  if (
    handoff.origin !== web.origin ||
    handoff.pathname !== '/login/handoff' ||
    handoff.searchParams.get('surface') !== 'merchant' ||
    !/^[A-Za-z0-9_-]{32,}$/u.test(handoff.hash.slice(1)) ||
    handoff.username || handoff.password
  ) throw new Error('desktop_viral_handoff_url_invalid')

  handoff.searchParams.set('returnTo', '/viral')
  return handoff.toString()
}

function safeOrigin(url: URL): boolean {
  return !url.username && !url.password && !url.search && !url.hash && !url.pathname.replace(/\/$/u, '') && (
    url.protocol === 'https:' ||
    (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))
  )
}
