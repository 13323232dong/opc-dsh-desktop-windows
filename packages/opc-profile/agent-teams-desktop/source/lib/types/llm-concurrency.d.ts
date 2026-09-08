/**
 * A small FIFO admission gate for model streams. It lives in the host plugin
 * so every AgentTeams member shares one provider-safe concurrency budget.
 */
export interface LlmConcurrencyGate {
    run<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    stream<T>(operation: () => AsyncIterable<T>, signal?: AbortSignal): AsyncIterable<T>;
}
export interface LlmRateLimitGateOptions {
    readonly maxConcurrent: number;
    readonly minIntervalMs: number;
    readonly rateLimitCooldownMs: number;
    readonly now?: () => number;
    readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
}
/** Create a FIFO gate that admits no more than {@link limit} operations. */
export declare function createLlmConcurrencyGate(limit: number): LlmConcurrencyGate;
/**
 * Provider-aware gate for accounts that have both concurrency and RPM limits.
 * The cooldown is updated from the terminal RATE_LIMIT chunk, so a failed
 * request cannot immediately trigger another provider request.
 */
export declare function createLlmRateLimitGate(options: LlmRateLimitGateOptions): LlmConcurrencyGate;
