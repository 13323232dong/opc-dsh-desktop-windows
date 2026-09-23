/** Host-only observation of direct-provider calls. Never estimates provider fees. */
export async function reportExternalUsage(options, providerUrl, usage = {}, environment = process.env, fetcher = fetch) {
  const base = environment.OPC_LOCAL_BROKER_URL
  const token = environment.OPC_LOCAL_BROKER_TOKEN
  if (!base || !token || !options.billingInvocationId || !options.billingContext?.conversationId) return false
  try {
    const broker = new URL(base)
    const provider = new URL(providerUrl)
    if (broker.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(broker.hostname)) return false
    // The same loopback broker owns platform model billing. Never duplicate it.
    if (provider.origin === broker.origin) return false
    const safeUsage = Object.fromEntries(['inputTokens', 'outputTokens', 'cachedTokens'].filter(key => Number.isSafeInteger(usage[key]) && usage[key] >= 0).map(key => [key, usage[key]]))
    const response = await fetcher(`${base.replace(/\/$/, '')}/capabilities/cloud.proxy`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': options.billingInvocationId },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({ path: '/api/v1/compute/external-usage', method: 'POST', body: {
        eventId: options.billingInvocationId, billingContext: options.billingContext,
        provider: options.provider, model: options.model, usage: safeUsage
      } })
    })
    if (!response.ok) throw new Error('report_failed')
    return true
  } catch {
    console.warn('服务商用量记录暂未同步，平台未扣积分；费用由服务商结算。')
    return false
  }
}
