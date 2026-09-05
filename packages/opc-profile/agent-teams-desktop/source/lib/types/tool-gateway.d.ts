import type { IncomingMessage, ServerResponse } from 'node:http';
export declare const TOOL_GATEWAY_PATH = "/plugins/dsh-agent-teams/tools";
export interface ToolGatewayConfig {
    readonly opcApiBaseUrl?: string;
    readonly harnessBaseUrl?: string;
    readonly gatewayTimeoutMs?: number;
    /** Harness uses a distinct server-side identity key from the OPC API. */
    readonly harnessIdentityHmacSecret?: string;
    readonly identityHmacSecret?: string;
    readonly tenantId?: string;
    readonly userId?: string;
    readonly agentId?: string;
    readonly loginSessionId?: string;
}
export interface AgentTeamsPrincipal {
    readonly tenantId: string;
    readonly userId: string;
    readonly agentId: string;
    readonly loginSessionId?: string;
}
export interface AgentTeamsIdentityService {
    /** Resolve a DSH session against the authenticated browser request. */
    resolve(sessionId: string, request?: IncomingMessage, parentSessionId?: string): Promise<AgentTeamsPrincipal | undefined>;
}
/** Proxy the fixed Agent Gateway surface while keeping identity server-owned. */
export declare function handleToolGatewayRequest(req: IncomingMessage, res: ServerResponse, config: ToolGatewayConfig, fetcher?: typeof fetch, identityService?: AgentTeamsIdentityService): Promise<void>;
