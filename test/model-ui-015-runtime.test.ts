import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { projectRoot, patchPath } from './patch-path'

const require = createRequire(import.meta.url)
type Node = { type: string | Function; props: Record<string, any> }

/** Run the installed plugin factory, exposing private views only inside the test. */
function clientHarness(pkg: string, symbols: string[]) {
  const file = path.join(projectRoot, 'node_modules/@deepseek-ai', pkg, 'lib/client.js')
  const source = readFileSync(file, 'utf8').replace(
    'return module.exports;',
    `return { ${symbols.join(', ')} };`
  )
  const states: any[] = []
  let cursor = 0
  let exports: any
  const window = {
    localStorage: { getItem: vi.fn(() => '["custom"]'), setItem: vi.fn() },
    open: vi.fn(),
    __ModuleLoader__: {
      load({ factory }: { factory: Function }) {
        exports = factory((name: string) => {
          if (name === 'react') return {
            useState(initial: any) {
              const index = cursor++
              if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
              return [states[index], (value: any) => {
                states[index] = typeof value === 'function' ? value(states[index]) : value
              }]
            },
            useRef: (value: any) => ({ current: value }),
            useMemo: (fn: Function) => fn(),
            useId: () => 'test-id',
            useEffect() {}, useLayoutEffect() {},
            useSyncExternalStore: (_subscribe: Function, snapshot: Function) => snapshot()
          }
          if (name === 'react/jsx-runtime') return {
            jsx: (type: any, props: any) => ({ type, props }),
            jsxs: (type: any, props: any) => ({ type, props }),
            Fragment: 'fragment'
          }
          if (name === '@deepseek-ai/dsh-client-store') return {}
          if (name === 'react-dom') return { createPortal: (value: any) => value }
          if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({}, { get: (_target, key) => key })
          return require(name)
        })
      }
    }
  }
  Function('window', 'document', source)(window, {
    querySelector: () => ({}), getElementById: () => ({}), body: {}
  })
  return {
    exports, window, states,
    render(name: string, props: any): Node { cursor = 0; return exports[name](props) }
  }
}

function nodes(node: any): Node[] {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (node === null || typeof node !== 'object') return []
  if (!('props' in node)) return []
  return [node, ...nodes(node.props.children)]
}
const t = (key: string) => key

describe('DSH 0.1.5 model UI runtime migration', () => {
  it.each(['agent-preset', 'model-selection', 'settings-models'])('pins %s to the candidate package version', (name) => {
    const pkg = `@deepseek-ai/dsh-client-ui-${name}`
    expect(patchPath(pkg)).toContain('+0.1.5-rc.2.patch')
    expect(JSON.parse(readFileSync(path.join(projectRoot, 'node_modules', pkg, 'package.json'), 'utf8')).version).toBe('0.1.5-rc.2')
  })

  it('filters and selects models through the upstream portal menu', async () => {
    const h = clientHarness('dsh-client-ui-model-selection', ['ModelSelect'])
    const select = vi.fn(async () => undefined)
    const props = {
      locked: false, available: true, load: vi.fn(), select, t,
      directory: { subscribe: vi.fn(), getSnapshot: () => ({
        status: 'ready', current: null, failures: [], error: null,
        groups: [{ id: 'provider', name: 'Provider', models: [
          { id: 'alpha', name: 'Alpha' }, { id: 'beta', name: 'Beta' }
        ] }]
      }) }
    }
    h.render('ModelSelect', props)
    h.states[0] = true
    h.states[1] = 'model'
    let tree = h.render('ModelSelect', props)
    const search = nodes(tree).find(n => n.props.role === 'searchbox')!
    expect(search.props.value).toBe('')
    search.props.onChange({ target: { value: 'beta' } })
    tree = h.render('ModelSelect', props)
    const choices = nodes(tree).filter(n => n.props.role === 'menuitemradio')
    expect(choices.map(n => n.props.title)).toEqual(['Beta'])
    choices[0]!.props.onClick()
    await Promise.resolve()
    expect(select).toHaveBeenCalledWith({ provider: 'provider', model: 'beta' })
  })

  it('preserves preset search, recent grouping and the upstream seat anchor styles', async () => {
    const h = clientHarness('dsh-client-ui-agent-preset', ['AgentPresetSeat'])
    const select = vi.fn(async () => undefined)
    const options = [
      { id: 'standard', trust: 'system' },
      { id: 'custom', trust: 'user', name: 'My preset', description: 'Writing' }
    ]
    const props = { load: vi.fn(), select, introduced: vi.fn(), t,
      useAgentPresetSeat: (selector: Function) => selector({ options, current: 'standard', busy: false, error: null }) }
    const menu = nodes(h.render('AgentPresetSeat', props)).find(n => n.type === 'Menu')!
    expect(menu.props.className).toBe('Wq4RLG_menuAnchor')
    expect(menu.props.items.filter((item: any) => item.id === 'custom')).toHaveLength(1)
    expect(menu.props.items.map((item: any) => item.id)).toContain('recent-label')
    const search = nodes(menu.props.items[0].text).find(n => n.type === 'input')!
    search.props.onChange({ currentTarget: { value: 'Writing' } })
    const filtered = nodes(h.render('AgentPresetSeat', props)).find(n => n.type === 'Menu')!
    expect(filtered.props.items.map((item: any) => item.id)).toContain('custom')
    expect(filtered.props.items.map((item: any) => item.id)).not.toContain('standard')
    filtered.props.onSelect('custom')
    await Promise.resolve()
    expect(select).toHaveBeenCalledWith('custom')
    expect(h.window.localStorage.setItem).toHaveBeenCalledWith('dsh-agent-preset-recent', '["custom"]')
  })

  it('passes working search state through the custom-provider model editor and keeps add-model usable', () => {
    const h = clientHarness('dsh-client-ui-settings-models', ['CustomProviderCard', 'ModelListEditor'])
    const props = { taken: [], protocols: ['openai-completions'], operations: {}, t, revision: 1, readOnly: false }
    let tree = h.render('CustomProviderCard', props)
    const editor = nodes(tree).find(n => n.type === h.exports.ModelListEditor)!
    expect(editor.props.modelQuery).toBe('')
    expect(() => h.exports.ModelListEditor(editor.props)).not.toThrow()
    const add = nodes(tree).find(n => n.type === 'button' && n.props.children === 'addModel')!
    expect(add.props.disabled).toBe(false)
    add.props.onClick()
    tree = h.render('CustomProviderCard', props)
    expect(nodes(tree).find(n => n.type === h.exports.ModelListEditor)!.props.models).toEqual([{ id: '' }])
  })

  it('renders provider directory with candidate namespace filtering and OPC ranked search', () => {
    const h = clientHarness('dsh-client-ui-settings-models', ['Loaded'])
    const rows = ['openai', 'deepseek-official'].map(provider => ({
      configured: false, usable: false,
      entry: { provider, displayName: provider, settingsNs: provider, settingsPath: [] }
    }))
    const state = { status: 'ready', rows, writable: true,
      namespaces: new Map(rows.map(row => [row.entry.provider, {}])) }
    expect(() => h.render('Loaded', {
      injected: { controller: {}, operations: {}, schema: {}, t, useSnapshot: (selector: Function) => selector(state) },
      renderSlot: () => null
    })).not.toThrow()
  })
})
