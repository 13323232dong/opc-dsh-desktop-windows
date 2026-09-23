import { describe, expect, it, vi } from 'vitest'

describe('direct provider usage reporting', () => {
  it('records BYOK without forwarding key, messages or provider URL', async () => {
    const { reportExternalUsage } = await import('../packages/dsh-desktop-client-ui/billing-runtime.js')
    const fetcher = vi.fn(async () => new Response('{}'))
    await reportExternalUsage({ billingInvocationId: 'i1', billingContext: { conversationId: 'c1' }, provider: 'deepseek', model: 'chat', messages: ['secret'] }, 'https://provider.test/v1?key=secret', { inputTokens: 3, outputTokens: 4 }, { OPC_LOCAL_BROKER_URL: 'http://127.0.0.1:4567/v1/runtimes/r1', OPC_LOCAL_BROKER_TOKEN: 'runtime-token' }, fetcher)
    expect(fetcher).toHaveBeenCalledOnce()
    const [url, init] = fetcher.mock.calls[0] as any
    expect(url).toBe('http://127.0.0.1:4567/v1/runtimes/r1/capabilities/cloud.proxy')
    const payload = JSON.parse(init.body)
    expect(payload.body).toEqual({ eventId: 'i1', billingContext: { conversationId: 'c1' }, provider: 'deepseek', model: 'chat', usage: { inputTokens: 3, outputTokens: 4 } })
    expect(init.body).not.toContain('secret')
  })
  it('does not label platform-routed or unidentifiable calls as BYOK', async () => {
    const { reportExternalUsage } = await import('../packages/dsh-desktop-client-ui/billing-runtime.js')
    const fetcher = vi.fn()
    const env = { OPC_LOCAL_BROKER_URL: 'http://127.0.0.1:4567/v1/runtimes/r1', OPC_LOCAL_BROKER_TOKEN: 'token' }
    const options = { billingInvocationId: 'i', billingContext: { conversationId: 'c' }, provider: 'p', model: 'm' }
    await reportExternalUsage(options, env.OPC_LOCAL_BROKER_URL + '/model/v1', {}, env, fetcher)
    await reportExternalUsage({}, 'https://api.provider.test', {}, env, fetcher)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('uses stable event identity and never breaks model completion on reporting failure', async () => {
    const { reportExternalUsage } = await import('../packages/dsh-desktop-client-ui/billing-runtime.js')
    const fetcher = vi.fn(async () => { throw new Error('private provider response') })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(reportExternalUsage({ billingInvocationId: 'same', billingContext: { conversationId: 'c' }, provider: 'p', model: 'm' }, 'https://provider.test', {}, { OPC_LOCAL_BROKER_URL: 'http://127.0.0.1:4567/v1/runtimes/r1', OPC_LOCAL_BROKER_TOKEN: 'token' }, fetcher)).resolves.toBe(false)
    expect(warn.mock.calls.flat().join(' ')).not.toContain('private')
    warn.mockRestore()
  })
})
