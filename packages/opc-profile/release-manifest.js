import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

function isArtifactPath(value) {
  return typeof value === 'string' && value.startsWith('plugins/') && !value.includes('..') && !value.includes('\\')
}

function resolvedArtifact(root, artifact) {
  const base = resolve(root)
  const path = resolve(base, artifact)
  if (!path.startsWith(`${base}/`)) throw new Error('desktop_release_artifact_path_invalid')
  return path
}

/** Report missing artifacts before a release can be packaged. */
export async function verifyReleaseArtifacts(profile, root) {
  const issues = []
  for (const plugin of profile.plugins ?? []) {
    if (!isArtifactPath(plugin?.artifact)) {
      issues.push(`invalid plugin artifact: ${String(plugin?.artifact)}`)
      continue
    }
    try {
      await access(resolvedArtifact(root, plugin.artifact))
    } catch {
      issues.push(`missing plugin artifact: ${plugin.artifact}`)
    }
  }
  return issues
}

/** Build a portable, hash-addressed manifest after every artifact is present. */
export async function createReleaseManifest(profile, root, release) {
  const issues = await verifyReleaseArtifacts(profile, root)
  if (issues.length > 0) throw new Error(`desktop_release_artifacts_invalid: ${issues.join('; ')}`)
  const plugins = await Promise.all(profile.plugins.map(async (plugin) => {
    const content = await readFile(resolvedArtifact(root, plugin.artifact))
    return {
      name: plugin.name,
      version: plugin.version,
      artifact: plugin.artifact,
      sha256: createHash('sha256').update(content).digest('hex')
    }
  }))
  return {
    schemaVersion: 1,
    version: release.version,
    platform: release.platform,
    arch: release.arch,
    profileId: profile.id,
    harnessVersion: profile.harnessVersion,
    plugins
  }
}
