import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const main = readFileSync(join(process.cwd(), 'src', 'main', 'index.ts'), 'utf8')

describe('login navigation recovery', () => {
  it('does not surface a cancelled Windows login navigation as a fatal dialog', () => {
    expect(main).toMatch(/async function showLoginPage[\s\S]*try \{[\s\S]*window\.loadFile\(desktopResourcePath\('login\.html'\)[\s\S]*catch \(error\)[\s\S]*if \(!isAbortedNavigationError\(error\)\) throw error/u)
  })
})
