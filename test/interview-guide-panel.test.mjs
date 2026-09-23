import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../packages/opc-profile/agent-teams-desktop/source/lib/client/InterviewGuidePanel.js', import.meta.url), 'utf8')
const index = await readFile(new URL('../packages/opc-profile/agent-teams-desktop/source/lib/client/index.js', import.meta.url), 'utf8')

test('interview guide is limited to the interview workspace and uses the shared composer', () => {
  assert.match(source, /cwd\.endsWith\('\/访谈'\)/u)
  assert.match(source, /inputActions\.setDraft/u)
  assert.match(source, /inputActions\.submit/u)
  assert.match(source, /position: 'fixed'/u)
  assert.match(source, /inset: 0/u)
  assert.match(index, /conversation\.input\.dock/u)
  assert.match(index, /InterviewGuidePanel/u)
})

test('guide exposes the four conversational onboarding actions and pause control', () => {
  for (const label of ['认识 Evan', '认识我的生意', '建立第二大脑', '完善公司资料', '稍后继续']) assert.match(source, new RegExp(label, 'u'))
})
