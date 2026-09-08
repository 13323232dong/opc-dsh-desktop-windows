import type { DesktopPrincipal } from './account-contracts'

export interface RuntimeDescriptor {
  runtimeId: string
  accountKey: string
  dshHome: string
  workspace: string
  dshOrigin: string
  brokerOrigin: string
  startedAt: string
}

export interface AccountRuntimeContext {
  principal: DesktopPrincipal
  descriptor: RuntimeDescriptor
}

export function isLoopbackOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && (
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1' ||
      url.hostname === '[::1]'
    )
  } catch {
    return false
  }
}
