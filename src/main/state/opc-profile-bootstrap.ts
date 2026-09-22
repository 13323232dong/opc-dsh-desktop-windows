import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { disableGeneration } from 'dsh-desktop-market-installer/generations/registry'
import { profileCordisPatchPath, profilePackageJsonPath } from './plugin-recovery'

export const OPC_DESKTOP_PLUGINS = [
  ['@opc/dsh-second-brain', 'opc-dsh-second-brain-0.1.6.tgz'],
  ['@opc/dsh-brand', 'opc-dsh-brand-0.1.4.tgz', undefined],
  // Desktop DSH 0.1.2 lacks the newer continuable setup hook. This reviewed
  // desktop build retains Agent Teams while deferring only that optional route
  // selection bridge to the host's provider defaults.
  ['@nanmicoder/dsh-agent-teams', 'nanmicoder-dsh-agent-teams-0.1.8-opc-desktop.7.tgz'],
  ['@opc/dsh-assets', 'opc-dsh-assets-0.1.5.tgz'],
  ['@opc/dsh-assets-workbench', 'opc-dsh-assets-workbench-0.1.1.tgz'],
  ['@opc/dsh-file-attachments', 'opc-dsh-file-attachments-0.1.0.tgz'],
  ['dsh-file-picker', 'dsh-file-picker-0.1.0.tgz'],
  ['@opc/dsh-douyin-comment-ops', 'opc-dsh-douyin-comment-ops-0.1.4.tgz', 'opc-dsh-douyin-comment-ops-0.1.3.tgz', 'opc-dsh-douyin-comment-ops-0.1.0.tgz'],
  ['@opc/dsh-douyin-publisher', 'opc-dsh-douyin-publisher-0.1.0.tgz'],
  ['@opc/dsh-feishu-docs', 'opc-dsh-feishu-docs-0.1.0.tgz'],
  ['@opc/dsh-context-retrieval', 'opc-dsh-context-retrieval-0.1.1.tgz'],
  ['@omdsh-dev/dsh-genui', 'omdsh-dev-dsh-genui-0.9.1.tgz'],
  ['@opc/dsh-publish-precheck', 'opc-dsh-publish-precheck-0.1.0.tgz'],
  ['DSH-opc-material-matcher', 'DSH-opc-material-matcher-0.1.0.tgz'],
  ['@opc/dsh-realtime-voice', 'opc-dsh-realtime-voice-0.1.9.tgz'],
  ['@opc/dsh-session-context', 'opc-dsh-session-context-0.1.0.tgz'],
  ['@opc/dsh-task-tracker', 'opc-dsh-task-tracker-0.1.0.tgz'],
  ['@opc/dsh-viral-chase', 'opc-dsh-viral-chase-0.1.42.tgz'],
  ['@opc/dsh-dev-status-control', 'opc-dsh-dev-status-control-0.2.8.tgz'],
  ['@opc/DSH-ai-customer-service', 'opc-DSH-ai-customer-service-0.1.23.tgz']
] as const

const CORE_BUNDLES = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app']

const RETIRED_OPC_DESKTOP_PLUGINS = [
  '@opc/DSH-dong-computer-use',
  '@opc/dsh-desktop-orb',
  '@opc/dsh-dong-mobile-control',
  '@opc/dsh-inspiration'
]

const OPC_DESKTOP_MANAGED_PLUGIN_NAMES = new Set<string>([
  ...OPC_DESKTOP_PLUGINS.map(([name]) => name),
  ...RETIRED_OPC_DESKTOP_PLUGINS
])

const OPC_DESKTOP_PATCH_MARKER = '# OPC desktop baseline.'
const OPC_DESKTOP_PATCH = `${OPC_DESKTOP_PATCH_MARKER} Community bundle patches provide the actual plugin rows.\n- id: ui-brand-official\n  disabled: true\n- id: opc-brand\n  config:\n    desktopMode: true\n    opcApiBaseUrl: !!js process.env.OPC_PUBLIC_API_BASE_URL ?? 'https://opc.ohmycode.cc'\n    opcWebBaseUrl: !!js process.env.OPC_WEB_BASE_URL ?? 'https://opc.ohmycode.cc'\n- id: agent-teams\n  config:\n    stateDir: .agent-teams\n    soulDirectory: .codex-opc/agents\n    ceoSoulId: ceo-opc\n    memberProvider: spawn\n    maxConcurrentLlmRequests: 1\n    minLlmRequestIntervalMs: 22000\n    llmRateLimitCooldownMs: 60000\n    controlPlaneEnabled: true\n    controlPlaneApiBaseUrl: !!js process.env.OPC_PUBLIC_API_BASE_URL ?? 'https://opc.ohmycode.cc'\n    controlPlaneRegistryBaseUrl: !!js process.env.OPC_PUBLIC_API_BASE_URL ?? 'https://opc.ohmycode.cc'\n    opcApiBaseUrl: !!js process.env.OPC_PUBLIC_API_BASE_URL ?? 'https://opc.ohmycode.cc'\n    harnessBaseUrl: !!js process.env.OPC_PUBLIC_API_BASE_URL ?? 'https://opc.ohmycode.cc'\n    controlPlaneIdentityHmacSecret: !!js process.env.IDENTITY_HMAC_SECRET ?? ''\n    identityHmacSecret: !!js process.env.OPC_DSH_IDENTITY_HMAC_SECRET ?? ''\n- id: agent-default-model\n  config:\n    provider: deepseek-official\n    model: deepseek-flash\n`

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
 * Generation pointers are derived from prior desktop releases. A bundled
 * plugin must never keep resolving through an older generation after the
 * desktop package upgrades it. This only disables names owned by this
 * baseline; third-party and user-installed generations stay untouched.
 */
export async function reconcileOpcDesktopGenerations(dshHome: string): Promise<string[]> {
  const removed: string[] = []
  for (const name of OPC_DESKTOP_MANAGED_PLUGIN_NAMES) {
    if (await disableGeneration(dshHome, name)) removed.push(name)
  }
  return removed
}

/**
 * Materializes the small, reviewed desktop baseline after DSH creates its web
 * profile. It is intentionally limited to plugins validated for this release;
 * it never copies a user's Mac-only profile or arbitrary source paths.
 */
export async function ensureOpcDesktopProfile(dshHome: string, artifactDirectory: string): Promise<OpcDesktopProfileResult> {
  const candidates = OPC_DESKTOP_PLUGINS.map(([name, artifact, fallback]) => ({
    name,
    path: join(artifactDirectory, existsSync(join(artifactDirectory, artifact)) ? artifact : (fallback ?? artifact))
  }))
  const artifacts = candidates.filter(({ path }) => existsSync(path))
  if (artifacts.length !== candidates.length) throw new Error('opc_desktop_plugin_artifact_missing')

  const manifestPath = profilePackageJsonPath(dshHome)
  const patchPath = profileCordisPatchPath(dshHome)
  await mkdir(join(dshHome, 'profiles', 'web'), { recursive: true })
  const manifest = await readManifest(manifestPath)
  const dependencies = { ...(manifest.dependencies ?? {}) }
  const bundles = [...new Set([...(manifest.dsh?.profile?.bundles ?? CORE_BUNDLES), ...CORE_BUNDLES])]
  let changed = removeRetiredOpcDesktopEntries(dependencies, bundles)
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
  if (!normalizedPatch.includes('# OPC desktop baseline.')) {
    await writeFile(patchPath, `${normalizedPatch}${normalizedPatch ? '\n' : ''}${OPC_DESKTOP_PATCH}`, 'utf8')
    changed = true
  } else if (normalizedPatch !== currentPatch.trim()) {
    await writeFile(patchPath, `${normalizedPatch}\n`, 'utf8')
    changed = true
  }
  return { changed, plugins: artifacts.map(({ name }) => name) }
}

function removeRetiredOpcDesktopEntries(
  dependencies: Record<string, string>,
  bundles: string[]
): boolean {
  let changed = false
  for (const name of RETIRED_OPC_DESKTOP_PLUGINS) {
    if (dependencies[name] !== undefined) {
      delete dependencies[name]
      changed = true
    }
    const index = bundles.indexOf(name)
    if (index !== -1) {
      bundles.splice(index, 1)
      changed = true
    }
  }
  return changed
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

async function readManifest(path: string): Promise<ProfileManifest> {
  try {
    const parsed = JSON.parse(await readFile(path, 'utf8')) as ProfileManifest
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
