import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const login = readFileSync(join(process.cwd(), 'build', 'login.html'), 'utf8')
const preload = readFileSync(join(process.cwd(), 'src', 'preload', 'index.ts'), 'utf8')
const main = readFileSync(join(process.cwd(), 'src', 'main', 'index.ts'), 'utf8')

describe('desktop login history UI', () => {
  it('offers cached accounts, remembered passwords, and an accessible visibility toggle', () => {
    expect(login).toContain('id="account-history"')
    expect(login).toContain('list="account-history"')
    expect(login).toContain('id="remember-password"')
    expect(login).not.toMatch(/id="remember-password"[^>]*checked/u)
    expect(login).toContain('id="toggle-password"')
    expect(login).toContain('id="clear-saved-password"')
    expect(login).toContain("password.type = password.type === 'password' ? 'text' : 'password'")
    expect(login).toContain('window.dshDesktopAuth.listSavedLogins()')
    expect(login).toContain('window.dshDesktopAuth.loadSavedPassword(account)')
    expect(login).toContain('passwordEditVersion')
    expect(login).toMatch(/password\.addEventListener\('input',[\s\S]*passwordEditVersion \+= 1/u)
    expect(login).toMatch(/editVersion !== passwordEditVersion[\s\S]*password\.value/u)
  })

  it('keeps password history behind login-page-only IPC and saves only after successful login', () => {
    expect(preload).toContain("listSavedLogins: (): Promise<Array<{ username: string; hasPassword: boolean }>> => ipcRenderer.invoke('desktop-auth:login-history')")
    expect(preload).toContain("loadSavedPassword: (username: string): Promise<string | undefined> => ipcRenderer.invoke('desktop-auth:login-password', username)")
    expect(preload).toContain("clearSavedPassword: (username: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('desktop-auth:clear-login-password', username)")
    expect(main).toMatch(/ipcMain\.handle\('desktop-auth:login-history',[\s\S]*assertTrustedLoginPageEvent\(event\)/)
    expect(main).toMatch(/ipcMain\.handle\('desktop-auth:login-password',[\s\S]*assertTrustedLoginPageEvent\(event\)/)
    expect(main).toMatch(/ipcMain\.handle\('desktop-auth:clear-login-password',[\s\S]*assertTrustedLoginPageEvent\(event\)/)
    expect(main).toContain('isTrustedFileUrl(url, desktopResourcePath(\'login.html\'))')
    expect(main).toContain('isLoginPage(event.senderFrame.url)')
    expect(main).toMatch(/desktopAuthController!\.signIn\([\s\S]*loginHistoryStore\.record/)
  })
})
