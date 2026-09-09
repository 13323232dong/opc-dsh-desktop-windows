import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { MacOsKeychainBackend } from './macos-keychain'

export interface SavedLoginAccount {
  username: string
  hasPassword: boolean
}

export interface LoginSecretStore {
  get(account: string): Promise<string | undefined>
  set(account: string, value: string): Promise<void>
  remove(account: string): Promise<void>
}

interface LoginHistoryEntry extends SavedLoginAccount {
  lastUsedAt: string
}

interface LoginHistoryDocument {
  schemaVersion: 1
  entries: LoginHistoryEntry[]
}

export interface LoginHistoryStoreOptions {
  root: string
  secrets: LoginSecretStore
  maximumEntries?: number
}

export class LoginHistoryStore {
  private readonly metadataPath: string
  private readonly maximumEntries: number
  private pendingOperation: Promise<void> = Promise.resolve()

  constructor(private readonly options: LoginHistoryStoreOptions) {
    this.metadataPath = join(options.root, 'login-history', 'v1', 'accounts.json')
    this.maximumEntries = Math.max(1, Math.min(options.maximumEntries ?? 10, 20))
  }

  async list(): Promise<SavedLoginAccount[]> {
    return await this.enqueue(async () =>
      (await this.readDocument()).entries.map(({ username, hasPassword }) => ({ username, hasPassword })))
  }

  async loadPassword(username: string): Promise<string | undefined> {
    const normalized = normalizeUsername(username)
    return await this.enqueue(async () => {
      const entry = (await this.readDocument()).entries.find((candidate) => accountId(candidate.username) === accountId(normalized))
      if (!entry?.hasPassword) return undefined
      return await this.options.secrets.get(secretAccount(normalized))
    })
  }

  async record(input: { username: string; password: string; rememberPassword: boolean }): Promise<void> {
    const username = normalizeUsername(input.username)
    const password = input.password
    if (!password || password.length > 1024) throw new Error('desktop_login_history_password_invalid')
    return await this.enqueue(async () => {
      const current = await this.readDocument()
      const retained = current.entries.filter((entry) => accountId(entry.username) !== accountId(username))
      const nextEntry: LoginHistoryEntry = {
        username,
        hasPassword: input.rememberPassword,
        lastUsedAt: new Date().toISOString()
      }
      const allEntries = [nextEntry, ...retained]
      const entries = allEntries.slice(0, this.maximumEntries)
      const evicted = allEntries.slice(this.maximumEntries)

      if (input.rememberPassword) await this.options.secrets.set(secretAccount(username), password)
      else await this.options.secrets.remove(secretAccount(username))
      await Promise.all(evicted.map((entry) => this.options.secrets.remove(secretAccount(entry.username))))
      await this.writeDocument({ schemaVersion: 1, entries })
    })
  }

  async clearPassword(username: string): Promise<void> {
    const normalized = normalizeUsername(username)
    return await this.enqueue(async () => {
      const current = await this.readDocument()
      const entries = current.entries.map((entry) => accountId(entry.username) === accountId(normalized)
        ? { ...entry, hasPassword: false }
        : entry)
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
      const parsed: unknown = JSON.parse(await readFile(this.metadataPath, 'utf8'))
      if (!parsed || typeof parsed !== 'object') return emptyDocument()
      const candidate = parsed as Partial<LoginHistoryDocument>
      if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.entries)) return emptyDocument()
      const entries = candidate.entries.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const value = entry as Partial<LoginHistoryEntry>
        try {
          const username = normalizeUsername(value.username ?? '')
          if (typeof value.hasPassword !== 'boolean' || typeof value.lastUsedAt !== 'string') return []
          return [{ username, hasPassword: value.hasPassword, lastUsedAt: value.lastUsedAt }]
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
    await writeFile(temporary, `${JSON.stringify(document)}\n`, { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, this.metadataPath)
  }
}

export class MacOsLoginSecretStore implements LoginSecretStore {
  private static readonly service = 'cc.ohmycode.opc.desktop.login-history'

  constructor(private readonly backend: MacOsKeychainBackend) {}

  async get(account: string): Promise<string | undefined> {
    return await this.backend.get(MacOsLoginSecretStore.service, account)
  }

  async set(account: string, value: string): Promise<void> {
    await this.backend.set(MacOsLoginSecretStore.service, account, value)
  }

  async remove(account: string): Promise<void> {
    await this.backend.remove(MacOsLoginSecretStore.service, account)
  }
}

export interface SafeStorageLoginSecretStoreOptions {
  root: string
  safeStorage: {
    isEncryptionAvailable(): boolean
    encryptString(value: string): Buffer
    decryptString(value: Buffer): string
  }
}

export class SafeStorageLoginSecretStore implements LoginSecretStore {
  constructor(private readonly options: SafeStorageLoginSecretStoreOptions) {}

  async get(account: string): Promise<string | undefined> {
    this.assertAvailable()
    try {
      return this.options.safeStorage.decryptString(await readFile(this.pathFor(account)))
    } catch (error) {
      if (isFileMissing(error)) return undefined
      throw error
    }
  }

  async set(account: string, value: string): Promise<void> {
    this.assertAvailable()
    const destination = this.pathFor(account)
    await mkdir(dirname(destination), { recursive: true, mode: 0o700 })
    const temporary = `${destination}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, this.options.safeStorage.encryptString(value), { mode: 0o600 })
    await rename(temporary, destination)
  }

  async remove(account: string): Promise<void> {
    await rm(this.pathFor(account), { force: true })
  }

  private pathFor(account: string): string {
    return join(this.options.root, 'login-history', 'v1', 'secrets', `${createHash('sha256').update(account).digest('hex')}.bin`)
  }

  private assertAvailable(): void {
    if (!this.options.safeStorage.isEncryptionAvailable()) throw new Error('desktop_login_history_encryption_unavailable')
  }
}

function normalizeUsername(value: string): string {
  const username = value.trim()
  if (!/^[A-Za-z0-9_.@-]{1,128}$/u.test(username)) throw new Error('desktop_login_history_username_invalid')
  return username
}

function accountId(username: string): string {
  return username.toLocaleLowerCase('en-US')
}

function secretAccount(username: string): string {
  return `username:${accountId(username)}`
}

function emptyDocument(): LoginHistoryDocument {
  return { schemaVersion: 1, entries: [] }
}

function isFileMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT'
}
