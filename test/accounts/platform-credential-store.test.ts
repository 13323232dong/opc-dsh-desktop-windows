import { describe, expect, it } from 'vitest'
import { createPlatformCredentialStore } from '../../src/main/accounts/platform-credential-store'

describe('createPlatformCredentialStore', () => {
  it('creates a Windows DPAPI store only when OS encryption is available', () => {
    const store = createPlatformCredentialStore({
      platform: 'win32',
      root: 'C:\\Users\\test\\AppData\\Roaming\\opc',
      safeStorage: {
        isEncryptionAvailable: () => true,
        encryptStringAsync: async (value) => Buffer.from(value),
        decryptStringAsync: async (value) => ({ result: value.toString('utf8'), shouldReEncrypt: false })
      }
    })

    expect(store.constructor.name).toBe('ElectronSafeStorageCredentialStore')
  })

  it('uses Electron safeStorage on macOS so credentials remain protected by Keychain', () => {
    const store = createPlatformCredentialStore({
      platform: 'darwin',
      root: '/Users/test/Library/Application Support/opc',
      safeStorage: {
        isEncryptionAvailable: () => true,
        encryptStringAsync: async (value) => Buffer.from(value),
        decryptStringAsync: async (value) => ({ result: value.toString('utf8'), shouldReEncrypt: false })
      }
    })

    expect(store.constructor.name).toBe('ElectronSafeStorageCredentialStore')
  })

  it('fails closed rather than storing Windows credentials without DPAPI', () => {
    expect(() => createPlatformCredentialStore({
      platform: 'win32',
      root: 'C:\\Users\\test\\AppData\\Roaming\\opc',
      safeStorage: {
        isEncryptionAvailable: () => false,
        encryptStringAsync: async (value) => Buffer.from(value),
        decryptStringAsync: async (value) => ({ result: value.toString('utf8'), shouldReEncrypt: false })
      }
    })).toThrow('desktop_windows_credential_encryption_unavailable')
  })
})
