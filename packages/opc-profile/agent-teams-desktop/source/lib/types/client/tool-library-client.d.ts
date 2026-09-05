import type { ToolLibraryClient, ToolProposal } from '../tool-library-contracts.ts';
/** Adapts the Harness policy response ({ approval: { id, status } }) for the UI contract. */
export declare function normalizeToolProposal(value: unknown): ToolProposal;
/** Build the session-scoped browser face for the Agent Teams host gateway. */
export declare function createToolLibraryClient(sessionId: string): ToolLibraryClient;
