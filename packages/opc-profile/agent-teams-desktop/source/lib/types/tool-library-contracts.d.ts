export type ToolEffect = 'read' | 'write' | 'paid' | 'destructive';
export type ToolHealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';
export interface JsonSchema {
    readonly type?: string | readonly string[];
    readonly title?: string;
    readonly description?: string;
    readonly default?: unknown;
    readonly enum?: readonly unknown[];
    readonly minimum?: number;
    readonly maximum?: number;
    readonly properties?: Readonly<Record<string, JsonSchema>>;
    readonly required?: readonly string[];
    readonly items?: JsonSchema;
    readonly [key: string]: unknown;
}
export interface ToolCostQuote {
    readonly currency: string;
    readonly estimated: number;
    readonly maximum: number;
    readonly unit?: string;
}
export interface ToolHealth {
    readonly status: ToolHealthStatus;
    readonly checkedAt?: string;
    readonly message?: string;
}
export interface ToolGroup {
    readonly id: string;
    readonly displayName: string;
    readonly description?: string;
    readonly order?: number;
    readonly iconKey?: string;
}
export type ToolProviderAuthType = 'api_key' | 'oauth_app' | 'account_connection' | 'composite';
export type ToolProviderConfigurationStatus = 'not_configured' | 'configured' | 'connection_required' | 'connected' | 'invalid' | 'unavailable';
/** Public schema only. Secret values are never included in a tool manifest or configuration response. */
export interface ToolProviderConfigurationField {
    readonly key: string;
    readonly label: string;
    readonly type: 'text' | 'secret';
    readonly required: boolean;
    readonly description?: string;
    readonly placeholder?: string;
}
export interface ToolProviderConfigurationMetadata {
    readonly providerId: string;
    readonly authType: ToolProviderAuthType;
    readonly required: boolean;
    readonly fields: readonly ToolProviderConfigurationField[];
    readonly docsUrl?: string;
    readonly status?: ToolProviderConfigurationStatus;
    readonly canTest?: boolean;
    readonly ownerRole?: 'tenant_owner' | 'tenant_owner_or_platform_admin';
}
export interface ToolProviderConfigurationFieldState {
    readonly configured: boolean;
    readonly mask?: string;
}
/** Identity-scoped provider state returned after secrets have been masked by the server. */
export interface ToolProviderConfiguration extends Omit<ToolProviderConfigurationMetadata, 'fields' | 'status'> {
    readonly status: ToolProviderConfigurationStatus;
    readonly fields: Readonly<Record<string, ToolProviderConfigurationFieldState>>;
    readonly tested?: boolean;
    readonly lastTestedAt?: string;
    readonly accountName?: string;
    readonly scopes?: readonly string[];
    readonly authorizationUrl?: string;
}
export interface ToolManifest {
    readonly id: string;
    readonly version: string;
    readonly displayName: string;
    readonly description: string;
    readonly capabilityTags: readonly string[];
    readonly category: string;
    readonly provider: string;
    readonly effect: ToolEffect;
    readonly inputSchema: JsonSchema;
    readonly outputSchema: JsonSchema;
    readonly costPolicy: ToolCostQuote;
    readonly executionMode: 'sync' | 'async';
    readonly health: ToolHealth;
    readonly enabled: boolean;
    readonly group?: ToolGroup;
    readonly configuration?: ToolProviderConfigurationMetadata;
}
export interface ToolPreflight {
    readonly toolId: string;
    readonly toolVersion: string;
    readonly normalizedInput: unknown;
    readonly quote: ToolCostQuote;
    readonly requiresApproval: boolean;
    readonly proposalId?: string;
    readonly approvalId?: string;
}
export interface ToolProposal {
    readonly proposalId: string;
    readonly approvalId: string;
    readonly status: 'pending' | 'approved' | 'rejected' | 'expired';
}
export interface ToolCallStatus {
    readonly id?: string;
    readonly toolCallId?: string;
    readonly status: string;
    readonly output?: unknown;
    readonly errorCode?: string;
}
export interface FeishuConnectionStatus {
    readonly connected: boolean;
    readonly status: 'connected' | 'reauthorization_required' | 'disconnected';
    readonly accountName?: string;
    readonly scopes?: readonly string[];
    readonly destination: {
        readonly displayName: string;
    } | null;
}
export interface DouyinAccountStatus {
    readonly loggedIn: boolean;
    readonly displayName?: string;
    readonly accountId?: string;
    readonly profileUrl?: string;
}
/** A browser-safe, identity-scoped file or account record exposed by a tool. */
export interface ToolLibraryResource {
    readonly id: string;
    readonly title: string;
    readonly description?: string;
    readonly kind: 'file' | 'account';
    readonly mimeType?: string;
    readonly sourceDurationSeconds?: number;
    readonly createdAt?: string;
    readonly downloadable: boolean;
}
export type ExperienceType = 'correction' | 'insight' | 'knowledge_gap' | 'best_practice' | 'integration_error' | 'feature_request';
export interface ToolExperience {
    readonly id: string;
    readonly scope: 'agent' | 'user' | 'enterprise';
    readonly type: ExperienceType;
    readonly content: string;
    readonly agentId?: string;
    readonly toolId?: string;
    readonly toolVersion?: string;
    readonly enabled: boolean;
    readonly occurrenceCount?: number;
    readonly usageCount?: number;
    readonly approved?: boolean;
    readonly sourceRunId?: string;
}
export interface AgentProfileVersion {
    readonly version: number;
    readonly persona: string;
    readonly soulMarkdown?: string | null;
    readonly soulSummary?: string | null;
    readonly soulSource?: string | null;
    readonly responsibilities: readonly string[];
    readonly preferredTools: readonly string[];
    readonly operatingRules: readonly string[];
    readonly avoidanceRules: readonly string[];
    readonly modelRoute?: string;
    readonly validationStatus: 'candidate' | 'validated' | 'published';
}
export interface AgentProfileUpdate {
    readonly name: string;
    readonly description: string;
    readonly role: string;
    readonly industry?: string | null;
    readonly tags: readonly string[];
    readonly persona: string;
    readonly soulMarkdown?: string | null;
    readonly soulSummary?: string | null;
    readonly responsibilities: readonly string[];
    readonly preferredTools: readonly string[];
    readonly operatingRules: readonly string[];
    readonly avoidanceRules: readonly string[];
    readonly modelRoute?: string | null;
}
export interface AgentProfile {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly role: string;
    readonly industry?: string | null;
    readonly tags: readonly string[];
    readonly status: 'active' | 'disabled';
    readonly currentVersion: number;
    readonly usageCount: number;
    readonly successRate: number;
    readonly lastUsedAt?: string | null;
    readonly version?: AgentProfileVersion;
}
export interface AgentMemoryEntry {
    readonly id: string;
    readonly agentId: string;
    readonly type: 'best_practice' | 'role_preference' | 'risk_avoidance' | 'task_log' | 'failure_reflection';
    readonly content: string;
    readonly status: 'active' | 'disabled' | 'diagnostic';
    readonly sourceTaskId?: string | null;
    readonly sourceRunId?: string | null;
    readonly sourceArtifactIds: readonly string[];
    readonly occurrenceCount: number;
    readonly usageCount: number;
    readonly lastUsedAt?: string | null;
    readonly createdAt: string;
}
export interface SharedMemoryEntry {
    readonly id: string;
    readonly track: 'user_identity' | 'company' | 'industry' | 'recent_plan' | 'activity_log';
    readonly status: 'suggested' | 'active' | 'archived' | 'rejected';
    readonly content: string;
    readonly summary: string;
    readonly occurrenceCount: number;
    readonly importance: number;
    readonly version: number;
    readonly sourceRunId?: string | null;
    readonly createdAt?: string;
    readonly updatedAt?: string;
}
export interface SharedSkillCandidate {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly instructions?: string;
    readonly status: 'pending' | 'approved' | 'rejected';
    readonly occurrenceCount: number;
    readonly version: number;
    readonly sourceRunId?: string | null;
    readonly createdAt?: string;
    readonly updatedAt?: string;
}
/** Same-origin adapter. Browser callers never supply tenant, user, or agent identity. */
export interface ToolLibraryClient {
    listTools(signal?: AbortSignal): Promise<readonly ToolManifest[]>;
    getTool(toolId: string, version?: string, signal?: AbortSignal): Promise<ToolManifest>;
    getHealth(toolId: string, version?: string, signal?: AbortSignal): Promise<ToolHealth & {
        readonly toolId: string;
        readonly toolVersion: string;
    }>;
    preflight(toolId: string, version: string, input: unknown): Promise<ToolPreflight>;
    getTrialContext?(): Promise<{
        readonly conversationId: string;
        readonly runId: string;
    }>;
    createProposal?(toolId: string, version: string, input: unknown): Promise<ToolProposal>;
    decideApproval?(approvalId: string, decision: 'approved' | 'rejected'): Promise<ToolProposal>;
    trial(toolId: string, request: {
        readonly version: string;
        readonly input: unknown;
        readonly approvalId?: string;
        readonly conversationId: string;
        readonly runId: string;
    }): Promise<unknown>;
    getCallStatus(toolCallId: string): Promise<ToolCallStatus>;
    listResources(toolId: string): Promise<readonly ToolLibraryResource[]>;
    resourceDownloadUrl(toolId: string, resourceId: string): string;
    listExperiences(toolId?: string, signal?: AbortSignal): Promise<readonly ToolExperience[]>;
    updateExperience(id: string, changes: {
        readonly content: string;
    }): Promise<unknown>;
    disableExperience(id: string): Promise<unknown>;
    deleteExperience(id: string): Promise<unknown>;
    listAgentProfiles(status?: 'active' | 'disabled', signal?: AbortSignal): Promise<readonly AgentProfile[]>;
    getAgentProfile(id: string, signal?: AbortSignal): Promise<AgentProfile>;
    updateAgentProfile(id: string, update: AgentProfileUpdate): Promise<AgentProfile>;
    disableAgentProfile(id: string): Promise<unknown>;
    listAgentMemories(agentId: string): Promise<readonly AgentMemoryEntry[]>;
    disableAgentMemory(agentId: string, memoryId: string): Promise<unknown>;
    listSharedMemories(status?: SharedMemoryEntry['status']): Promise<readonly SharedMemoryEntry[]>;
    decideSharedMemory(id: string, decision: 'accepted' | 'archived' | 'rejected', expectedVersion: number): Promise<SharedMemoryEntry>;
    listSkillCandidates(status?: SharedSkillCandidate['status']): Promise<readonly SharedSkillCandidate[]>;
    decideSkillCandidate(id: string, decision: 'approved' | 'rejected', expectedVersion: number): Promise<SharedSkillCandidate>;
    getProviderConfiguration(providerId: string): Promise<ToolProviderConfiguration>;
    saveProviderConfiguration(providerId: string, values: Readonly<Record<string, string>>): Promise<ToolProviderConfiguration>;
    deleteProviderConfiguration(providerId: string): Promise<unknown>;
    testProviderConfiguration(providerId: string): Promise<ToolProviderConfiguration>;
    startProviderOAuth(providerId: string): Promise<{
        readonly authorizationUrl: string;
    }>;
    getFeishuConnection?(): Promise<FeishuConnectionStatus>;
    startFeishuOAuth?(): Promise<{
        readonly authorizationUrl: string;
    }>;
    setFeishuDestination?(folderUrl: string): Promise<{
        readonly displayName: string;
    }>;
    disconnectFeishu?(): Promise<unknown>;
    getDouyinAccount?(): Promise<DouyinAccountStatus>;
    openEgoLite?(): Promise<{
        readonly opened: boolean;
    }>;
}
