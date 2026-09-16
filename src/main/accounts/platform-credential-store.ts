import type { CredentialStore } from './credential-store'
import { ElectronSafeStorageCredentialStore, type WindowsCredentialCodec } from './windows-dpapi-credential-store'

export interface ElectronSafeStorageLike {
  isEncryptionAvailable(): boolean
  encryptStringAsync(value: string): Promise<Buffer>
  decryptStringAsync(value: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }>
}

export interface PlatformCredentialStoreOptions {
  platform: NodeJS.Platform
  root: string
  safeStorage?: ElectronSafeStorageLike
}

/** Select a platform vault at startup. Unsupported or unencrypted platforms fail closed. */
export function createPlatformCredentialStore(options: PlatformCredentialStoreOptions): CredentialStore {
  if (options.platform === 'darwin' || options.platform === 'win32') {
    const safeStorage = options.safeStorage
    if (!safeStorage?.isEncryptionAvailable()) {
      throw new Error(options.platform === 'darwin'
        ? 'desktop_macos_credential_encryption_unavailable'
        : 'desktop_windows_credential_encryption_unavailable')
    }
    const codec: WindowsCredentialCodec = {
      encryptString: (value) => safeStorage.encryptStringAsync(value),
      decryptString: async (value) => (await safeStorage.decryptStringAsync(value)).result
    }
    return new ElectronSafeStorageCredentialStore({ root: options.root, codec })
  }
  throw new Error('desktop_credential_platform_unsupported')
}
