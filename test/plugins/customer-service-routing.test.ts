import { describe, expect, it } from 'vitest'
// @ts-expect-error bundled upstream JavaScript has no declaration for this adapter
import { customerServiceTools } from '../../packages/opc-profile/agent-teams-desktop/source/lib/customer-service-tools.js'

describe('AI customer-service member routing', () => {
  it('uses the seven Mac tools with no Android dependency', () => {
    expect(customerServiceTools('darwin')).toEqual(['status', 'find_contact', 'read_chat', 'send', 'watch', 'pause', 'tasks'].map(name => `wechat_customer_service_${name}`))
  })
  it('preserves legacy routing on other systems', () => {
    expect(customerServiceTools('win32')).toEqual(['wechat_contact_status', 'wechat_message_draft', 'wechat_message_send'])
  })
})
