import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClientModuleRegistry } from '@deepseek-ai/dsh-client-modules'
import { EntryTree } from '@deepseek-ai/cordis-plugin-loader'
import * as llm from '@deepseek-ai/dsh-llm'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
const packageFile = (name: string, file: string) => path.resolve('node_modules/@deepseek-ai', name, file)

// Execute the actual installed function, with the official 0.1.5 classifiers.
async function installedFunction(name: string, file: string, functionName: string) {
  const source = await readFile(packageFile(name, file), 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  let declaration: ts.FunctionDeclaration | undefined
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) declaration = node
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (!declaration) throw new Error(`Missing function ${functionName} in ${name}`)
  return runInNewContext(`(${declaration.getText(ast)})`, { ...llm })
}

async function fixture() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'dsh-015-resolution-')))
  roots.push(root)
  const dir = path.join(root, 'node_modules', 'desktop-fixture-plugin')
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(root, 'package.json'), '{"private":true}')
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'desktop-fixture-plugin', type: 'module', main: 'index.js' }))
  await writeFile(path.join(dir, 'index.js'), 'export const fixture = "profile-local";')
  return { root, dir, baseUrl: pathToFileURL(path.join(root, 'package.json')).href }
}

describe('0.1.5 installed desktop patch behavior', () => {
  it('exposes desktop dependencies from the installed CLI manifest', async () => {
    const manifestPath = packageFile('dsh', 'package.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
    const require = createRequire(manifestPath)
    for (const name of ['dsh-ppt-composer', 'dsh-desktop-client-ui', 'dsh-desktop-hmr-fallback', 'dsh-desktop-market-installer', 'dsh-desktop-preset-transfer']) {
      const dependency = JSON.parse(await readFile(require.resolve(`${name}/package.json`), 'utf8'))
      expect(manifest.dependencies[name]).toBe(dependency.version)
    }
  })

  it('installs platform-specific sidebar spacing while preserving upstream panel styles', async () => {
    const source = await readFile(packageFile('dsh-client-ui-sidebar', 'lib/client.js'), 'utf8')
    for (const userAgent of ['Macintosh', 'Windows']) {
      const styles: any[] = []
      runInNewContext(source, {
        window: { __ModuleLoader__: { load: (entry: any) => entry.factory(() => ({})) } },
        navigator: { userAgent },
        document: {
          querySelector: () => null,
          createElement: () => ({ dataset: {} }),
          head: { appendChild: (tag: any) => styles.push(tag) }
        }
      })
      expect(styles).toHaveLength(1)
      expect(styles[0].textContent).toContain('[data-dsh-sidebar-root][data-dsh-sidebar-wide="true"]{padding-top:32px}')
      expect(styles[0].textContent).toContain('panelActive')
      expect(styles[0].textContent.includes('padding-top:28px')).toBe(userAgent === 'Macintosh')
      expect(styles[0].textContent.includes('padding:32px 22px 6px')).toBe(userAgent === 'Macintosh')
    }
  })

  it('keeps terminal quota and forbidden failures distinct across providers', async () => {
    const http = await installedFunction('dsh-llm-deepseek', 'lib/index.js', 'httpErrorCode')
    const pi = await installedFunction('dsh-llm-pi-ai', 'lib/index.js', 'classifyPiAiError')
    for (const [status, detail, expected] of [
      [401, 'invalid key', 'AUTH'], [403, 'access denied', 'FORBIDDEN'],
      [401, 'insufficient_quota', 'QUOTA'], [403, 'insufficient balance', 'QUOTA'],
      [429, 'insufficient_quota', 'QUOTA'], [429, 'rate limit', 'RATE_LIMIT'],
      [413, 'payload too large', 'INVALID_REQUEST'], [400, 'invalid request', 'INVALID_REQUEST'],
      [503, 'unavailable', 'SERVER']
    ] as const) {
      expect(http(status, { message: detail })).toBe(expected)
      expect(pi(`${status} ${detail}`)).toBe(expected)
    }
    expect(http(400, { message: 'context length exceeded' })).toBe('CONTEXT_WINDOW_EXCEEDED')
    expect(pi('socket closed')).toBe('TRANSPORT')
    expect(pi('timeout')).toBe('TIMEOUT')
  })

  it('routes the same failure codes to localized chat and trajectory messages', async () => {
    const chat = await installedFunction('dsh-client-ui-chat', 'lib/client.js', 'failureMessage')
    const trajectory = await installedFunction('dsh-client-ui-trajectory', 'lib/client.js', 'requestErrorMessage')
    for (const code of ['AUTH', 'QUOTA', 'FORBIDDEN']) {
      expect(chat('raw', code, (key: string) => key)).toBe(`message.failure.${code.toLowerCase()}`)
      expect(trajectory({ error: 'raw', errorCode: code }, (key: string) => key)).toBe(`details.failure.${code.toLowerCase()}`)
    }
    expect(chat('raw', 'UNKNOWN', (key: string) => key)).toBe('raw')
    expect(trajectory({ error: 'trajectory.compaction-interrupted' }, (key: string) => key)).toBe('layout.compactionInterrupted')
  })

  it('resolves profile-local plugin metadata after either loader internal contract fails', async () => {
    const f = await fixture()
    for (const version of ['v1', 'v2']) {
      const resolveSync = vi.fn(() => { throw new Error('not visible to loader internals') })
      const registry = Object.assign(Object.create(ClientModuleRegistry.prototype), { ctx: { loader: { internal: { version, resolveSync } } } })
      expect(registry.locatePkgJson('desktop-fixture-plugin', f.baseUrl)).toEqual({ path: path.join(f.dir, 'package.json'), packageName: 'desktop-fixture-plugin' })
      expect(registry.locatePkgJson('not-installed', f.baseUrl)).toBeUndefined()
      expect(registry.locatePkgJson('./missing.js', f.baseUrl)).toBeUndefined()
      expect(registry.locatePkgJson('cordis:builtin', f.baseUrl)).toBeUndefined()
    }
  })

  it('preserves authoritative loader resolution when it succeeds', async () => {
    const f = await fixture()
    const resolveSync = vi.fn(() => ({ url: pathToFileURL(path.join(f.dir, 'index.js')).href }))
    const registry = Object.assign(Object.create(ClientModuleRegistry.prototype), { ctx: { loader: { internal: { version: 'v2', resolveSync } } } })
    expect(registry.locatePkgJson('desktop-fixture-plugin', f.baseUrl)?.path).toBe(path.join(f.dir, 'package.json'))
    expect(resolveSync).toHaveBeenCalledWith(f.baseUrl, { specifier: 'desktop-fixture-plugin', attributes: {} })
  })

  it('loads a plugin only present under the profile via the unchanged Cordis fallback', async () => {
    const f = await fixture()
    const tree = Object.assign(Object.create(EntryTree.prototype), { ctx: { baseUrl: f.baseUrl, loader: { builtins: { fixture: 'builtin' } } } })
    expect((await tree.import('desktop-fixture-plugin')).fixture).toBe('profile-local')
    expect(tree.import('cordis:fixture')).toBe('builtin')
    await expect(tree.import('definitely-missing-desktop-fixture')).rejects.toThrow()
  })

  it('registers both official directory slots and delegates only to the preload picker', async () => {
    let client: any
    const browser: any = { __ModuleLoader__: { load: (entry: any) => { client = entry.factory(() => ({})) } } }
    runInNewContext(await readFile(packageFile('dsh-client-ui-directory-picker-native', 'lib/client.js'), 'utf8'), { window: browser })
    const slots: any[] = []
    const ctx = { uiWorkspace: { pickDirectory: vi.fn() }, slots: {
      inject: (_name: string, callback: () => any) => { const value = callback(); if (value?.next) [...value] },
      register: (definition: any) => { slots.push(definition) }
    } }
    client.apply(ctx)
    expect(slots.map(slot => slot.name)).toEqual(['conversation.hero.workspace.directoryFlow', 'sidebar.workspaces.directoryFlow'])
    for (const slot of slots) {
      await expect(slot.inject().pick()).rejects.toThrow('bridge is unavailable')
      browser.dshDesktopDirectoryPicker = { pick: vi.fn(async () => '/tmp/picked') }
      expect(await slot.inject().pick()).toBe('/tmp/picked')
      browser.dshDesktopDirectoryPicker.pick = vi.fn(async () => null)
      expect(await slot.inject().pick()).toBeNull()
      delete browser.dshDesktopDirectoryPicker
    }
    expect(ctx.uiWorkspace.pickDirectory).not.toHaveBeenCalled()
  })
})
