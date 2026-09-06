import { describe, expect, it, vi } from 'vitest'
import { OwnedProcessTree } from '../../src/main/runtime/owned-process-tree'

function child() {
  const listeners = new Map<string, (() => void)[]>()
  return {
    pid: 123,
    exitCode: null as number | null,
    signalCode: null as NodeJS.Signals | null,
    kill: vi.fn(() => true),
    once: vi.fn((event: string, listener: () => void) => { listeners.set(event, [...(listeners.get(event) ?? []), listener]) }),
    emitExit() { this.exitCode = 0; for (const listener of listeners.get('exit') ?? []) listener() }
  }
}

describe('OwnedProcessTree', () => {
  it('registers only a runtime-owned process once and escalates bounded termination', async () => {
    const process = child()
    const tree = new OwnedProcessTree({ graceMs: 1, hardKillWaitMs: 1 })
    tree.register('runtime-a', process)
    tree.register('runtime-a', process)

    await tree.stop('runtime-a')

    expect(tree.size('runtime-a')).toBe(0)
    expect(process.kill).toHaveBeenCalledWith('SIGTERM')
    expect(process.kill).toHaveBeenCalledWith('SIGKILL')
  })

  it('does not signal an already exited process', async () => {
    const process = child()
    process.exitCode = 0
    const tree = new OwnedProcessTree({ graceMs: 1, hardKillWaitMs: 1 })
    tree.register('runtime-a', process)

    await tree.stop('runtime-a')
    expect(process.kill).not.toHaveBeenCalled()
  })

  it('does not treat a process without a signalCode property as exited', async () => {
    const process = child()
    delete (process as { signalCode?: NodeJS.Signals | null }).signalCode
    const tree = new OwnedProcessTree({ graceMs: 1, hardKillWaitMs: 1 })
    tree.register('runtime-a', process)

    await tree.stop('runtime-a')

    expect(process.kill).toHaveBeenCalledWith('SIGTERM')
  })
})
