import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface SavedLoginAccount {
  username: string
  hasPassword: boolean
}

export interface LoginSecretStore {
  get(account: string): Promise<string | undefined>
  set(account: string, value: string): Promise<void>
  remove(account: string): Promise<void>
}

interface LoginHistoryEntry extends SavedLoginAccount { lastUsedAt: string }
interface LoginHistoryDocument { schemaVersion: 1; entries: LoginHistoryEntry[] }

export class LoginHistoryStore {
  private readonly metadataPath: string
  private readonly maximumEntries: number
  private pendingOperation: Promise<void> = Promise.resolve()

  constructor(private readonly options: { root: string; secrets: LoginSecretStore; maximumEntries?: number }) {
    this.metadataPath = join(options.root, 'login-history', 'v1', 'accounts.json')
    this.maximumEntries = Math.max(1, Math.min(options.maximumEntries ?? 10, 20))
  }

  async list(): Promise<SavedLoginAccount[]> {
    return await this.enqueue(async () => (await this.readDocument()).entries.map(({ username, hasPassword }) => ({ username, hasPassword })))
  }

  async loadPassword(username: string): Promise<string | undefined> {
    const normalized = normalizeUsername(username)
    return await this.enqueue(async () => {
      const entry = (await this.readDocument()).entries.find((candidate) => accountId(candidate.username) === accountId(normalized))
      return entry?.hasPassword ? await this.options.secrets.get(secretAccount(normalized)) : undefined
    })
  }

  async record(input: { username: string; password: string; rememberPassword: boolean }): Promise<void> {
    const username = normalizeUsername(input.username)
    if (!input.password || input.password.length > 1024) throw new Error('desktop_login_history_password_invalid')
    await this.enqueue(async () => {
      const current = await this.readDocument()
      const retained = current.entries.filter((entry) => accountId(entry.username) !== accountId(username))
      const allEntries = [{ username, hasPassword: input.rememberPassword, lastUsedAt: new Date().toISOString() }, ...retained]
      const entries = allEntries.slice(0, this.maximumEntries)
      const evicted = allEntries.slice(this.maximumEntries)
      if (input.rememberPassword) await this.options.secrets.set(secretAccount(username), input.password)
      else await this.options.secrets.remove(secretAccount(username))
      await Promise.all(evicted.map((entry) => this.options.secrets.remove(secretAccount(entry.username))))
      await this.writeDocument({ schemaVersion: 1, entries })
    })
  }

  async clearPassword(username: string): Promise<void> {
    const normalized = normalizeUsername(username)
    await this.enqueue(async () => {
      const current = await this.readDocument()
      const entries = current.entries.map((entry) => accountId(entry.username) === accountId(normalized) ? { ...entry, hasPassword: false } : entry)
      await this.options.secrets.remove(secretAccount(normalized))
      await this.writeDocument({ schemaVersion: 1, entries })
    })
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.pendingOperation.then(operation)
    this.pendingOperation = result.then(() => undefined, () => undefined)
    return result
  }

  private async readDocument(): Promise<LoginHistoryDocument> {
    try {
      const parsed = JSON.parse(await readFile(this.metadataPath, 'utf8')) as Partial<LoginHistoryDocument>
      if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.entries)) return emptyDocument()
      const entries = parsed.entries.flatMap((entry) => {
        try {
          const username = normalizeUsername(entry.username)
          return typeof entry.hasPassword === 'boolean' && typeof entry.lastUsedAt === 'string'
            ? [{ username, hasPassword: entry.hasPassword, lastUsedAt: entry.lastUsedAt }]
            : []
        } catch { return [] }
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
    await writeFile(temporary, `${JSON.stringify(document)}\n`, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, this.metadataPath)
  }
}

export interface AsyncSafeStorage {
  isEncryptionAvailable(): boolean
  encryptStringAsync(value: string): Promise<Buffer>
  decryptStringAsync(value: Buffer): Promise<{ result: string }>
}

export class SafeStorageLoginSecretStore implements LoginSecretStore {
  constructor(private readonly root: string, private readonly safeStorage: AsyncSafeStorage) {}

  async get(account: string): Promise<string | undefined> {
    this.assertAvailable()
    try { return (await this.safeStorage.decryptStringAsync(await readFile(this.pathFor(account)))).result }
    catch (error) { if (isFileMissing(error)) return undefined; throw error }
  }

  async set(account: string, value: string): Promise<void> {
    this.assertAvailable()
    const destination = this.pathFor(account)
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, await this.safeStorage.encryptStringAsync(value), { mode: 0o600 })
    await rename(temporary, destination)
  }

  async remove(account: string): Promise<void> { await rm(this.pathFor(account), { force: true }) }

  private pathFor(account: string): string {
    return join(this.root, 'login-history', 'v1', 'secrets', `${createHash('sha256').update(account).digest('hex')}.bin`)
  }

  private assertAvailable(): void {
    if (!this.safeStorage.isEncryptionAvailable()) throw new Error('desktop_login_history_encryption_unavailable')
  }
}

function normalizeUsername(value: string): string {
  const username = value.trim()
  if (!/^[A-Za-z0-9_.@-]{1,128}$/u.test(username)) throw new Error('desktop_login_history_username_invalid')
  return username
}

function accountId(username: string): string { return username.toLocaleLowerCase('en-US') }
function secretAccount(username: string): string { return `username:${accountId(username)}` }
function emptyDocument(): LoginHistoryDocument { return { schemaVersion: 1, entries: [] } }
function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT'
}
