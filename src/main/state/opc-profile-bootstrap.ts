import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { profileCordisPatchPath, profilePackageJsonPath } from './plugin-recovery'

const OPC_DESKTOP_PLUGINS = [
  ['@opc/dsh-brand', 'opc-dsh-brand-0.1.0.tgz'],
  // Desktop DSH 0.1.2 lacks the newer continuable setup hook. This reviewed
  // desktop build retains Agent Teams while deferring only that optional route
  // selection bridge to the host's provider defaults.
  ['@nanmicoder/dsh-agent-teams', 'nanmicoder-dsh-agent-teams-0.1.8-opc-desktop.4.tgz']
] as const

const CORE_BUNDLES = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']
const OPC_DESKTOP_PATCH_MARKER = '# OPC desktop baseline.'

const OPC_DESKTOP_PATCH = `# OPC desktop baseline. Community bundle patches provide the actual plugin rows.\n- id: web-fetch-http\n  config:\n    # This opt-in applies only to GitHub domains intercepted by the managed\n    # network proxy. All other non-public DNS answers remain blocked.\n    trustedProxyHostnames:\n      - github.com\n      - raw.githubusercontent.com\n      - gist.githubusercontent.com\n- id: ui-brand-official\n  disabled: true\n- id: opc-brand\n  config:\n    opcApiBaseUrl: !!js process.env.OPC_PUBLIC_API_BASE_URL ?? 'https://opc.ohmycode.cc'\n    opcWebBaseUrl: !!js process.env.OPC_WEB_BASE_URL ?? 'https://opc.ohmycode.cc'\n- id: agent-teams\n  config:\n    stateDir: .agent-teams\n    soulDirectory: .codex-opc/agents\n    ceoSoulId: ceo-opc\n    memberProvider: spawn\n    maxConcurrentLlmRequests: 1\n    minLlmRequestIntervalMs: 22000\n    llmRateLimitCooldownMs: 60000\n`

interface ProfileManifest {
  name?: string
  private?: boolean
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[]; patchReload?: string } }
}

export interface OpcDesktopProfileResult {
  changed: boolean
  plugins: string[]
}

/**
 * Materializes the small, reviewed desktop baseline after DSH creates its web
 * profile. It is intentionally limited to plugins validated for this release;
 * it never copies a user's Mac-only profile or arbitrary source paths.
 */
export async function ensureOpcDesktopProfile(dshHome: string, artifactDirectory: string): Promise<OpcDesktopProfileResult> {
  const artifacts = OPC_DESKTOP_PLUGINS.map(([name, artifact]) => ({ name, path: join(artifactDirectory, artifact) }))
  if (artifacts.some(({ path }) => !existsSync(path))) throw new Error('opc_desktop_plugin_artifact_missing')

  const manifestPath = profilePackageJsonPath(dshHome)
  const patchPath = profileCordisPatchPath(dshHome)
  await mkdir(join(dshHome, 'profiles', 'web'), { recursive: true })
  const manifest = await readManifest(manifestPath)
  const dependencies = { ...(manifest.dependencies ?? {}) }
  const bundles = [...new Set([...(manifest.dsh?.profile?.bundles ?? CORE_BUNDLES), ...CORE_BUNDLES])]
  let changed = false
  for (const { name, path } of artifacts) {
    const spec = `file:${path}`
    if (dependencies[name] !== spec) {
      dependencies[name] = spec
      changed = true
    }
    if (!bundles.includes(name)) {
      bundles.push(name)
      changed = true
    }
  }

  if (changed) {
    const next: ProfileManifest = {
      ...manifest,
      name: manifest.name ?? 'dsh-profile-web',
      private: true,
      dependencies,
      dsh: { ...(manifest.dsh ?? {}), profile: { ...(manifest.dsh?.profile ?? {}), bundles } }
    }
    await writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  }

  const currentPatch = await readFile(patchPath, 'utf8').catch(() => '')
  const normalizedPatch = removeEmptyPatchSequence(currentPatch)
  const withoutDesktopBaseline = removeDesktopBaseline(normalizedPatch)
  const nextPatch = `${withoutDesktopBaseline}${withoutDesktopBaseline ? '\n' : ''}${OPC_DESKTOP_PATCH}`
  if (nextPatch !== currentPatch.trim()) {
    await writeFile(patchPath, `${nextPatch}\n`, 'utf8')
    changed = true
  }
  return { changed, plugins: artifacts.map(({ name }) => name) }
}

/**
 * DSH's initial patch is comments followed by `[]`. Once the OPC rows exist,
 * that old empty root can still remain above them after an interrupted prior
 * launch, producing two YAML roots. Remove only standalone empty-root lines;
 * a valid patch never needs one alongside mappings.
 */
function removeEmptyPatchSequence(value: string): string {
  return value.replace(/^\s*\[\]\s*$(?:\r?\n)?/gmu, '').trim()
}

function removeDesktopBaseline(value: string): string {
  const index = value.indexOf(OPC_DESKTOP_PATCH_MARKER)
  return index < 0 ? value : value.slice(0, index).trimEnd()
}

async function readManifest(path: string): Promise<ProfileManifest> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as ProfileManifest
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
