export interface TeamMemberProfilePrincipal {
    readonly tenantId: string;
    readonly userId: string;
    readonly agentId: string;
}
export interface EnsureMemberProfileConfig {
    readonly harnessBaseUrl?: string;
    readonly identityHmacSecret?: string;
    readonly timeoutMs?: number;
}
export interface EnsureMemberProfileInput {
    readonly sessionId: string;
    readonly teamId: string;
    readonly name: string;
    readonly role?: string;
    readonly soulMarkdown?: string;
    readonly soulSummary?: string;
    readonly preferredTools: readonly string[];
    readonly principal: TeamMemberProfilePrincipal;
}
export interface EnsuredMemberProfile {
    readonly id: string;
    readonly currentVersion: number;
}
export interface MemberProfileSnapshot {
    readonly currentVersion: number;
    readonly modelRoute?: string;
    readonly soulMarkdown?: string;
    readonly soulSummary?: string;
    readonly persona: string;
}
/** Registers a reusable tenant role before its continuable team session starts. */
export declare function ensureMemberProfile(config: EnsureMemberProfileConfig, input: EnsureMemberProfileInput, fetcher?: typeof fetch): Promise<EnsuredMemberProfile>;
/** Reads the published profile used to freeze a new member's model and SOUL. */
export declare function fetchMemberProfile(config: EnsureMemberProfileConfig, input: {
    readonly sessionId: string;
    readonly profileId: string;
    readonly principal: TeamMemberProfilePrincipal;
}, fetcher?: typeof fetch): Promise<MemberProfileSnapshot>;
