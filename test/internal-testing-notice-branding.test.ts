import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const settingsModelsPatch = readFileSync(
  join(process.cwd(), 'patches', '@deepseek-ai+dsh-client-ui-settings-models+0.1.2-rc.1.patch'),
  'utf8'
)
const runtimeSource = readFileSync(
  join(process.cwd(), 'src', 'main', 'runtime', 'harness-runtime.ts'),
  'utf8'
)
const preloadSource = readFileSync(
  join(process.cwd(), 'src', 'preload', 'index.ts'),
  'utf8'
)
const patchedSettingsModelsClient = readFileSync(
  join(process.cwd(), 'node_modules', '@deepseek-ai', 'dsh-client-ui-settings-models', 'lib', 'client.js'),
  'utf8'
)
const realtimeVoiceBundle = join(
  process.cwd(),
  'packages',
  'opc-profile',
  'plugins',
  'opc-dsh-realtime-voice-0.1.0.tgz'
)

function bundledVoiceClient(): string {
  return execFileSync('tar', ['-xOf', realtimeVoiceBundle, 'package/lib/client.js'], {
    encoding: 'utf8'
  })
}

describe('internal testing notice branding', () => {
  it('brands the internal testing notice as Evan Super Butler instead of upstream runtime wording', () => {
    expect(settingsModelsPatch).toContain('welcomeTitle: "Evan超级管家内测声明"')
    expect(settingsModelsPatch).toContain('welcomeTitle: "Evan Super Butler Internal Testing Notice"')
    expect(settingsModelsPatch).toContain('Evan超级管家目前处于内测阶段')
    expect(settingsModelsPatch).toContain('Evan Super Butler is currently in internal testing')
    expect(patchedSettingsModelsClient).toContain('welcomeTitle: "Evan超级管家内测声明"')
    expect(patchedSettingsModelsClient).not.toContain('welcomeTitle: "内测声明"')
    expect(patchedSettingsModelsClient).not.toContain('欢迎全球 Harness 开发者加入 DSH 插件生态')
    expect(patchedSettingsModelsClient).not.toContain('DeepSeek Harness 目前的 0.1 版本')
    expect(patchedSettingsModelsClient).not.toContain('DeepSeek Harness 0.1 remains in testing')
  })

  it('starts the packaged voice interview after the notice is acknowledged', () => {
    expect(settingsModelsPatch).toContain('opc:internal-testing-notice-acknowledged')
    expect(settingsModelsPatch).toContain('__opcInternalTestingNoticeAcknowledged')
    expect(bundledVoiceClient()).toContain('OnboardingRuntime')
    expect(bundledVoiceClient()).toContain('打开访谈引导')
  })

  it('uses Evan Super Butler wording while launching the local runtime', () => {
    expect(runtimeSource).toContain('正在启动 Evan超级管家…')
    expect(runtimeSource).not.toContain('Starting DeepSeek Harness…')
  })

  it('rewrites upstream window titles to the Evan product brand in the desktop shell', () => {
    expect(preloadSource).toContain("const DESKTOP_PRODUCT_NAME_ZH = 'Evan超级管家'")
    expect(preloadSource).toContain("const DESKTOP_PRODUCT_NAME_EN = 'Evan Super Butler'")
    expect(preloadSource).toContain('function applyDesktopTitleBranding')
    expect(preloadSource).toContain('DeepSeek Harness|DSH Desktop')
  })
})
