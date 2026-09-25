// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { createRequire } from 'node:module'
import { InterviewGuidePanel } from '../packages/opc-profile/agent-teams-desktop/source/lib/client/InterviewGuidePanel.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const host = document.createElement('div')
document.body.append(host)
let root = createRoot(host)
const session = { sessionId: 'interview-a', blank: true, running: false, openState: 'open' }
const summary = { id: 'interview-a', cwd: '/workspace/访谈', title: '访谈' }
const useSessions = (selector) => selector({ byId: { 'interview-a': summary, 'interview-b': { ...summary, id: 'interview-b' }, work: { id: 'work', cwd: '/work', title: '工作' } } })
const actions = () => ({ setDraft: vi.fn(), submit: vi.fn() })
const render = (props = {}) => act(() => root.render(createElement(InterviewGuidePanel, { session, sessionId: props.session?.sessionId ?? session.sessionId, useSessions, inputActions: actions(), input: { draft: '', phase: 'plain', imageIds: [] }, ...props })))
const button = (label) => [...document.querySelectorAll('button')].find(b => b.textContent?.includes(label))
const click = (label) => act(() => button(label).click())
afterEach(() => { act(() => root.unmount()); root = createRoot(host) })

test('interview welcome fills the viewport outside transformed composer ancestors', () => {
  host.style.transform = 'translateY(0)'
  render()
  const panel = document.querySelector('[aria-label="访谈引导"]')
  expect(panel.parentElement).toBe(document.body)
  expect(panel.style.position).toBe('fixed')
  expect(panel.style.inset).toBe('0px')
  expect(panel.style.overflowY).toBe('auto')
})

test('fullscreen guide is above the always-mounted team floating panel', () => {
  render()
  const css = readFileSync('packages/opc-profile/agent-teams-desktop/source/lib/client/ActivityPanel.module.css', 'utf8')
  const teamLayers = [...css.matchAll(/z-index:\s*(\d+)/g)].map(match => Number(match[1]))
  const guide = document.querySelector('[aria-label="访谈引导"]')
  expect(Number(guide.style.zIndex)).toBeGreaterThan(Math.max(...teamLayers))
})

test('stages submit once through the same session composer', () => {
  const inputActions = actions()
  render({ inputActions })
  click('认识 Evan')
  expect(inputActions.setDraft).toHaveBeenCalledWith('先用简单的话介绍你能帮我做什么。')
  expect(inputActions.submit).toHaveBeenCalledTimes(1)
  expect(document.querySelector('[aria-label="访谈引导"]')).toBeNull()
})

test('pause sends nothing, survives remount, and can reopen without resetting the session', () => {
  const inputActions = actions()
  render({ inputActions })
  click('稍后继续')
  expect(inputActions.submit).not.toHaveBeenCalled()
  act(() => root.unmount()); root = createRoot(host)
  render({ inputActions })
  expect(document.querySelector('[aria-label="访谈引导"]')).toBeNull()
  click('继续访谈引导')
  expect(document.querySelector('[aria-label="访谈引导"]')).not.toBeNull()
})

test('switching from dismissed interview to normal then another interview isolates visibility', () => {
  render()
  click('稍后继续')
  render({ session: { sessionId: 'work', blank: false } })
  expect(host.textContent).toBe('')
  render({ session: { ...session, sessionId: 'interview-b' } })
  expect(document.querySelector('[aria-label="访谈引导"]')).not.toBeNull()
})

test.each([{ draft: '未发送的资料', phase: 'plain' }, { draft: '', phase: 'submitting' }, { draft: '', phase: 'claimed' }, { draft: '', phase: 'plain', imageIds: ['attachment'] }])('does not overwrite a draft or submit while composer is busy: %j', input => {
  const inputActions = actions()
  render({ inputActions, input })
  expect(button('认识 Evan').disabled).toBe(true)
  click('认识 Evan')
  expect(inputActions.setDraft).not.toHaveBeenCalled()
  expect(inputActions.submit).not.toHaveBeenCalled()
  expect(document.querySelector('[role="status"]')?.textContent).toBeTruthy()
})

test('composer exceptions retain the guide and show a safe retry message', () => {
  const inputActions = actions()
  inputActions.submit.mockImplementation(() => { throw new Error('private transport details') })
  render({ inputActions })
  click('认识 Evan')
  expect(document.querySelector('[aria-label="访谈引导"]')).not.toBeNull()
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('进入对话')
  expect(document.body.textContent).not.toContain('private transport details')
})

test('actual client entry registers the interview guide with session input actions', () => {
  const captured = []
  runInNewContext(readFileSync('packages/opc-profile/agent-teams-desktop/source/lib/client.js', 'utf8'), {
    window: { __ModuleLoader__: { load: (entry) => captured.push(entry) } }, document
  })
  expect(captured).toHaveLength(1)
  expect(captured[0].id).toBe('@nanmicoder/dsh-agent-teams')
  // Inspect the executable factory, not an unused sibling source file.
  expect(captured[0].factory.toString()).toContain('agent-teams-interview-guide')
  const require = createRequire(import.meta.url)
  const runtime = captured[0].factory((id) => {
    if (id === 'react-dom/client') return { createRoot: () => ({ render: vi.fn(), unmount: vi.fn() }) }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return {}
    return require(id)
  })
  const entries = []
  runtime.apply({ sessions: { list: {} }, effect: vi.fn(), slots: {
    inject: (_name, callback) => callback(),
    register: (entry, component) => entries.push({ entry, component }),
  } })
  const guide = entries.find(({ entry }) => entry.id === 'agent-teams-interview-guide')
  expect(guide.entry.name).toBe('conversation.input.dock')
  const inputActions = actions()
  act(() => root.render(createElement(guide.component, { session, sessionId: session.sessionId, useSessions, input: { draft: '', phase: 'plain' }, inputActions })))
  expect(document.querySelector('[aria-label="访谈引导"]')).not.toBeNull()
  click('认识 Evan')
  expect(inputActions.submit).toHaveBeenCalledTimes(1)
})


test('keyboard Escape dismisses without sending', () => {
  const inputActions = actions()
  render({ inputActions })
  act(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  expect(document.querySelector('[aria-label="访谈引导"]')).toBeNull()
  expect(inputActions.submit).not.toHaveBeenCalled()
})
