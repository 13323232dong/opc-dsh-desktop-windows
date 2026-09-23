import { createHash, randomUUID } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'

const contextFields = ['conversationId', 'rootConversationId', 'turnId', 'actionId', 'taskId', 'agentId', 'actionName'] as const

export function modelBillingAttribution(runtimeId: string, headers: IncomingHttpHeaders) {
  const nativeSession = headers['x-deepseek-harness-session-id']
  const encoded = headers['x-opc-billing-context']
  let billingContext: Record<string, string> | undefined
  if (encoded !== undefined) {
    if (typeof encoded !== 'string' || encoded.length > 4096) throw new Error('invalid_billing_context')
    const parsed: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_billing_context')
    const context = parsed as Record<string, unknown>
    billingContext = {}
    for (const field of contextFields) {
      const value = context[field]
      if (value === undefined) continue
      if (typeof value !== 'string' || !value.trim() || value.length > 160) throw new Error('invalid_billing_context')
      billingContext[field] = value
    }
    if (!billingContext.conversationId || nativeSession !== undefined && billingContext.conversationId !== nativeSession) throw new Error('invalid_billing_context')
  } else if (typeof nativeSession === 'string' && nativeSession.length > 0 && nativeSession.length <= 160) {
    billingContext = { conversationId: nativeSession }
  }
  const invocation = headers['x-opc-invocation-id']
  if (invocation !== undefined && (typeof invocation !== 'string' || !invocation.trim() || invocation.length > 160)) throw new Error('invalid_invocation_id')
  // Legacy runtimes cannot identify retries. Never replay an unrelated identical action.
  const invocationId = invocation ?? randomUUID()
  const idempotencyKey = `dsh-${createHash('sha256').update(runtimeId).update('\0').update(billingContext?.conversationId ?? '').update('\0').update(invocationId).digest('hex')}`
  return { billingContext, idempotencyKey }
}
