import { describe, expect, it } from 'vitest'
import { scanClientBundleSource } from '../../packages/opc-profile/index.js'

describe('client bundle Node-only import scan', () => {
  it('accepts browser-only imports', () => {
    expect(scanClientBundleSource(
      'client/index.ts',
      'import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client"; export const mode = "web"'
    )).toEqual([])
  })

  it.each([
    'import { readFile } from "node:fs/promises"',
    'const fs = require("fs")',
    'await import("node:child_process")',
    'export { spawn } from "child_process"'
  ])('finds a Node-only dependency: %s', (source) => {
    expect(scanClientBundleSource('client/index.ts', source)).toEqual([
      expect.objectContaining({ file: 'client/index.ts', module: expect.stringMatching(/^(node:)?(fs|child_process)/u) })
    ])
  })
})
