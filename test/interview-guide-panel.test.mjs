import { expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'

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
