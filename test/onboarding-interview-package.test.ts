import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const settingsPatch = readFileSync(join(root, 'patches', '@deepseek-ai+dsh-client-ui-settings-models+0.1.2-rc.1.patch'), 'utf8')
const voiceBundle = join(root, 'packages', 'opc-profile', 'plugins', 'opc-dsh-realtime-voice-0.1.9.tgz')

function bundledVoiceClient(): string {
  return execFileSync('tar', ['-xOf', voiceBundle, 'package/lib/client.js'], { encoding: 'utf8' })
}

describe('packaged onboarding interview', () => {
  it('packages the shared session voice runtime and interview workspace support', () => {
    const server = execFileSync('tar', ['-xOf', voiceBundle, 'package/lib/index.js'], { encoding: 'utf8' })
    expect(server).toContain('/opc-realtime-voice/session/open')
    expect(server).toContain('voice_open_superseded')
  })
  it('does not register a separate interview overlay in the packaged client', () => {
    const client = bundledVoiceClient()
    expect(client).not.toContain('opc-realtime-voice-onboarding-entry')
    expect(client).toContain('opc-realtime-voice-button')
  })

  it('keeps the shared Jarvis session voice UI packaged', () => {
    const client = bundledVoiceClient()
    expect(client).toContain('opc-realtime-voice-overlay')
    expect(client).toContain('全屏语音模式')
    expect(client).toContain('贾维斯')
  })
})
