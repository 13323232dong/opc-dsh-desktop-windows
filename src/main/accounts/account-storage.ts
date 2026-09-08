import { lstat, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { AccountOwnerMetadata } from '../../shared/account-contracts'
import { isAccountKey } from './account-key'

export interface AccountIdentity {
  accountKey: string
  tenantId: string
  userId: string
}

export interface AccountLayout {
  root: string
  dshHome: string
  workspace: string
  logs: string
  ownerPath: string
}

export class AccountStorage {
  constructor(
    private readonly root: string,
    private readonly now: () => Date = () => new Date()
  ) {}

  async open(identity: AccountIdentity): Promise<AccountLayout> {
    if (!isAccountKey(identity.accountKey)) throw new Error('desktop_account_key_invalid')
    const accountRoot = join(this.root, 'accounts', identity.accountKey)
    const ownerPath = join(accountRoot, 'owner.json')
    const existed = await this.pathExists(accountRoot)

    if (existed) {
      const stat = await lstat(accountRoot)
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('desktop_account_directory_invalid')
      const owner = await this.readOwner(ownerPath)
      this.assertOwner(owner, identity)
      await this.writeOwner(ownerPath, { ...owner, lastOpenedAt: this.now().toISOString() })
    } else {
      await mkdir(accountRoot, { recursive: true })
      const timestamp = this.now().toISOString()
      await this.writeOwner(ownerPath, {
        schemaVersion: 1,
        accountKey: identity.accountKey,
        tenantId: identity.tenantId,
        userId: identity.userId,
        createdAt: timestamp,
        lastOpenedAt: timestamp
      })
    }

    const layout: AccountLayout = {
      root: accountRoot,
      dshHome: join(accountRoot, 'dsh-home'),
      workspace: join(accountRoot, 'workspace'),
      logs: join(accountRoot, 'logs'),
      ownerPath
    }
    await Promise.all([mkdir(layout.dshHome, { recursive: true }), mkdir(layout.workspace, { recursive: true }), mkdir(layout.logs, { recursive: true })])
    return layout
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await lstat(path)
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
      throw error
    }
  }

  private async readOwner(path: string): Promise<AccountOwnerMetadata> {
    let raw: string
    try {
      raw = await readFile(path, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error('desktop_account_owner_missing')
      throw error
    }
    try {
      const owner: unknown = JSON.parse(raw)
      if (!isOwner(owner)) throw new Error('invalid')
      return owner
    } catch {
      throw new Error('desktop_account_owner_invalid')
    }
  }

  private assertOwner(owner: AccountOwnerMetadata, identity: AccountIdentity): void {
    if (owner.accountKey !== identity.accountKey || owner.tenantId !== identity.tenantId || owner.userId !== identity.userId) {
      throw new Error('desktop_account_owner_mismatch')
    }
  }

  private async writeOwner(path: string, owner: AccountOwnerMetadata): Promise<void> {
    await mkdir(dirname(path), { recursive: true })
    const temporary = `${path}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`
    await writeFile(temporary, `${JSON.stringify(owner, null, 2)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    await rename(temporary, path)
  }
}

function isOwner(value: unknown): value is AccountOwnerMetadata {
  if (!value || typeof value !== 'object') return false
  const owner = value as Partial<AccountOwnerMetadata>
  return owner.schemaVersion === 1 &&
    typeof owner.accountKey === 'string' && isAccountKey(owner.accountKey) &&
    typeof owner.tenantId === 'string' && typeof owner.userId === 'string' &&
    typeof owner.createdAt === 'string' && typeof owner.lastOpenedAt === 'string'
}
