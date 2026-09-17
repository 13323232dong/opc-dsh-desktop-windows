import { describe, expect, it, vi } from 'vitest'
import { createMerchantConsoleHandoff } from '../../src/main/accounts/merchant-console-handoff'

describe('createMerchantConsoleHandoff', () => {
  it('uses only the protected desktop session to request a merchant handoff', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { exchangeUrl: 'https://opc.example.com/login/handoff?surface=merchant#0123456789abcdefghijklmnopqrstuv' }
    }), { status: 201, headers: { 'content-type': 'application/json' } }))

    await expect(createMerchantConsoleHandoff({ apiBaseUrl: 'https://opc.example.com', accessToken: 'protected-token', fetch: fetcher }))
      .resolves.toBe('https://opc.example.com/login/handoff?surface=merchant#0123456789abcdefghijklmnopqrstuv')
    expect(fetcher).toHaveBeenCalledWith('https://opc.example.com/api/v1/auth/console-handoffs', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ cookie: 'opc_session=protected-token' }), body: JSON.stringify({ surface: 'merchant' })
    }))
  })

  it('rejects handoff URLs outside the configured OPC origin', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { exchangeUrl: 'https://attacker.example/login/handoff?surface=merchant#token' }
    }), { status: 201, headers: { 'content-type': 'application/json' } }))

    await expect(createMerchantConsoleHandoff({ apiBaseUrl: 'https://opc.example.com', accessToken: 'protected-token', fetch: fetcher }))
      .rejects.toThrow('desktop_merchant_handoff_url_invalid')
  })

  it('does not accept a response that lacks a one-time merchant handoff', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { exchangeUrl: 'https://opc.example.com/workspace/brain' } }), { status: 201, headers: { 'content-type': 'application/json' } }))
    await expect(createMerchantConsoleHandoff({ apiBaseUrl: 'https://opc.example.com', accessToken: 'protected-token', fetch: fetcher }))
      .rejects.toThrow('desktop_merchant_handoff_url_invalid')
  })

  it('permits an HTTP handoff only for an explicitly enabled loopback API', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { exchangeUrl: 'http://127.0.0.1:3001/login/handoff?surface=merchant#0123456789abcdefghijklmnopqrstuv' }
    }), { status: 201, headers: { 'content-type': 'application/json' } }))

    await expect(createMerchantConsoleHandoff({
      apiBaseUrl: 'http://127.0.0.1:3001', accessToken: 'protected-token', allowInsecureLoopback: true, fetch: fetcher
    })).resolves.toContain('/login/handoff?surface=merchant#')
    await expect(createMerchantConsoleHandoff({
      apiBaseUrl: 'http://opc.example.com', accessToken: 'protected-token', allowInsecureLoopback: true, fetch: fetcher
    })).rejects.toThrow('desktop_merchant_handoff_api_invalid')
  })
})
