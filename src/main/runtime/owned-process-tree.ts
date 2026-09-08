export interface OwnedProcess {
  readonly pid?: number
  readonly exitCode: number | null
  readonly signalCode?: NodeJS.Signals | null
  kill(signal?: NodeJS.Signals): boolean
  once(event: 'exit', listener: () => void): unknown
}

export interface OwnedProcessTreeOptions {
  graceMs?: number
  hardKillWaitMs?: number
}

/** Tracks only processes explicitly registered by an account runtime. */
export class OwnedProcessTree {
  private readonly entries = new Map<string, Set<OwnedProcess>>()
  private readonly graceMs: number
  private readonly hardKillWaitMs: number

  constructor(options: OwnedProcessTreeOptions = {}) {
    this.graceMs = options.graceMs ?? 4_000
    this.hardKillWaitMs = options.hardKillWaitMs ?? 1_000
  }

  register(runtimeId: string, process: OwnedProcess): () => void {
    const processes = this.entries.get(runtimeId) ?? new Set<OwnedProcess>()
    this.entries.set(runtimeId, processes)
    processes.add(process)
    process.once('exit', () => this.remove(runtimeId, process))
    return () => this.remove(runtimeId, process)
  }

  size(runtimeId: string): number {
    return this.entries.get(runtimeId)?.size ?? 0
  }

  async stop(runtimeId: string): Promise<void> {
    const processes = [...(this.entries.get(runtimeId) ?? [])]
    await Promise.all(processes.map((process) => this.stopProcess(process)))
    this.entries.delete(runtimeId)
  }

  private remove(runtimeId: string, process: OwnedProcess): void {
    const processes = this.entries.get(runtimeId)
    if (!processes) return
    processes.delete(process)
    if (processes.size === 0) this.entries.delete(runtimeId)
  }

  private async stopProcess(process: OwnedProcess): Promise<void> {
    if (hasExited(process)) return
    const exited = onceExit(process)
    process.kill('SIGTERM')
    if (await waitForExit(exited, this.graceMs)) return
    if (!hasExited(process)) process.kill('SIGKILL')
    await waitForExit(exited, this.hardKillWaitMs)
  }
}

function hasExited(process: OwnedProcess): boolean {
  return process.exitCode !== null || (process.signalCode !== undefined && process.signalCode !== null)
}

function onceExit(process: OwnedProcess): Promise<void> {
  return new Promise((resolve) => process.once('exit', resolve))
}

async function waitForExit(exited: Promise<void>, timeoutMs: number): Promise<boolean> {
  return Promise.race([exited.then(() => true), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs))])
}
