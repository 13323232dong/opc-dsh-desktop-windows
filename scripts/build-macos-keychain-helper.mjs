import { chmodSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform === 'darwin') {
  const root = dirname(dirname(fileURLToPath(import.meta.url)))
  const source = join(root, 'native', 'macos-keychain-helper.swift')
  const output = join(root, 'build', 'opc-keychain-helper')
  mkdirSync(dirname(output), { recursive: true })
  const result = spawnSync('xcrun', ['swiftc', '-O', source, '-o', output], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
  chmodSync(output, 0o755)
}
