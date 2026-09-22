import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('platform icon generation', () => {
  it('does not invoke macOS image tooling when packaging on Windows', async () => {
    const source = await readFile(path.join(projectRoot, 'scripts', 'generate-app-icons.mjs'), 'utf8')

    expect(source).toContain("if (process.platform === 'win32')")
    expect(source).toContain("await access(icoDestination)")
    expect(source).toContain("'sips'")
  })
})
