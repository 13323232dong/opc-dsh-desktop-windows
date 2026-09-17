import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainEntry = resolve(import.meta.dirname, '../../src/main/index.ts')
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

  it('ships the full Evan login experience instead of the legacy minimal form', async () => {
    const [page, source] = await Promise.all([
      readFile(loginPage, 'utf8'),
      readFile(mainEntry, 'utf8')
    ])

    expect(page).toContain('<title>Evan-AI管家 登录</title>')
    expect(page).toContain('id="toggle-password"')
    expect(page).toContain('id="account-history"')
    expect(page).toContain('记住账号和密码')
    expect(page).toContain('id="register"')
    expect(source).toContain("ipcMain.handle('desktop-auth:login-history'")
    expect(source).toContain("ipcMain.handle('desktop-auth:login-password'")
    expect(source).toContain("ipcMain.handle('desktop-auth:registration-request-code'")
  })
})
