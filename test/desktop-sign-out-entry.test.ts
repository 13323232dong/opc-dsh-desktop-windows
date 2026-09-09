import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const main = readFileSync(join(process.cwd(), 'src', 'main', 'index.ts'), 'utf8')

describe('desktop sign-out entry', () => {
  it('exposes sign out in the Harness menu on every desktop platform', () => {
    const harnessMenu = main.slice(main.indexOf("label: 'Harness'"), main.indexOf("label: 'Edit'"))

    expect(harnessMenu).toContain("label: isChinese ? '退出账号' : 'Sign Out'")
    expect(harnessMenu).toContain('signOutDesktopAccount()')
  })

  it('routes the menu and renderer IPC through one account cleanup flow', () => {
    expect(main).toContain('async function signOutDesktopAccount(): Promise<void>')
    expect(main).toMatch(/async function signOutDesktopAccount[\s\S]*desktopAuthController\.signOut\(\)[\s\S]*showLoginPage\('已退出当前账号。'\)/)
    expect(main).toMatch(/async function signOutDesktopAccount[\s\S]*try \{[\s\S]*desktopAuthController\.signOut\(\)[\s\S]*finally \{[\s\S]*activeDshHome = undefined[\s\S]*showLoginPage\('已退出当前账号。'\)/)
    expect(main).toMatch(/ipcMain\.handle\('desktop-auth:sign-out',[\s\S]*await signOutDesktopAccount\(\)/)
  })
})
