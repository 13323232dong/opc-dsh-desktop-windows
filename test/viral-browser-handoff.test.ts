import { describe, expect, it, vi } from 'vitest'
import { createViralBrowserHandoffUrl } from '../src/main/viral-browser-handoff'

const apiBaseUrl = 'https://opc.ohmycode.cc'
const webBaseUrl = 'https://opc.ohmycode.cc'
const exchangeUrl = `${webBaseUrl}/login/handoff?surface=merchant#${'a'.repeat(40)}`

describe('createViralBrowserHandoffUrl', () => {
  it('uses the desktop session only in the API request and keeps the one-time token in the URL fragment', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ success: true, data: { exchangeUrl } })
    })
    const url = await createViralBrowserHandoffUrl({ apiBaseUrl, webBaseUrl, sessionToken: 'secret-cookie', fetcher })
    expect(fetcher).toHaveBeenCalledWith(new URL('/api/v1/auth/console-handoffs', apiBaseUrl), expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ surface: 'merchant' }),
      headers: expect.objectContaining({ cookie: 'opc_session=secret-cookie' })
    }))
    expect(url).toBe(`${webBaseUrl}/login/handoff?surface=merchant&returnTo=%2Fviral#${'a'.repeat(40)}`)
    expect(url).not.toContain('secret-cookie')
  })

  it.each([
    'https://evil.example/login/handoff?surface=merchant#' + 'a'.repeat(40),
    'http://opc.ohmycode.cc/login/handoff?surface=merchant#' + 'a'.repeat(40),
    'https://opc.ohmycode.cc/other?surface=merchant#' + 'a'.repeat(40),
    'https://opc.ohmycode.cc/login/handoff?surface=platform_admin#' + 'a'.repeat(40),
    'https://opc.ohmycode.cc/login/handoff?surface=merchant#short'
  ])('rejects an unsafe exchange URL: %s', async (badUrl) => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ success: true, data: { exchangeUrl: badUrl } }) })
    await expect(createViralBrowserHandoffUrl({ apiBaseUrl, webBaseUrl, sessionToken: 'secret', fetcher })).rejects.toThrow('desktop_viral_handoff_url_invalid')
  })

  it('rejects failed handoffs without returning or opening a browser URL', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ success: false }) })
    await expect(createViralBrowserHandoffUrl({ apiBaseUrl, webBaseUrl, sessionToken: 'secret', fetcher })).rejects.toThrow('desktop_viral_handoff_failed:401')
  })
})
