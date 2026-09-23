import { expect, test } from 'vitest'
import { buildOnboardingDirective } from '../packages/opc-profile/agent-teams-desktop/source/lib/onboarding-client.js'

const interview = (key, prompt = '你现在最想先解决什么？') => ({
  status: 'active',
  conversationId: 'interview-1',
  currentField: key,
  nextQuestion: { key, label: key, prompt },
})

test('builds a four-stage conversational directive with one question and skip affordance', () => {
  const directive = buildOnboardingDirective(interview('business_type', '你的店主要做什么？'))
  expect(directive).toMatch(/1\/4 认识 Evan/u)
  expect(directive).toMatch(/你的店主要做什么/u)
  expect(directive).toMatch(/只问下面这一个问题/u)
  expect(directive).toMatch(/opc_onboarding_skip_question/u)
  expect(directive).toMatch(/餐饮\/零售/u)
})

test('introduces second brain creation only in its dedicated stage', () => {
  const directive = buildOnboardingDirective(interview('customer_goal'))
  expect(directive).toMatch(/3\/4 建立你的第二大脑/u)
  expect(directive).toMatch(/second_brain_create/u)
  expect(directive).toMatch(/不上传对话/u)
  const ordinary = buildOnboardingDirective(interview('products'))
  expect(ordinary).not.toMatch(/second_brain_create/u)
})

test('does not inject onboarding instructions for completed interviews', () => {
  expect(buildOnboardingDirective({ status: 'completed', conversationId: 'interview-1', currentField: null, nextQuestion: null })).toBeUndefined()
})
