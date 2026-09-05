/**
 * Shared avatar artwork lookup for the activity panel and the conversation
 * card. Each common department role has its own generated avatar so a team
 * stays recognizable at the small sizes used by the workbench.
 * @module dsh-agent-teams/client/artwork
 */
/** Artwork route prefix served by the plugin host half. */
export declare const ART_BASE = "/plugins/dsh-agent-teams/assets/";
/** Captain artwork (always the dedicated captain avatar). */
export declare const LEAD_ART = "/plugins/dsh-agent-teams/avatars/captain.png";
/** Status action artwork per member activity. */
export declare const ACTION_ART: Record<'working' | 'idle' | 'unknown', string>;
/**
 * Member artwork URL, or null when no role matches (initial-letter fallback).
 * @param name - the member's display name.
 * @param role - the member's role text.
 * @returns the artwork URL, or null when unmatched.
 */
export declare function memberArtUrl(name: string, role: string): string | null;
