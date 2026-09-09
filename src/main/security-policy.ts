function isHarnessUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return (
      url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
    )
  } catch {
    return false
  }
}

export function isTrustedFileUrl(rawUrl: string, trustedPath: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return parsed.protocol === 'file:' && resolve(fileURLToPath(parsed)) === resolve(trustedPath)
  } catch {
    return false
  }
}

export function isTrustedAppUrl(rawUrl: string, trustedFilePaths: readonly string[] = []): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'dsh-recovery:') return true
    if (parsed.protocol === 'file:') return trustedFilePaths.some((path) => isTrustedFileUrl(rawUrl, path))
  } catch {
    return false
  }
  return isHarnessUrl(rawUrl)
}

export function canGrantWindowPermission(
  permission: string,
  requestingUrl: string | undefined,
  isMainFrame: boolean
): boolean {
  // Electron reports getUserMedia requests as the `media` permission. Keep
  // this scoped to the trusted local Harness main frame; external pages must
  // never receive microphone access from the desktop shell.
  const isTrustedMainFrame = isMainFrame && requestingUrl !== undefined && isHarnessUrl(requestingUrl)
  return (
    isTrustedMainFrame &&
    (permission === 'clipboard-sanitized-write' || permission === 'media')
  )
}
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
