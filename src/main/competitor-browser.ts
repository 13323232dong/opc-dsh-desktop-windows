/** Only the running harness may hand this module to the system browser. */
export function competitorBrowserUrl(input: unknown, harnessUrl: string | undefined): string {
  if (typeof input !== 'string' || !harnessUrl) throw new Error('competitor_browser_url_invalid')
  const url = new URL(input), harness = new URL(harnessUrl)
  if (url.origin !== harness.origin || url.username || url.password ||
      url.pathname !== '/plugins/opc-douyin-comment-ops/browser' || url.search ||
      !/^#[a-f0-9]{48}$/u.test(url.hash)) throw new Error('competitor_browser_url_invalid')
  return url.toString()
}
