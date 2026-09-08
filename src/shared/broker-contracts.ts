export type LocalCapability =
  | 'cloud.proxy'
  | 'filesystem.pick'
  | 'filesystem.reveal'
  | 'ego.status'
  | 'ego.launch'
  | 'ego.run'

export const LOCAL_CAPABILITIES: readonly LocalCapability[] = [
  'cloud.proxy',
  'filesystem.pick',
  'filesystem.reveal',
  'ego.status',
  'ego.launch',
  'ego.run'
]

export interface DesktopError {
  code: string
  message: string
  retryable: boolean
  requestId: string
}

export type DesktopResult<T> =
  | { success: true; data: T }
  | { success: false; error: DesktopError }

export function isLocalCapability(value: unknown): value is LocalCapability {
  return typeof value === 'string' && LOCAL_CAPABILITIES.includes(value as LocalCapability)
}

export function failure(code: string, message: string, requestId: string, retryable = false): DesktopResult<never> {
  return { success: false, error: { code, message, retryable, requestId } }
}
