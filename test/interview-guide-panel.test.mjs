import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

const source = await readFile(new URL('../packages/opc-profile/agent-teams-desktop/source/lib/client/InterviewGuidePanel.js', import.meta.url), 'utf8')
const index = await readFile(new URL('../packages/opc-profile/agent-teams-desktop/source/lib/client/index.js', import.meta.url), 'utf8')

test('interview guide is limited to the interview workspace and uses the shared composer', () => {
  expect(source).toMatch(/cwd\.endsWith\('\/访谈'\)/u)
  expect(source).toMatch(/inputActions\.setDraft/u)
  expect(source).toMatch(/inputActions\.submit/u)
  expect(index).toMatch(/conversation\.input\.dock/u)
  expect(index).toMatch(/InterviewGuidePanel/u)
})

test('guide exposes the four conversational onboarding actions and pause control', () => {
  for (const label of ['认识 Evan', '认识我的生意', '建立第二大脑', '完善公司资料', '稍后继续']) expect(source).toMatch(new RegExp(label, 'u'))
})

test('shipped artifact contains the rebuilt executable guide and matches maintained client', async () => {
  const manifest = JSON.parse(await readFile(new URL('../packages/opc-profile/release-manifest.json', import.meta.url), 'utf8'))
  const plugin = manifest.plugins.find(item => item.name === '@nanmicoder/dsh-agent-teams')
  const artifact = new URL(`../packages/opc-profile/${plugin.artifact}`, import.meta.url)
  const client = execFileSync('tar', ['-xOf', artifact.pathname, 'package/lib/client.js'], { encoding: 'utf8' })
  expect(client).toBe(await readFile(new URL('../packages/opc-profile/agent-teams-desktop/source/lib/client.js', import.meta.url), 'utf8'))
  expect(client).toContain('agent-teams-interview-guide')
  expect(client).toContain('我们先认识一下')
  expect(client).toContain('useSessions')
})
