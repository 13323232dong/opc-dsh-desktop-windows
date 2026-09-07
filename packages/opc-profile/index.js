const CLIENT_MODULES = [
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-client-ui-conversation',
  '@deepseek-ai/dsh-client-ui-layout',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-settings',
  '@deepseek-ai/dsh-client-ui-sidebar',
  '@deepseek-ai/dsh-client-ui-slots'
]

const NODE_ONLY_MODULES = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants',
  'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain', 'events', 'fs',
  'http', 'http2', 'https', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'string_decoder', 'sys', 'timers', 'tls', 'trace_events', 'tty', 'url',
  'util', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
])

const PLUGINS = [
  ['@opc/dsh-brand', true, ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-sidebar', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-locale']],
  ['@nanmicoder/dsh-agent-teams', true, ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-slots']],
  ['@opc/dsh-assets', true, ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation']],
  ['@opc/dsh-assets-workbench', true, ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation']],
  ['@opc/dsh-file-attachments', true, ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation']],
  ['dsh-file-picker', true, ['@deepseek-ai/dsh-client-runtime']],
  ['@opc/dsh-douyin-comment-ops', true, ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation']],
  ['@opc/dsh-douyin-publisher', false, []],
  ['@opc/dsh-feishu-docs', false, []],
  ['@opc/dsh-context-retrieval', false, []],
  ['@omdsh-dev/dsh-genui', true, []],
  ['@opc/dsh-publish-precheck', false, []],
  ['DSH-opc-material-matcher', false, []],
  ['@opc/dsh-realtime-voice', true, ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-layout']],
  ['@opc/dsh-task-tracker', true, ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-slots']],
  ['@opc/dsh-viral-chase', true, ['@deepseek-ai/dsh-client-runtime', '@deepseek-ai/dsh-client-ui-conversation']],
  ['@opc/dsh-session-context', true, ['@deepseek-ai/dsh-client-runtime']]
]

function artifactFor(name) {
  const artifacts = {
    '@opc/dsh-brand': 'opc-dsh-brand-0.1.0-opc-desktop.2.tgz',
    '@nanmicoder/dsh-agent-teams': 'nanmicoder-dsh-agent-teams-0.1.8-opc-desktop.5.tgz',
    '@opc/dsh-assets': 'opc-dsh-assets-0.1.1.tgz',
    '@opc/dsh-assets-workbench': 'opc-dsh-assets-workbench-0.1.0-opc-desktop.2.tgz',
    '@opc/dsh-file-attachments': 'opc-dsh-file-attachments-0.1.0.tgz',
    'dsh-file-picker': 'dsh-file-picker-0.1.0.tgz',
    '@opc/dsh-douyin-comment-ops': 'opc-dsh-douyin-comment-ops-0.1.0.tgz',
    '@opc/dsh-douyin-publisher': 'opc-dsh-douyin-publisher-0.1.0.tgz',
    '@opc/dsh-feishu-docs': 'opc-dsh-feishu-docs-0.1.0.tgz',
    '@opc/dsh-context-retrieval': 'opc-dsh-context-retrieval-0.1.1.tgz',
    '@omdsh-dev/dsh-genui': 'omdsh-dev-dsh-genui-0.9.1.tgz',
    '@opc/dsh-publish-precheck': 'opc-dsh-publish-precheck-0.1.0.tgz',
    'DSH-opc-material-matcher': 'DSH-opc-material-matcher-0.1.0.tgz',
    '@opc/dsh-realtime-voice': 'opc-dsh-realtime-voice-0.1.0.tgz',
    '@opc/dsh-session-context': 'opc-dsh-session-context-0.1.0.tgz',
    '@opc/dsh-task-tracker': 'opc-dsh-task-tracker-0.1.0.tgz',
    '@opc/dsh-viral-chase': 'opc-dsh-viral-chase-0.1.0.tgz'
  }
  return `plugins/${artifacts[name]}`
}

function versionFor(name) {
  if (name === '@nanmicoder/dsh-agent-teams') return '0.1.8-opc-desktop.5'
  if (name === '@opc/dsh-assets' || name === '@opc/dsh-context-retrieval') return '0.1.1'
  if (name === '@omdsh-dev/dsh-genui') return '0.9.1'
  return '0.1.0'
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

function clone(value) {
  return structuredClone(value)
}

const profile = {
  schemaVersion: 1,
  id: 'opc-desktop',
  harnessVersion: '0.1.2-rc.1',
  plugins: PLUGINS.map(([name, client, clientInject]) => ({
    name,
    version: versionFor(name),
    artifact: artifactFor(name),
    client,
    clientInject,
    requires: []
  }))
}

export const DESKTOP_PROFILE_MANIFEST = deepFreeze(profile)

export const OPC_PLUGIN_COMPATIBILITY_MATRIX = deepFreeze([
  ...DESKTOP_PROFILE_MANIFEST.plugins.map((plugin) => ({
    name: plugin.name,
    clientBundle: plugin.client,
    desktopDisposition: plugin.name === '@opc/DSH-dong-computer-use'
      ? 'broker-adapter'
      : plugin.client ? 'client-and-runtime' : 'runtime-only',
    windowsDisposition: windowsDispositionFor(plugin.name),
    harnessTarget: '0.1.2-rc.1',
    status: 'requires-adapter-validation'
  })),
  {
    name: '@opc/dsh-feishu-docs',
    clientBundle: false,
    desktopDisposition: 'runtime-only',
    windowsDisposition: 'requires-browser-provider',
    harnessTarget: '0.1.2-rc.1',
    status: 'deferred-until-windows-provider-validation'
  },
  {
    name: '@opc/dsh-dong-mobile-control',
    clientBundle: false,
    desktopDisposition: 'broker-adapter',
    windowsDisposition: 'requires-native-adapter',
    harnessTarget: '0.1.2-rc.1',
    status: 'deferred-until-windows-adapter-validation'
  },
  {
    name: '@opc/DSH-dong-computer-use',
    clientBundle: false,
    desktopDisposition: 'broker-adapter',
    windowsDisposition: 'requires-native-adapter',
    harnessTarget: '0.1.2-rc.1',
    status: 'deferred-until-windows-adapter-validation'
  }
])

export function createDesktopProfileManifest(overrides = {}) {
  const next = { ...clone(DESKTOP_PROFILE_MANIFEST), ...clone(overrides) }
  return deepFreeze(next)
}

function isPortableArtifact(value) {
  return typeof value === 'string' &&
    value.startsWith('plugins/') &&
    value.endsWith('.tgz') &&
    !value.includes('..') &&
    !value.includes('node_modules') &&
    !value.includes('\\') &&
    !value.includes(':')
}

export function validateDesktopProfile(candidate) {
  const issues = []
  if (!candidate || candidate.schemaVersion !== 1 || candidate.id !== 'opc-desktop') {
    return ['profile has an unsupported identity or schema version']
  }
  if (!Array.isArray(candidate.plugins)) return ['profile plugins must be an array']

  const registered = new Set(DESKTOP_PROFILE_MANIFEST.plugins.map((plugin) => plugin.name))
  const declared = new Set()
  for (const plugin of candidate.plugins) {
    if (!plugin || typeof plugin.name !== 'string') {
      issues.push('profile contains a plugin without a package name')
      continue
    }
    if (declared.has(plugin.name)) issues.push(`plugin ${plugin.name} is declared more than once`)
    declared.add(plugin.name)
    if (!registered.has(plugin.name)) issues.push(`plugin ${plugin.name} is not registered for this desktop profile`)
    if (!isPortableArtifact(plugin.artifact)) issues.push(`plugin ${plugin.name} has a non-portable artifact path`)
    if (!Array.isArray(plugin.clientInject) || !Array.isArray(plugin.requires)) {
      issues.push(`plugin ${plugin.name} has invalid dependency declarations`)
      continue
    }
    for (const module of plugin.clientInject) {
      if (!CLIENT_MODULES.includes(module)) issues.push(`plugin ${plugin.name} injects unavailable client module ${module}`)
    }
    for (const dependency of plugin.requires) {
      if (!registered.has(dependency)) issues.push(`plugin ${plugin.name} requires unregistered package ${dependency}`)
    }
  }
  return issues
}

function windowsDispositionFor(name) {
  if (name === '@opc/DSH-dong-computer-use' || name === '@opc/dsh-dong-mobile-control') {
    return 'requires-native-adapter'
  }
  if (name === '@opc/dsh-feishu-docs') return 'requires-browser-provider'
  return 'supported'
}

function importedModules(source) {
  const modules = []
  const patterns = [
    /\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/gu
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) modules.push(match[1])
  }
  return modules
}

export function scanClientBundleSource(file, source) {
  const findings = []
  for (const specifier of importedModules(source)) {
    const module = specifier.startsWith('node:') ? specifier.slice(5).split('/')[0] : specifier.split('/')[0]
    if (NODE_ONLY_MODULES.has(module)) findings.push({ file, module: specifier })
  }
  return findings
}
