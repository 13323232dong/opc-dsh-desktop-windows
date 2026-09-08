import type { CredentialStore, MacOsKeychainCredentialStoreOptions } from './credential-store'
import { MacOsKeychainCredentialStore } from './credential-store'
import { WindowsDpapiCredentialStore, type WindowsCredentialCodec } from './windows-dpapi-credential-store'

export interface ElectronSafeStorageLike {
  isEncryptionAvailable(): boolean
  encryptStringAsync(value: string): Promise<Buffer>
  decryptStringAsync(value: Buffer): Promise<{ result: string; shouldReEncrypt: boolean }>
}

export interface PlatformCredentialStoreOptions {
  platform: NodeJS.Platform
  root: string
  safeStorage?: ElectronSafeStorageLike
  macOs?: Omit<MacOsKeychainCredentialStoreOptions, 'platform'>
}

/** Select a platform vault at startup. Unsupported or unencrypted platforms fail closed. */
export function createPlatformCredentialStore(options: PlatformCredentialStoreOptions): CredentialStore {
  if (options.platform === 'darwin') {
    return new MacOsKeychainCredentialStore({ ...options.macOs, platform: 'darwin' })
  }
  if (options.platform === 'win32') {
    const safeStorage = options.safeStorage
    if (!safeStorage?.isEncryptionAvailable()) throw new Error('desktop_windows_credential_encryption_unavailable')
    const codec: WindowsCredentialCodec = {
      encryptString: (value) => safeStorage.encryptStringAsync(value),
      decryptString: async (value) => (await safeStorage.decryptStringAsync(value)).result
    }
    return new WindowsDpapiCredentialStore({ root: options.root, codec })
  }
  throw new Error('desktop_credential_platform_unsupported')
}
