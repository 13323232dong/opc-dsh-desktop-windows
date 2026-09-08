/** Durable two-phase mailbox delivery built on an append-only journal. */
import type { TeamMessage } from '../types.ts';
export type MailboxStatus = 'queued' | 'claimed' | 'delivered';
export interface MailboxRecord {
    readonly message: TeamMessage;
    readonly status: MailboxStatus;
    readonly claimedAt?: number;
    readonly deliveredAt?: number;
}
export interface MailboxServiceOptions {
    readonly leaseMs?: number;
    /** Test-only failure hook after the journal is synced and before projection. */
    readonly beforeProjection?: () => Promise<void>;
    /** Compatibility diagnostic for malformed pre-journal inbox records. */
    readonly onMalformedLegacyLine?: (lineNumber: number, error: unknown) => void;
}
export declare class MailboxService {
    #private;
    private readonly stateRoot;
    private readonly options;
    constructor(stateRoot: string, options?: MailboxServiceOptions);
    queue(teamId: string, agentKey: string, message: TeamMessage): Promise<MailboxRecord>;
    pending(teamId: string, agentKey: string, options?: {
        readonly now?: number;
    }): Promise<MailboxRecord[]>;
    /** Return the complete durable mailbox in delivery order for legacy readers. */
    all(teamId: string, agentKey: string): Promise<MailboxRecord[]>;
    claim(teamId: string, agentKey: string, messageIds: readonly string[], options?: {
        readonly now?: number;
    }): Promise<MailboxRecord[]>;
    markDelivered(teamId: string, agentKey: string, messageIds: readonly string[], options?: {
        readonly now?: number;
    }): Promise<MailboxRecord[]>;
    release(teamId: string, agentKey: string, messageIds: readonly string[], options?: {
        readonly now?: number;
    }): Promise<MailboxRecord[]>;
    recover(teamId: string, agentKey: string, options?: {
        readonly now?: number;
    }): Promise<MailboxRecord[]>;
    /**
     * Convert only the requested legacy inbox projection into durable events.
     * A Team uses one globally sequenced journal, so each recipient is imported
     * lazily; message ids make this repeat-safe after a crash between events.
     */
    private load;
    private event;
    private appendEvent;
    private project;
    private withLock;
}
