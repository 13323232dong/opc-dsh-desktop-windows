import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainEntry = resolve(import.meta.dirname, '../../src/main/index.ts')
const preloadEntry = resolve(import.meta.dirname, '../../src/preload/index.ts')
const loginPage = resolve(import.meta.dirname, '../../build/login.html')

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

  it('exposes protected login history only through the local login page', async () => {
    const [mainSource, preloadSource, html] = await Promise.all([
      readFile(mainEntry, 'utf8'),
      readFile(preloadEntry, 'utf8'),
      readFile(loginPage, 'utf8')
    ])

    expect(mainSource).toContain("ipcMain.handle('desktop-auth:login-history'")
    expect(mainSource).toContain("ipcMain.handle('desktop-auth:login-password'")
    expect(mainSource).toContain("ipcMain.handle('desktop-auth:clear-login-password'")
    expect(preloadSource).toContain('listSavedLogins:')
    expect(preloadSource).toContain('loadSavedPassword:')
    expect(preloadSource).toContain('clearSavedPassword:')
    expect(html).toContain('id="account-history"')
    expect(html).toContain('id="remember-password"')
  })
})
