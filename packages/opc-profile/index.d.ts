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
  readonly id: 'opc-desktop'
  readonly harnessVersion: string
  readonly plugins: readonly [DesktopProfilePlugin, ...DesktopProfilePlugin[]]
}

export interface PluginCompatibilityEntry {
  readonly name: string
  readonly clientBundle: boolean
  readonly desktopDisposition: 'client-and-runtime' | 'runtime-only' | 'broker-adapter'
  readonly windowsDisposition: 'supported' | 'requires-browser-provider' | 'requires-native-adapter'
  readonly harnessTarget: string
  readonly status: string
}

export const DESKTOP_PROFILE_MANIFEST: DesktopProfileManifest
export const OPC_PLUGIN_COMPATIBILITY_MATRIX: readonly PluginCompatibilityEntry[]
export function createDesktopProfileManifest(overrides?: Partial<DesktopProfileManifest>): DesktopProfileManifest
export function validateDesktopProfile(candidate: unknown): string[]
export function scanClientBundleSource(file: string, source: string): { file: string; module: string }[]
