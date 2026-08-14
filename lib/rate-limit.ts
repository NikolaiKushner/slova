/**
 * Best-effort limiter for serverless. Each instance has its own map, so this
 * slows a noisy client down rather than guaranteeing a global ceiling.
 */
export function createRateLimiter() {
  const windows = new Map<string, number[]>();

  return function allowAttempt(
    key: string,
    limit: number,
    windowMs: number,
    now = Date.now(),
  ): boolean {
    const hits = (windows.get(key) ?? []).filter((at) => now - at < windowMs);
    if (hits.length >= limit) {
      windows.set(key, hits);
      return false;
    }
    hits.push(now);
    windows.set(key, hits);
    return true;
  };
}

export const allowAttempt = createRateLimiter();
