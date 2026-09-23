import test from 'node:test'
import assert from 'node:assert/strict'
import { buildOnboardingDirective } from '../packages/opc-profile/agent-teams-desktop/source/lib/onboarding-client.js'

const interview = (key, prompt = '你现在最想先解决什么？') => ({
  status: 'active',
  conversationId: 'interview-1',
  currentField: key,
  nextQuestion: { key, label: key, prompt },
})

test('builds a four-stage conversational directive with one question and skip affordance', () => {
  const directive = buildOnboardingDirective(interview('business_type', '你的店主要做什么？'))
  assert.match(directive, /1\/4 认识 Evan/u)
  assert.match(directive, /你的店主要做什么/u)
  assert.match(directive, /只问下面这一个问题/u)
  assert.match(directive, /opc_onboarding_skip_question/u)
  assert.match(directive, /餐饮\/零售/u)
})

test('introduces second brain creation only in its dedicated stage', () => {
  const directive = buildOnboardingDirective(interview('customer_goal'))
  assert.match(directive, /3\/4 建立你的第二大脑/u)
  assert.match(directive, /second_brain_create/u)
  assert.match(directive, /不上传对话/u)
  const ordinary = buildOnboardingDirective(interview('products'))
  assert.doesNotMatch(ordinary, /second_brain_create/u)
})

test('does not inject onboarding instructions for completed interviews', () => {
  assert.equal(buildOnboardingDirective({ status: 'completed', conversationId: 'interview-1', currentField: null, nextQuestion: null }), undefined)
})
