export interface DesktopProfilePlugin {
  readonly name: string
  readonly version: string
  readonly artifact: string
  readonly client: boolean
  readonly clientInject: readonly string[]
  readonly requires: readonly string[]
}

export interface DesktopProfileManifest {
  readonly schemaVersion: 1
  readonly id: 'opc-macos-desktop'
  readonly harnessVersion: string
  readonly plugins: readonly [DesktopProfilePlugin, ...DesktopProfilePlugin[]]
}

export interface PluginCompatibilityEntry {
  readonly name: string
  readonly clientBundle: boolean
  readonly desktopDisposition: string
  readonly harnessTarget: string
  readonly status: string
}

export interface ClientBundleFinding {
  readonly file: string
  readonly module: string
}

export const DESKTOP_PROFILE_MANIFEST: DesktopProfileManifest
export const OPC_PLUGIN_COMPATIBILITY_MATRIX: readonly PluginCompatibilityEntry[]
export function createDesktopProfileManifest(
  overrides?: Record<string, unknown>
): DesktopProfileManifest
export function validateDesktopProfile(candidate: unknown): string[]
export function scanClientBundleSource(file: string, source: string): ClientBundleFinding[]
