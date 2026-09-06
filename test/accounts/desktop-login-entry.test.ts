import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainEntry = resolve(import.meta.dirname, '../../src/main/index.ts')

describe('desktop login entry', () => {
  it('does not start a shared Harness when account restoration returns no session', async () => {
    const source = await readFile(mainEntry, 'utf8')
    const bootstrap = source.slice(source.indexOf('async function bootstrap(): Promise<void>'))

    expect(bootstrap).toContain('const restored = await desktopAuthController.restore()')
    expect(bootstrap).toContain('await showLoginPage()')
    expect(bootstrap).not.toContain("} else {\n    await launchHarness()\n  }\n  if (!developmentBuild)")
  })

  it('accepts credentials only from the local login page in the main frame', async () => {
    const source = await readFile(mainEntry, 'utf8')

    expect(source).toContain("ipcMain.handle('desktop-auth:sign-in'")
    expect(source).toContain("!isLoginPage(mainWindow.webContents.getURL())")
    expect(source).toContain("throw new Error('desktop_auth_login_page_required')")
  })
})
