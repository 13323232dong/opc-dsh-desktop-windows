export interface SoulProfile {
    readonly markdown: string;
    readonly summary: string;
    readonly version: number;
    readonly source: string;
}
export interface CaptainMemoryBundle {
    readonly soul?: SoulProfile;
    readonly companyMemory: string;
    readonly userMemory: string;
    readonly recentPlans: string;
    readonly recentMemory: string;
}
/** A top-level conversation acts as captain; subagent children keep their own role. */
export declare function isTopLevelCaptainSession(parentSession: string | undefined): boolean;
/** Convert a checked-in SOUL into a safe, portable runtime persona. */
export declare function sanitizeSoul(markdown: string, source: string, version?: number): SoulProfile | undefined;
/** Resolve only a single workspace-local agent id; path traversal is rejected. */
export declare function loadWorkspaceSoul(workspace: string, soulDirectory: string, agentId: string): Promise<SoulProfile | undefined>;
/** Load the CEO's bounded, workspace-local identity and operational memory. */
export declare function loadCaptainMemoryBundle(workspace: string, soulDirectory: string, agentId?: string): Promise<CaptainMemoryBundle | undefined>;
/** Synchronous variant used during Agent scope creation before its first turn. */
export declare function loadCaptainMemoryBundleSync(workspace: string, soulDirectory: string, agentId?: string): CaptainMemoryBundle | undefined;
/** Compose the fixed policy hierarchy. SOUL is style guidance only. */
export declare function soulPromptSection(soul: SoulProfile | undefined): string;
/** Compose CEO identity and memory without allowing it to override policy. */
export declare function captainPromptSection(bundle: CaptainMemoryBundle | undefined, sharedMemory?: string): string;
