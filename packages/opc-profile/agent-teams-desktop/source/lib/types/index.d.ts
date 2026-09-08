/**
 * AgentTeams for DeepSeek Harness.
 *
 * A host-plane plugin that registers the `agent_teams_*` tools and one usage
 * section into the global system prompt. After installation any session can
 * run multi-agent teamwork through natural language (e.g. "use AgentTeams to research X"):
 * the model creates a team (it becomes the captain), spawns members as
 * durable continuable subagents, breaks the goal into tasks with
 * dependencies, wakes members with messages, relays reports, and collects
 * results.
 *
 * Installation (bundle): `dsh plugin --profile <name> add @nanmicoder/dsh-agent-teams`
 * (or a local path). The bundle patch mounts this plugin row into the host
 * composition; the tools register into the shared `tools` registry and the
 * usage section into the global system prompt, so the plugin needs no realm.
 *
 * @module dsh-agent-teams
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export declare const name = "agent-teams";
export declare const inject: string[];
/** Plugin configuration. */
export interface Config {
    /**
     * State directory name under the captain's workspace; team state lives at
     * `<workspace>/<stateDir>/<teamId>/` (default `.agent-teams`).
     */
    stateDir?: string;
    /** Workspace-relative directory containing optional versioned agent persona files. */
    soulDirectory?: string;
    /** Persona id loaded into every top-level DSH conversation. */
    ceoSoulId?: string;
    /** `ctx.subagents` provider used to spawn members; must support continuable children and personas (default `spawn`). */
    memberProvider?: string;
    /** Optional model override applied to every member. */
    memberModel?: string;
    /** Member delegation depth cap (default `1`; `0` forbids delegation entirely). */
    memberMaxDepth?: number;
    /** Team size cap in members (default `8`). */
    maxMembers?: number;
    /** Maximum durable chat records per team, including one reserved captain-summary slot. */
    maxTeamMessages?: number;
    /** Maximum consecutive messages from one non-captain member. */
    maxConsecutiveMemberMessages?: number;
    /** Prompt-section order for the usage policy (default `117`, after delegation policy). */
    promptSectionOrder?: number;
    /** Optional global cap for concurrent model streams while this profile is running. */
    maxConcurrentLlmRequests?: number;
    /** Minimum delay between starts for the configured provider (milliseconds). */
    minLlmRequestIntervalMs?: number;
    /** Cooldown after a provider returns a RATE_LIMIT finish (milliseconds). */
    llmRateLimitCooldownMs?: number;
    /**
     * Register the deterministic `/agent-teams` activation surfaces (the
     * closed-namespace slash command and the plain-text gesture boundary).
     * Disable to keep the natural-language trigger as the only entry point.
     */
    slashCommand?: boolean;
    /**
     * Enable an optional, profile-owned control-plane extension. Agent Teams
     * itself remains fully usable when this is false (the default).
     */
    controlPlaneEnabled?: boolean;
    /** Origin of a trusted control-plane API, used only when the extension is enabled. */
    controlPlaneApiBaseUrl?: string;
    /** Origin of an optional Agent Registry service, used only when enabled. */
    controlPlaneRegistryBaseUrl?: string;
    /** Timeout for one extension gateway request. */
    controlPlaneGatewayTimeoutMs?: number;
    /** Server-only identity signing secret for the trusted control plane. */
    controlPlaneIdentityHmacSecret?: string;
    /** Profile-owned principal for the trusted control plane. */
    controlPlaneTenantId?: string;
    controlPlaneUserId?: string;
    controlPlaneAgentId?: string;
}
export declare const Config: z<Config>;
export declare function apply(ctx: Context, config: Config): void;
