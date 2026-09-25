import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const bundlePath = path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js')

async function deleteControls(deleteSession: (id: string) => Promise<void>) {
  const source = await readFile(bundlePath, 'utf8')
  const start = source.indexOf('const [sessionDeleteTarget, setSessionDeleteTarget]')
  expect(start).toBeGreaterThan(-1)
  const end = source.indexOf('const onSessionArchive', start)
  const states: unknown[] = []
  let cursor = 0
  const react = { useState(initial: unknown) {
    const index = cursor++
    if (!(index in states)) states[index] = initial
    return [states[index], (value: unknown) => { states[index] = value }]
  } }
  const create = new Function('react', 'deleteSession', `${source.slice(start, end)}; return { onSessionDelete, closeSessionDelete, confirmSessionDelete, sessionDeleteTarget, sessionDeleting, sessionDeleteError }`)
  return () => { cursor = 0; return create(react, deleteSession) }
}

describe('workspace 0.1.5 compatibility', () => {
  it('reads legacy view snapshots and keeps unread markers unique', async () => {
    const source = await readFile(bundlePath, 'utf8')
    const start = source.indexOf('function createWorkspaceViewStore()')
    const end = source.indexOf('//#endregion', start)
    const store = new Function('_deepseek_ai_dsh_client_store', `${source.slice(start, end)}; return createWorkspaceViewStore()`)(
      { defineStore: (spec: unknown) => spec }
    )
    expect(store.persist).toBe('dsh.workspace.view.v5')
    const legacy = { ...store.init() }
    delete legacy.unreadSessionIds
    store.actions.markSessionUnread(legacy, 's-1')
    store.actions.markSessionUnread(legacy, 's-1')
    store.actions.markSessionUnread(legacy, 's-2')
    expect(legacy.unreadSessionIds).toEqual(['s-1', 's-2'])
    store.actions.markSessionRead(legacy, 's-1')
    expect(legacy.unreadSessionIds).toEqual(['s-2'])
    expect(legacy.groupBy).toBe('workspace')
  })

  it('routes the row delete, unread, rename, fork and archive actions independently', async () => {
    const source = await readFile(bundlePath, 'utf8')
    const start = source.indexOf('function SessionNodeItem(')
    const end = source.indexOf('//#endregion', start)
    const jsx = (type: unknown, props: unknown) => ({ type, props })
    const factory = new Function('react', 'react_jsx_runtime', '_deepseek_ai_dsh_client_ui_primitives',
      'Rows_module_css_default', 'displayTitle', 'sessionStatuses', 'clsx', 'SessionStatusDots',
      'ActiveScheduleIndicator', 'SessionHoverContent', 'timeLabel', `${source.slice(start, end)}; return SessionNodeItem`)
    const setMenuOpen = vi.fn()
    const renderRow = factory(
      { useState: () => [false, setMenuOpen], useRef: () => ({ current: null }), useEffect: () => {} },
      { jsx, jsxs: jsx }, new Proxy({}, { get: (_, key) => String(key) }), {},
      (node: { title: string }) => node.title, () => [{ state: 'done' }], () => '',
      'SessionStatusDots', 'ActiveScheduleIndicator', 'SessionHoverContent', () => 'now'
    )
    const handlers = { onOpen: vi.fn(), onRename: vi.fn(), onFork: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn(), onUnreadChange: vi.fn() }
    const row = renderRow({ node: { id: 's-1', title: 'One', blank: false }, ...handlers, t: String })
    const menu = row.props.anchor.props.children.find((item: any) => item?.props?.children?.type === 'Menu').props.children
    expect(menu.props.items.map((item: { id: string }) => item.id)).toEqual(['rename', 'fork', 'markUnread', 'archive', 'delete'])
    menu.props.onSelect('delete')
    expect(handlers.onDelete).toHaveBeenCalledExactlyOnceWith('s-1', 'One')
    expect(handlers.onArchive).not.toHaveBeenCalled()
    menu.props.onSelect('markUnread')
    expect(handlers.onUnreadChange).toHaveBeenCalledExactlyOnceWith('s-1', true)
    for (const action of ['rename', 'fork', 'archive']) menu.props.onSelect(action)
    expect(handlers.onRename).toHaveBeenCalledExactlyOnceWith('s-1', 'One')
    expect(handlers.onFork).toHaveBeenCalledExactlyOnceWith('s-1')
    expect(handlers.onArchive).toHaveBeenCalledExactlyOnceWith('s-1')
    row.props.anchor.props.onContextMenu({ preventDefault: vi.fn(), stopPropagation: vi.fn() })
    expect(setMenuOpen).toHaveBeenLastCalledWith(true)
  })

  it('ships the migrated patch and preserves panel navigation and search reveal', async () => {
    expect(patchPath('@deepseek-ai/dsh-client-ui-workspace')).toMatch(/\+0\.1\.5-rc\.2\.patch$/u)
    const source = await readFile(bundlePath, 'utf8')
    expect(source.includes('this.ctx.layout.selectPanel(null)')).toBe(true)
    expect(source.includes('name: "sidebar.workspaces"')).toBe(true)
    const start = source.indexOf('const openSearchResult =')
    const end = source.indexOf('const acknowledgeSessionReveal', start)
    expect(source.slice(start, end)).toContain('setRevealSessionId(sessionId)')
    expect(source.slice(start, end)).toContain('openSession(sessionId)')
  })

  it('requires confirmation and retains the target while deletion is pending', async () => {
    let complete!: () => void
    const remove = vi.fn(() => new Promise<void>(resolve => { complete = resolve }))
    const render = await deleteControls(remove)
    render().confirmSessionDelete()
    expect(remove).not.toHaveBeenCalled()
    render().onSessionDelete('s-1', 'First session')
    expect(remove).not.toHaveBeenCalled()
    render().confirmSessionDelete()
    expect(remove).toHaveBeenCalledExactlyOnceWith('s-1')
    expect(render().sessionDeleting).toBe(true)
    render().closeSessionDelete()
    render().confirmSessionDelete()
    expect(render().sessionDeleteTarget.sessionId).toBe('s-1')
    expect(remove).toHaveBeenCalledTimes(1)
    complete()
    await Promise.resolve()
    expect(render().sessionDeleteTarget).toBeNull()
    expect(render().sessionDeleting).toBe(false)
  })

  it('shows a failed deletion and permits retry or cancellation without changing its target', async () => {
    const remove = vi.fn().mockRejectedValue(new Error('Session is running'))
    const render = await deleteControls(remove)
    render().onSessionDelete('s-2', 'Second session')
    render().confirmSessionDelete()
    await Promise.resolve()
    await Promise.resolve()
    expect(render().sessionDeleteError).toBe('Session is running')
    expect(render().sessionDeleteTarget.sessionId).toBe('s-2')
    expect(render().sessionDeleting).toBe(false)
    render().closeSessionDelete()
    expect(render().sessionDeleteTarget).toBeNull()
    expect(render().sessionDeleteError).toBeNull()
  })
})
