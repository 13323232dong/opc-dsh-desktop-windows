import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

function bundle(name: string) {
  return readFileSync(path.join(projectRoot, 'node_modules/@deepseek-ai', `dsh-client-ui-${name}`, 'lib/client.js'), 'utf8')
}

function hookHost() {
  const cells: any[] = []
  let index = 0
  const jsx = (type: any, props: any) => ({ type, props })
  return {
    render(component: any, props: any) { index = 0; return component(props) },
    react: {
      useState(initial: any) {
        const at = index++
        if (!(at in cells)) cells[at] = typeof initial === 'function' ? initial() : initial
        return [cells[at], (value: any) => { cells[at] = typeof value === 'function' ? value(cells[at]) : value }]
      },
      useRef: (value: any) => ({ current: value }),
      useEffect: () => {}, useLayoutEffect: () => {},
      useMemo: (fn: any) => fn(), useCallback: (fn: any) => fn(),
      useSyncExternalStore: (_subscribe: any, get: any) => get(),
      useId: () => 'test-id', memo: (fn: any) => fn(), forwardRef: (fn: any) => fn(),
      createContext: () => ({})
    },
    jsx: { jsx, jsxs: jsx, Fragment: 'Fragment' }
  }
}

function load(name: string, symbols: string[], host = hookHost(), userAgent = 'Macintosh') {
  let factory: any
  const source = bundle(name).replace('return module.exports;', `Object.assign(exports, { ${symbols.join(', ')} }); return module.exports;`)
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load: (entry: any) => { factory = entry.factory } }, localStorage: { getItem: () => null, setItem: () => {} } },
    navigator: { userAgent }, console, AbortController, AbortSignal, URLSearchParams, queueMicrotask, setTimeout, clearTimeout
  })
  const primitives = new Proxy({}, { get: (_target, key) => key === 'relativeTime' ? () => ({ unit: 'second', n: 1 }) : String(key) })
  const exports = factory((id: string) => {
    if (id === 'react') return host.react
    if (id === 'react/jsx-runtime') return host.jsx
    if (id === 'react-dom') return { createPortal: (child: any) => child }
    if (id === '@deepseek-ai/cordis') return { Service: class { ctx: any; constructor(ctx: any) { this.ctx = ctx } } }
    if (id === '@deepseek-ai/dsh-client-store') return { defineStore: (spec: any) => spec }
    return primitives
  })
  return { ...exports, host }
}

function nodes(tree: any): any[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (tree === null || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.anchor), ...nodes(tree.props?.footer)]
}

describe('0.1.5 UI semantic migration', () => {
  it('keeps the new rightbar sizing while reserving the macOS traffic-light rail', () => {
    const mac = load('layout', ['computeColumns'])
    const win = load('layout', ['computeColumns'], hookHost(), 'Windows NT')
    expect(mac.computeColumns(1400, 0, 630)).toEqual({ sidebar: 80, center: 690, rightbar: 630 })
    expect(win.computeColumns(1400, 0, 630)).toEqual({ sidebar: 56, center: 714, rightbar: 630 })
    expect(mac.computeColumns(700, 0, 630)).toEqual({ sidebar: 80, center: 620, rightbar: 0 })
  })

  it('resolves local references without losing produced-file disambiguation', () => {
    const { producedFileMentions } = load('deliverables', ['producedFileMentions'])
    const open = vi.fn()
    const resolver = producedFileMentions(['/one/report.md', '/two/report.md'], open, (p: string) => p)
    expect(resolver.resolve('symbol')).toBeUndefined()
    expect(resolver.resolve('javascript:alert(1)')).toBeUndefined()
    expect(resolver.resolve('https://example.com/a.md')).toBeUndefined()
    resolver.resolve('/notes/readme.md:12:3').open()
    expect(open).toHaveBeenLastCalledWith('/notes/readme.md')
    const produced = producedFileMentions(['/one/report.md'], open, (p: string) => p)
    produced.resolve('report.md').open()
    expect(open).toHaveBeenLastCalledWith('/one/report.md')
  })

  it('updates unread markers idempotently from both new and pre-upgrade store snapshots', () => {
    const { createWorkspaceViewStore } = load('workspace', ['createWorkspaceViewStore'])
    const store = createWorkspaceViewStore()
    for (const state of [{}, store.init()]) {
      store.actions.markSessionUnread(state, 'a')
      store.actions.markSessionUnread(state, 'a')
      store.actions.markSessionUnread(state, 'b')
      expect(state.unreadSessionIds).toEqual(['a', 'b'])
      store.actions.markSessionRead(state, 'a')
      expect(state.unreadSessionIds).toEqual(['b'])
    }
  })

  it('renders row actions with the new reveal hook and dispatches only the selected action', () => {
    const { SessionNodeItem, host } = load('workspace', ['SessionNodeItem'])
    const onDelete = vi.fn(), onUnreadChange = vi.fn(), onOpen = vi.fn(), onReveal = vi.fn()
    const props = {
      node: { id: 'a', title: 'Alpha', blank: false, updatedAt: 0, createdAt: 0, completed: false, status: 'idle' },
      now: 1, onOpen, onRename: vi.fn(), onFork: vi.fn(), onArchive: vi.fn(), onReveal,
      onDelete, unread: true, onUnreadChange, t: (key: string) => key
    }
    let rendered = host.render(SessionNodeItem, props)
    const row = nodes(rendered).find((n) => n.props?.role === 'treeitem')
    const preventDefault = vi.fn(), stopPropagation = vi.fn()
    row.props.onContextMenu({ preventDefault, stopPropagation })
    rendered = host.render(SessionNodeItem, props)
    const menu = nodes(rendered).find((n) => n.type === 'Menu')
    expect(menu.props.open).toBe(true)
    expect(menu.props.items.map((entry: any) => entry.id)).toContain('markRead')
    menu.props.onSelect('markRead')
    expect(onUnreadChange).toHaveBeenCalledWith('a', false)
    expect(onDelete).not.toHaveBeenCalled()
    menu.props.onSelect('delete')
    expect(onDelete).toHaveBeenCalledWith('a', 'Alpha')
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(stopPropagation).toHaveBeenCalledOnce()
    const noDelete = nodes(host.render(SessionNodeItem, { ...props, onDelete: undefined })).find((n) => n.type === 'Menu')
    expect(noDelete.props.items.map((entry: any) => entry.id)).not.toContain('delete')
  })

  it('renders the model selector against the new portal-aware component without missing search state', () => {
    const { ModelSelect, host } = load('model-selection', ['ModelSelect'])
    const state = { groups: [], current: null, status: 'ready' }
    const props = { locked: false, available: true, directory: { subscribe: () => () => {}, getSnapshot: () => state }, load: vi.fn(), select: vi.fn(), t: (s: string) => s }
    const tree = host.render(ModelSelect, props)
    expect(nodes(tree).some((n) => n.type === 'button')).toBe(true)
  })

  it('keeps every added CSS-module class backed by a generated selector', () => {
    for (const [name, modules] of [
      ['agent-preset', ['AgentPresetSeat', 'AgentPresetSection']],
      ['conversation', ['ConversationRoot', 'InputBar']],
      ['workspace', ['Rows']]
    ] as const) {
      const source = bundle(name)
      for (const module of modules) {
        const map = source.match(new RegExp(`var ${module}_module_css_default = \\{([\\s\\S]*?)\\n\\t\\t\\};`))?.[1]
        expect(map).toBeDefined()
        for (const [, cssClass] of map!.matchAll(/"[^"]+": "([^"]+)"/g)) {
          if (source.includes(`@keyframes ${cssClass}`)) continue
          expect(source, `${name}: ${cssClass}`).toContain(`.${cssClass}`)
        }
      }
    }
  })
})
