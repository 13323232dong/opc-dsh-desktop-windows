import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

describe('desktop media runtime wiring', () => {
  it('injects the local media runtime into the loopback Broker from the desktop composition root', async () => {
    const source = await readFile(join(process.cwd(), 'src/main/index.ts'), 'utf8')

    expect(source).toContain("import { createDesktopMediaRuntime } from './broker/desktop-media-runtime'")
    expect(source).toContain("const mediaRuntime = createDesktopMediaRuntime(app.getPath('userData'))")
    expect(source).toContain('new LocalCapabilityBroker({')
    expect(source).toContain('cloudBaseUrl: apiBaseUrl')
    expect(source).toContain('mediaRuntime')
  })
})
