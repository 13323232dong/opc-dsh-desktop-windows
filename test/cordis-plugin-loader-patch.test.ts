import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('cordis-plugin-loader resolution patch', () => {
  it('applies dependency patches before every desktop build', async () => {
    const manifest = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts?: Record<string, string> }

    expect(manifest.scripts?.['build:patches']).toBe('patch-package --error-on-fail')
    expect(manifest.scripts?.build).toMatch(/^npm run build:patches &&/u)
  })

  it('falls back to resolving bare plugins relative to ctx.baseUrl', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+cordis-plugin-loader+1.0.3.patch'
      ),
      'utf8'
    )

    expect(patch).toContain('const req = createRequire(new URL("package.json", this.ctx.baseUrl).href)')
    expect(patch).toContain('const resolved = req.resolve(name)')
    expect(patch).toContain('return await import(pathToFileURL(resolved).href)')
  })
})
