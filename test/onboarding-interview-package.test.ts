import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const settingsPatch = readFileSync(join(root, 'patches', '@deepseek-ai+dsh-client-ui-settings-models+0.1.2-rc.1.patch'), 'utf8')
const voiceBundle = join(root, 'packages', 'opc-profile', 'plugins', 'opc-dsh-realtime-voice-0.1.5.tgz')

function bundledVoiceClient(): string {
  return execFileSync('tar', ['-xOf', voiceBundle, 'package/lib/client.js'], { encoding: 'utf8' })
}

describe('packaged onboarding interview', () => {
  it('packages platform status routing and the interview opening question', () => {
    const server = execFileSync('tar', ['-xOf', voiceBundle, 'package/lib/index.js'], { encoding: 'utf8' })
    expect(server).toContain('/api/v1/agent/onboarding/status')
    expect(server).toContain('resolveOpeningSpeech')
    expect(server).toContain('openingDelivered')
  })
  it('starts the voice interview after the internal notice is acknowledged', () => {
    expect(settingsPatch).toContain('opc:internal-testing-notice-acknowledged')
    expect(settingsPatch).toContain('__opcInternalTestingNoticeAcknowledged')
  })

  it('keeps the packaged interview entry discoverable until completion', () => {
    const client = bundledVoiceClient()
    expect(client).toContain('打开访谈引导')
    expect(client).toContain('开始访谈')
    expect(client).toContain('继续访谈')
    expect(client).toContain('访谈中')
    expect(client).toContain('工作对话中')
    expect(client).toContain('返回语音模式')
    expect(client).toContain('正在检查访谈')
    expect(client).toContain('登录状态已失效，请重新登录后继续访谈')
  })
})
