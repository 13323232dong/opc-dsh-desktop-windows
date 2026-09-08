import { describe, expect, it } from 'vitest'
import { OPC_PLUGIN_COMPATIBILITY_MATRIX } from '../../packages/opc-profile/index.js'

describe('OPC first-batch plugin compatibility matrix', () => {
  it('records every profile plugin and gives it a desktop disposition', () => {
    const profileNames = new Set(OPC_PLUGIN_COMPATIBILITY_MATRIX.map((entry) => entry.name))

    expect(OPC_PLUGIN_COMPATIBILITY_MATRIX.every((entry) => entry.desktopDisposition)).toBe(true)
    expect(profileNames.has('@opc/dsh-brand')).toBe(true)
    expect(profileNames.has('@nanmicoder/dsh-agent-teams')).toBe(true)
  })

  it('keeps server-only and macOS capability plugins out of browser client bundles', () => {
    const byName = new Map(OPC_PLUGIN_COMPATIBILITY_MATRIX.map((entry) => [entry.name, entry]))

    expect(byName.get('@opc/dsh-feishu-docs')).toMatchObject({ clientBundle: false })
    expect(byName.get('@opc/DSH-dong-computer-use')).toMatchObject({ desktopDisposition: 'broker-adapter' })
  })

  it('does not mark macOS-native control plugins as Windows-ready before their native adapter exists', () => {
    const byName = new Map(OPC_PLUGIN_COMPATIBILITY_MATRIX.map((entry) => [entry.name, entry]))

    expect(byName.get('@opc/DSH-dong-computer-use')).toMatchObject({ windowsDisposition: 'requires-native-adapter' })
    expect(byName.get('@opc/dsh-dong-mobile-control')).toMatchObject({ windowsDisposition: 'requires-native-adapter' })
    expect(byName.get('@nanmicoder/dsh-agent-teams')).toMatchObject({ windowsDisposition: 'supported' })
  })
})
