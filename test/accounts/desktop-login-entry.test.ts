import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { transpileModule, ScriptTarget } from 'typescript'
import { describe, expect, it } from 'vitest'

const mainEntry = resolve(import.meta.dirname, '../../src/main/index.ts')
const loginPage = resolve(import.meta.dirname, '../../build/login.html')

describe('desktop login entry', () => {
  it('keeps login visible when an older Harness cookie cleanup completes late', async () => {
    const source = await readFile(mainEntry, 'utf8')
    const loginFunction = source.slice(
      source.indexOf('async function showLoginPage('),
      source.indexOf('async function bootstrap():')
    )
    const harnessFunction = source.slice(
      source.indexOf('async function openHarness('),
      source.indexOf('async function showSplash(')
    )
    const program = transpileModule(`
      (async () => {
        let mainWindowNavigationVersion = 0
        let rendererPluginFailureLogs = []
        let destination = 'splash'
        let stops = 0
        let finishCookieCleanup
        const cleanup = new Promise(resolve => { finishCookieCleanup = resolve })
        const mainWindow = {
          isDestroyed: () => false,
          webContents: {
            stop: () => { stops++ }, getURL: () => destination,
            session: { cookies: {} }
          },
          loadFile: async () => { destination = 'login' },
          loadURL: async () => { destination = 'harness' },
          show: () => {}, focus: () => {}
        }
        const runtime = {
          snapshot: () => ({ authToken: 'fixture', url: 'http://localhost:1234', phase: 'ready' }),
          note: () => {}
        }
        const desktopHarnessUrl = url => url
        const shouldLoadHarnessUrl = () => true
        const clearStaleHarnessAuthCookies = () => cleanup
        const clearProfileBootConfirmation = () => {}
        const desktopResourcePath = name => name
        const markHarnessRendered = () => {}
        const syncNativeTheme = async () => {}
        const raiseWindowWithoutStealingFocus = () => {}
        const isAbortedNavigationError = () => false
        const app = { isActive: () => false }
        ${harnessFunction}
        ${loginFunction}
        const oldNavigation = openHarness('http://localhost:1234')
        await showLoginPage()
        finishCookieCleanup(0)
        await oldNavigation
        return { destination, stops }
      })()
    `, { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText

    await expect(runInNewContext(program, { process: { platform: 'win32' } }))
      .resolves.toEqual({ destination: 'login', stops: 2 })
  })

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
    expect(source).toContain("ipcMain.handle('desktop-auth:current-account'")
    expect(source).toContain("!isLoginPage(mainWindow.webContents.getURL())")
    expect(source).toContain("throw new Error('desktop_auth_login_page_required')")
  })

  it('ships the full Evan login experience instead of the legacy minimal form', async () => {
    const [page, source] = await Promise.all([
      readFile(loginPage, 'utf8'),
      readFile(mainEntry, 'utf8')
    ])

    expect(page).toContain('<title>Evan超级管家 登录</title>')
    expect(page).toContain('id="toggle-password"')
    expect(page).toContain('id="account-history"')
    expect(page).toContain('记住账号和密码')
    expect(page).toContain('id="register"')
    expect(source).toContain("ipcMain.handle('desktop-auth:login-history'")
    expect(source).toContain("ipcMain.handle('desktop-auth:login-password'")
    expect(source).toContain("ipcMain.handle('desktop-auth:registration-request-code'")
    expect(page).toContain("await window.dshDesktopAuth.signIn({ username: username.value, password: password.value, rememberPassword: rememberPassword.checked })")
    expect(page).toContain("注册成功，正在进入工作区…")
  })
})
