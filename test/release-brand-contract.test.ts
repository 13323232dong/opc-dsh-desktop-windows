import { describe, expect, it } from 'vitest'

import { verifyReleaseBrandContract } from '../scripts/release-brand-contract.mjs'

describe('release brand contract', () => {
  it('accepts the committed Evan release identity', async () => {
    await expect(verifyReleaseBrandContract()).resolves.toMatchObject({
      productName: 'Evan超级管家',
      appName: 'Evan超级管家.app',
      iconSha256: 'b892742dd9fd7e16cf771d08a7e38006fddd9f955dfdc826f85a1c2591c78968'
    })
  })

  it('rejects legacy product names before packaging', async () => {
    await expect(verifyReleaseBrandContract({
      packageJson: {
        build: {
          productName: '伟东 OPC',
          artifactName: 'Evan超级管家-${os}-${arch}.${ext}',
          mac: { icon: 'build/icon.icns' },
          win: { icon: 'build/icon.ico' },
          nsis: { artifactName: 'Evan超级管家-windows-${arch}-setup.${ext}' }
        }
      }
    })).rejects.toThrow('productName')
  })
})
