export interface CaptainSharedMemoryConfig {
    readonly harnessBaseUrl?: string;
    readonly identityHmacSecret?: string;
    readonly tenantId?: string;
    readonly userId?: string;
    readonly agentId?: string;
    readonly sessionId: string;
    readonly signal?: AbortSignal;
}
export interface CaptainSharedMemoryContext {
    readonly mode: 'full' | 'summary';
    readonly text: string;
    readonly memoryIds: readonly string[];
}
/** Read tenant-private CEO context. Failure is advisory and never blocks a DSH turn. */
export declare function fetchCaptainSharedMemory(config: CaptainSharedMemoryConfig, fetcher?: typeof fetch): Promise<CaptainSharedMemoryContext | undefined>;
