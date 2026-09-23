type RecordValue = Record<string, unknown>
const record = (value: unknown): RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : {}
const invalid = (): never => { throw new Error('扣费明细数据格式异常，请重试') }
const text = (value: unknown): string => typeof value === 'string' ? value : invalid()
const micros = (value: unknown): string => typeof value === 'string' && /^\d+$/.test(value) ? value : invalid()
const amounts = (value: unknown) => {
  const row = record(value)
  return { chargedCreditMicros: micros(row.chargedCreditMicros), reservedCreditMicros: micros(row.reservedCreditMicros), refundedCreditMicros: micros(row.refundedCreditMicros) }
}
const fields = ['conversationId', 'rootConversationId', 'turnId', 'actionId', 'taskId', 'agentId', 'actionName'] as const

export function chargeDetailsQuery(input: unknown): URLSearchParams {
  const query = record(input)
  const params = new URLSearchParams()
  for (const field of ['conversationId', 'cursor'] as const) {
    if (query[field] === undefined) continue
    if (typeof query[field] !== 'string' || !query[field].trim() || query[field].length > (field === 'cursor' ? 4096 : 160)) throw new Error('扣费查询参数无效')
    params.set(field, query[field])
  }
  if (query.sort !== undefined && query.sort !== 'time' && query.sort !== 'amount') throw new Error('扣费排序方式无效')
  params.set('sort', String(query.sort ?? 'time'))
  if (query.limit !== undefined && (!Number.isInteger(query.limit) || Number(query.limit) < 1 || Number(query.limit) > 100)) throw new Error('扣费查询条数无效')
  params.set('limit', String(query.limit ?? 50))
  return params
}

type SnapshotValue = null | boolean | string | number | SnapshotValue[] | { [key: string]: SnapshotValue }
function snapshotRecord(input: unknown): Record<string, SnapshotValue> {
  let nodes = 0
  let characters = 0
  function copy(value: unknown, depth: number): SnapshotValue {
    if (++nodes > 1000 || depth > 6) return invalid()
    if (value === null || typeof value === 'boolean') return value
    if (typeof value === 'string') {
      characters += value.length
      if (value.length > 4096 || characters > 64000) return invalid()
      return value
    }
    if (typeof value === 'number') return Number.isFinite(value) ? value : invalid()
    if (Array.isArray(value)) {
      if (value.length > 100) return invalid()
      return value.map(item => copy(item, depth + 1))
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value)
      if (entries.length > 100) return invalid()
      return Object.fromEntries(entries.map(([key, item]) => {
        if (key.length > 160 || ['__proto__', 'prototype', 'constructor'].includes(key)) return invalid()
        return [key, copy(item, depth + 1)]
      }))
    }
    return invalid()
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid()
  return copy(input, 0) as Record<string, SnapshotValue>
}

export function parseChargeDetailsResponse(ok: boolean, status: number, payload: unknown) {
  const envelope = record(payload)
  if (!ok || envelope.success !== true) throw new Error(status === 401 ? '登录已过期，请重新登录后查看扣费明细' : '扣费明细读取失败，请稍后重试')
  const data = record(envelope.data)
  if (!Array.isArray(data.items) || data.items.length > 100) return invalid()
  const items = data.items.map((value) => {
    const row = record(value)
    const context = record(row.billingContext)
    return {
      id: text(row.id), createdAt: text(row.createdAt), actionName: text(row.actionName),
      agentId: row.agentId === null ? null : text(row.agentId), provider: row.provider === null ? null : text(row.provider), model: row.model === null ? null : text(row.model),
      status: text(row.status), billingMode: text(row.billingMode), association: text(row.association),
      ...amounts(row), usage: snapshotRecord(row.usage), pricing: snapshotRecord(row.pricing),
      billingContext: row.billingContext == null ? null : Object.fromEntries(fields.filter((field) => typeof context[field] === 'string').map((field) => [field, context[field]]))
    }
  })
  return { summary: amounts(data.summary), items, nextCursor: data.nextCursor === null ? null : text(data.nextCursor) }
}
