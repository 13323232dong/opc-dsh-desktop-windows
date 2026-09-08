import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WindowsDpapiCredentialStore } from '../../src/main/accounts/windows-dpapi-credential-store'

const principal = {
  tenantId: 'tenant-a',
  userId: 'user-a',
  sessionId: 'session-a',
  accountKey: 'a'.repeat(64)
}

const credential = {
  tenantId: principal.tenantId,
  userId: principal.userId,
  sessionId: principal.sessionId,
  accessToken: 'desktop-session-token'
}

function createCodec() {
  return {
    async encryptString(value: string): Promise<Buffer> {
      return Buffer.from(`protected:${value}`, 'utf8')
    },
    async decryptString(value: Buffer): Promise<string> {
      const decoded = value.toString('utf8')
      if (!decoded.startsWith('protected:')) throw new Error('desktop_windows_credential_unreadable')
      return decoded.slice('protected:'.length)
    }
  }
}

describe('WindowsDpapiCredentialStore', () => {
  it('writes DPAPI-protected credentials under the account key without plaintext tokens', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-windows-credentials-'))
    try {
      const store = new WindowsDpapiCredentialStore({ root, codec: createCodec() })
      await store.save(principal, credential)

      const stored = await readFile(join(root, 'credentials', 'v1', `${principal.accountKey}.bin`), 'utf8')
      expect(stored).not.toContain(credential.accessToken)
      await expect(store.load(principal)).resolves.toEqual(credential)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('fails closed when decrypted credentials belong to another principal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-windows-credentials-'))
    try {
      const store = new WindowsDpapiCredentialStore({ root, codec: createCodec() })
      const protectedPayload = Buffer.from(`protected:${JSON.stringify({ ...credential, userId: 'user-b' })}`, 'utf8').toString('base64')
      const credentialDir = join(root, 'credentials', 'v1')
      await mkdir(credentialDir, { recursive: true })
      await writeFile(join(credentialDir, `${principal.accountKey}.bin`), protectedPayload)
      await expect(store.load(principal)).rejects.toThrow('desktop_account_credential_mismatch')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('deletes only the selected account credential and treats a missing credential as signed out', async () => {
    const root = await mkdtemp(join(tmpdir(), 'opc-windows-credentials-'))
    try {
      const store = new WindowsDpapiCredentialStore({ root, codec: createCodec() })
      await expect(store.load(principal)).resolves.toBeUndefined()
      await store.save(principal, credential)
      await store.remove(principal)
      await expect(store.load(principal)).resolves.toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
