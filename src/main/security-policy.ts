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

export function isTrustedAppUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'file:' || parsed.protocol === 'dsh-recovery:') return true
  } catch {
    return false
  }
  return isHarnessUrl(rawUrl)
}

type MediaPermissionDetails = {
  readonly mediaType?: 'audio' | 'video' | 'unknown'
  readonly mediaTypes?: readonly ('audio' | 'video')[]
}

function isAudioOnlyMediaRequest(details: unknown): boolean {
  if (!details || typeof details !== 'object') return false
  const request = details as MediaPermissionDetails
  if (request.mediaType !== undefined) return request.mediaType === 'audio'
  return request.mediaTypes?.length === 1 && request.mediaTypes[0] === 'audio'
}

export function canGrantWindowPermission(
  permission: string,
  requestingUrl: string | undefined,
  isMainFrame: boolean,
  mediaDetails?: unknown
): boolean {
  if (!isMainFrame || requestingUrl === undefined || !isHarnessUrl(requestingUrl)) return false
  if (permission === 'clipboard-sanitized-write') return true
  return permission === 'media' && isAudioOnlyMediaRequest(mediaDetails)
}
