/**
 * A small FIFO admission gate for model streams. It lives in the host plugin
 * so every AgentTeams member shares one provider-safe concurrency budget.
 */
function abortedError() {
    return new DOMException('The model request was aborted while waiting for a concurrency slot', 'AbortError');
}
/** Create a FIFO gate that admits no more than {@link limit} operations. */
export function createLlmConcurrencyGate(limit) {
    if (!Number.isSafeInteger(limit) || limit < 1) {
        throw new Error('LLM concurrency limit must be a positive integer');
    }
    let active = 0;
    const waiting = [];
    const admitNext = () => {
        while (active < limit && waiting.length > 0) {
            const waiter = waiting.shift();
            if (waiter === undefined)
                return;
            if (waiter.signal?.aborted) {
                waiter.cleanup?.();
                waiter.reject(abortedError());
                continue;
            }
            waiter.cleanup?.();
            active += 1;
            waiter.resolve();
        }
    };
    const acquire = async (signal) => {
        if (signal?.aborted)
            throw abortedError();
        if (active < limit) {
            active += 1;
            return;
        }
        await new Promise((resolve, reject) => {
            const onAbort = () => {
                const index = waiting.indexOf(waiter);
                if (index >= 0)
                    waiting.splice(index, 1);
                reject(abortedError());
            };
            const waiter = {
                resolve,
                reject,
                signal,
                cleanup: () => signal?.removeEventListener('abort', onAbort),
            };
            signal?.addEventListener('abort', onAbort, { once: true });
            waiting.push(waiter);
        });
    };
    const release = () => {
        active -= 1;
        admitNext();
    };
    return {
        async run(operation, signal) {
            await acquire(signal);
            try {
                return await operation();
            }
            finally {
                release();
            }
        },
        async *stream(operation, signal) {
            await acquire(signal);
            try {
                yield* operation();
            }
            finally {
                release();
            }
        },
    };
}
function isRateLimitFinish(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const chunk = value;
    if (chunk.type !== 'finish' || chunk.reason?.kind !== 'error')
        return false;
    const code = typeof chunk.reason.failure?.code === 'string' ? chunk.reason.failure.code.toUpperCase() : '';
    const message = typeof chunk.reason.failure?.message === 'string' ? chunk.reason.failure.message : '';
    // Harness adapters do not normalize every provider error. Kimi currently
    // reports overload as engine_overloaded_error in a terminal error chunk.
    return code === 'RATE_LIMIT'
        || code === 'ENGINE_OVERLOADED_ERROR'
        || /(?:^|\D)429(?:\D|$)|engine is currently overloaded/iu.test(message);
}
function isRateLimitError(error) {
    if (typeof error !== 'object' || error === null)
        return false;
    const value = error;
    const status = value.status ?? value.statusCode;
    const code = typeof value.code === 'string' ? value.code.toUpperCase() : '';
    const message = typeof value.message === 'string' ? value.message : '';
    return status === 429
        || code === 'RATE_LIMIT'
        || code === 'ENGINE_OVERLOADED_ERROR'
        || /(?:^|\D)429(?:\D|$)|engine is currently overloaded/iu.test(message);
}
function defaultSleep(milliseconds, signal) {
    if (milliseconds <= 0)
        return Promise.resolve();
    if (signal?.aborted)
        return Promise.reject(abortedError());
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, milliseconds);
        const onAbort = () => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
            reject(abortedError());
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
/**
 * Provider-aware gate for accounts that have both concurrency and RPM limits.
 * The cooldown is updated from the terminal RATE_LIMIT chunk, so a failed
 * request cannot immediately trigger another provider request.
 */
export function createLlmRateLimitGate(options) {
    const { maxConcurrent, minIntervalMs, rateLimitCooldownMs } = options;
    if (!Number.isFinite(minIntervalMs) || minIntervalMs < 0) {
        throw new Error('LLM minimum interval must be a non-negative finite number');
    }
    if (!Number.isFinite(rateLimitCooldownMs) || rateLimitCooldownMs < 0) {
        throw new Error('LLM rate-limit cooldown must be a non-negative finite number');
    }
    const concurrency = createLlmConcurrencyGate(maxConcurrent);
    const now = options.now ?? Date.now;
    const sleep = options.sleep ?? defaultSleep;
    let lastStartAt;
    let cooldownUntil = 0;
    const waitForStart = async (signal) => {
        const current = now();
        const nextAllowedAt = Math.max(cooldownUntil, lastStartAt === undefined ? current : lastStartAt + minIntervalMs);
        await sleep(Math.max(0, nextAllowedAt - current), signal);
        lastStartAt = now();
    };
    return {
        run: concurrency.run,
        stream(operation, signal) {
            return concurrency.stream(async function* () {
                await waitForStart(signal);
                try {
                    for await (const chunk of operation()) {
                        if (isRateLimitFinish(chunk))
                            cooldownUntil = Math.max(cooldownUntil, now() + rateLimitCooldownMs);
                        yield chunk;
                    }
                }
                catch (error) {
                    if (!isRateLimitError(error))
                        throw error;
                    cooldownUntil = Math.max(cooldownUntil, now() + rateLimitCooldownMs);
                    throw new Error('模型服务当前繁忙，已自动冷却，请稍后重试');
                }
            }, signal);
        },
    };
}
