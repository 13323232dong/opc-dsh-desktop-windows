export interface BillingRuntimeContext {
  conversationId: string
  rootConversationId?: string
  turnId?: string
  actionId?: string
  taskId?: string
  agentId?: string
  actionName?: string
}

export interface ExternalUsageOptions {
  [key: string]: unknown
  billingInvocationId?: string
  billingContext?: BillingRuntimeContext
  provider?: string
  model?: string
}

export function reportExternalUsage(
  options: ExternalUsageOptions,
  providerUrl: string,
  usage?: Record<string, unknown>,
  environment?: NodeJS.ProcessEnv,
  fetcher?: typeof fetch,
): Promise<boolean>
