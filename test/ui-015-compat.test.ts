import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { projectRoot, patchPath } from './patch-path'

async function client(name: string): Promise<string> {
  return readFile(path.join(projectRoot, 'node_modules', '@deepseek-ai', name, 'lib/client.js'), 'utf8')
}

describe('0.1.5 UI patch compatibility', () => {
  it.each(['layout', 'deliverables', 'conversation'])('migrates %s to the installed upstream version', async name => {
    expect(patchPath(`@deepseek-ai/dsh-client-ui-${name}`)).toMatch(/\+0\.1\.5-rc\.2\.patch$/u)
  })

  it.each([['Macintosh', 80], ['Windows', 56]])('reserves the collapsed rail on %s and keeps the new rightbar constraints', async (userAgent, rail) => {
    const source = await client('dsh-client-ui-layout')
    const start = source.indexOf('const SIDEBAR_AUTO_COLLAPSE')
    const end = source.indexOf('//#endregion', start)
    const compute = new Function('navigator', `${source.slice(start, end)}; return computeColumns`)({ userAgent })
    expect(compute(1200, 0, 0)).toEqual({ sidebar: rail, center: 1200 - Number(rail), rightbar: 0 })
    expect(compute(1200, 0, 800)).toEqual({ sidebar: rail, center: 400, rightbar: 800 - Number(rail) })
    expect(compute(650, 0, 400).rightbar).toBe(0)
    expect(compute(1200, 100, 0).sidebar).toBe(264)
  })

  it('resolves local references without a produced file and preserves unique produced-file names', async () => {
    const source = await client('dsh-client-ui-deliverables')
    const start = source.indexOf('function producedFileMentions(')
    const end = source.indexOf('//#endregion', start)
    const mentions = new Function('basename', `${source.slice(start, end)}; return producedFileMentions`)(
      (value: string) => value.split(/[\\/]/u).at(-1)
    )
    const open = vi.fn()
    const resolver = mentions([], open, (value: string) => `Open ${value}`)
    for (const [input, target] of [
      ['/tmp/a.md:12:3', '/tmp/a.md'], ['~/a.md#L12C3', '~/a.md'],
      ['../docs/a.md', '../docs/a.md'], ['C:\\docs\\a.md:2', 'C:\\docs\\a.md'], ['a.md', 'a.md']
    ]) {
      const mention = resolver.resolve(input)
      expect(mention?.title).toBe(target)
      mention.open()
      expect(open).toHaveBeenLastCalledWith(target)
    }
    for (const value of ['run', '', 'a\nb.md', 'https://example.com/a.md', 'javascript:alert(1)', 'data:text/plain,a.md']) {
      expect(resolver.resolve(value)).toBeUndefined()
    }
    expect(mentions(['/docs/a.md'], open, String).resolve('a.md').title).toBe('/docs/a.md')
    expect(mentions(['/one/a.md', '/two/a.md'], open, String).resolve('a.md')).toBeUndefined()
  })

  it('retains presented-delivery routing while allowing mentions in turns with no deliveries', async () => {
    const source = await client('dsh-client-ui-deliverables')
    const helpersStart = source.indexOf('function producedFileMentions(')
    const helpersEnd = source.indexOf('//#endregion', helpersStart)
    const start = source.indexOf('{ forClosing(owner, sessionId) {')
    const end = source.indexOf('} });', start) + 3
    const presentedOpen = vi.fn()
    const openFile = vi.fn()
    const provider = new Function('selectProducedFiles', 'presentedForClosing', 'opener', 't', 'basename',
      `${source.slice(helpersStart, helpersEnd)}; return (${source.slice(start, end)})`
    )(() => null, (owner: { presented: unknown[] }) => owner.presented, { open: presentedOpen },
      (key: string) => key, (value: string) => value.split(/[\\/]/u).at(-1))
    const empty = provider.forClosing({ presented: [], openFile }, 'session-1')
    empty.resolve('/tmp/existing.md').open()
    expect(openFile).toHaveBeenCalledWith('/tmp/existing.md')
    const delivered = provider.forClosing({ presented: [{ path: '/tmp/output.md', seq: 42, index: 3 }], openFile }, 'session-2')
    expect(delivered.resolve('output.md').label).toBe('presented.open')
    delivered.resolve('output.md').open()
    expect(presentedOpen).toHaveBeenCalledWith('session-2', 42, 3)
    expect(openFile).toHaveBeenCalledTimes(1)
  })

  it('keeps the main panel contract and official file upload controls alongside PPT slots', async () => {
    const source = await client('dsh-client-ui-conversation')
    expect(source).toContain('name: "main.conversation"')
    expect(source).toContain('onAddFiles: intakeFiles')
    expect(source).toContain('retryFileUpload?.(id)')
    expect(source).toContain('"conversation.input.accessory": {')
    expect(source).toContain('"conversation.hero.modeActions": {')
    const types = await readFile(path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts'), 'utf8')
    expect(types).toContain("PropsRuntime<'main.conversation'>")
    expect(types).toContain('extensionZone?: InputZone;')
    expect(types).toContain("'conversation.input.accessory': {")
    expect(types).toContain("'conversation.hero.modeActions': {")
  })
})
