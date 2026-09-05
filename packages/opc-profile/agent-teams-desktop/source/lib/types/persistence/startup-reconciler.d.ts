/** Conservative startup repair for file-backed Team persistence. */
export interface TeamPersistenceReconciliationFailure {
    readonly teamId: string;
    readonly message: string;
}
export interface TeamPersistenceReconciliationReport {
    readonly scanned: number;
    readonly importedLegacy: readonly string[];
    readonly repairedJournals: readonly string[];
    readonly failures: readonly TeamPersistenceReconciliationFailure[];
}
/**
 * Restore only deterministic file projections. This never starts agents,
 * claims tasks, delivers messages, or replays provider/paid side effects.
 */
export declare function reconcileTeamPersistence(stateRoot: string): Promise<TeamPersistenceReconciliationReport>;
