import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface SavedLoginAccount {
  username: string
  hasPassword: boolean
}

export interface LoginHistoryCipher {
  encrypt(value: string): Promise<Buffer>
  decrypt(value: Buffer): Promise<string>
}

interface LoginHistoryEntry extends SavedLoginAccount {
  lastUsedAt: string
}

interface LoginHistoryDocument {
  schemaVersion: 1
  entries: LoginHistoryEntry[]
}

/**
 * Stores only account labels in JSON. Optional remembered passwords stay in
 * Electron safeStorage, which maps to Keychain on macOS and DPAPI on Windows.
 */
export class LoginHistoryStore {
  private readonly metadataPath: string
  private readonly maximumEntries: number
  private pendingOperation: Promise<void> = Promise.resolve()

  constructor(
    private readonly options: {
      root: string
      cipher: LoginHistoryCipher
      maximumEntries?: number
    }
  ) {
    this.metadataPath = join(options.root, 'login-history', 'v2', 'accounts.json')
    this.maximumEntries = Math.max(1, Math.min(options.maximumEntries ?? 10, 20))
  }

  async list(): Promise<SavedLoginAccount[]> {
    return await this.enqueue(async () =>
      (await this.readDocument()).entries.map(({ username, hasPassword }) => ({ username, hasPassword }))
    )
  }

  async loadPassword(value: string): Promise<string | undefined> {
    const username = normalizeUsername(value)
    return await this.enqueue(async () => {
      const entry = (await this.readDocument()).entries.find((candidate) => sameUsername(candidate.username, username))
      if (!entry?.hasPassword) return undefined
      try {
        return await this.options.cipher.decrypt(await readFile(this.secretPath(username)))
      } catch (error) {
        if (isFileMissing(error)) return undefined
        throw error
      }
    })
  }

  async record(input: { username: string; password: string; rememberPassword: boolean }): Promise<void> {
    const username = normalizeUsername(input.username)
    if (!input.password || input.password.length > 1024) throw new Error('desktop_login_history_password_invalid')
    return await this.enqueue(async () => {
      const current = await this.readDocument()
      const retained = current.entries.filter((entry) => !sameUsername(entry.username, username))
      const allEntries = [{ username, hasPassword: input.rememberPassword, lastUsedAt: new Date().toISOString() }, ...retained]
      const entries = allEntries.slice(0, this.maximumEntries)
      const evicted = allEntries.slice(this.maximumEntries)

      if (input.rememberPassword) await this.writeSecret(username, input.password)
      else await this.removeSecret(username)
      await Promise.all(evicted.map((entry) => this.removeSecret(entry.username)))
      await this.writeDocument({ schemaVersion: 1, entries })
    })
  }

  async clearPassword(value: string): Promise<void> {
    const username = normalizeUsername(value)
    return await this.enqueue(async () => {
      const current = await this.readDocument()
      const entries = current.entries.map((entry) =>
        sameUsername(entry.username, username) ? { ...entry, hasPassword: false } : entry
      )
      await this.removeSecret(username)
      await this.writeDocument({ schemaVersion: 1, entries })
    })
  }

  private async writeSecret(username: string, password: string): Promise<void> {
    const destination = this.secretPath(username)
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, await this.options.cipher.encrypt(password), { mode: 0o600 })
    await rename(temporary, destination)
  }

  private async removeSecret(username: string): Promise<void> {
    await rm(this.secretPath(username), { force: true })
  }

  private async readDocument(): Promise<LoginHistoryDocument> {
    try {
      const candidate: unknown = JSON.parse(await readFile(this.metadataPath, 'utf8'))
      if (!candidate || typeof candidate !== 'object') return emptyDocument()
      const document = candidate as Partial<LoginHistoryDocument>
      if (document.schemaVersion !== 1 || !Array.isArray(document.entries)) return emptyDocument()
      const entries = document.entries.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const value = entry as Partial<LoginHistoryEntry>
        if (typeof value.username !== 'string' || typeof value.hasPassword !== 'boolean' || typeof value.lastUsedAt !== 'string') return []
        try {
          return [{ username: normalizeUsername(value.username), hasPassword: value.hasPassword, lastUsedAt: value.lastUsedAt }]
        } catch {
          return []
        }
      }).slice(0, this.maximumEntries)
      return { schemaVersion: 1, entries }
    } catch (error) {
      if (isFileMissing(error) || error instanceof SyntaxError) return emptyDocument()
      throw error
    }
  }

  private async writeDocument(document: LoginHistoryDocument): Promise<void> {
    await mkdir(dirname(this.metadataPath), { recursive: true, mode: 0o700 })
    const temporary = `${this.metadataPath}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, `${JSON.stringify(document)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    await rename(temporary, this.metadataPath)
  }

  private secretPath(username: string): string {
    const digest = createHash('sha256').update(`username:${username.toLocaleLowerCase('en-US')}`).digest('hex')
    return join(this.options.root, 'login-history', 'v2', 'secrets', `${digest}.bin`)
  }

  private async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pendingOperation.then(operation)
    this.pendingOperation = result.then(() => undefined, () => undefined)
    return await result
  }
}

function normalizeUsername(value: string): string {
  const username = value.trim()
  if (!/^[A-Za-z0-9_.@-]{1,128}$/u.test(username)) throw new Error('desktop_login_history_username_invalid')
  return username
}

function sameUsername(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase()
}

function emptyDocument(): LoginHistoryDocument {
  return { schemaVersion: 1, entries: [] }
}

function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT'
}
