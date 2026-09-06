export interface ReleaseProfileInput {
  readonly id: string
  readonly harnessVersion: string
  readonly plugins: readonly { readonly name: string; readonly version: string; readonly artifact: string }[]
}

export interface DesktopReleasePlugin {
  readonly name: string
  readonly version: string
  readonly artifact: string
  readonly sha256: string
}

export interface DesktopReleaseManifest {
  readonly schemaVersion: 1
  readonly version: string
  readonly platform: NodeJS.Platform
  readonly arch: string
  readonly profileId: string
  readonly harnessVersion: string
  readonly plugins: readonly DesktopReleasePlugin[]
}

export function verifyReleaseArtifacts(profile: ReleaseProfileInput, root: string): Promise<string[]>
export function createReleaseManifest(
  profile: ReleaseProfileInput,
  root: string,
  release: { version: string; platform: NodeJS.Platform; arch: string }
): Promise<DesktopReleaseManifest>
