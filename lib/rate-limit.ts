/**
 * Sliding-window limiter. The in-memory copy is for tests; production writes
 * through Postgres so serverless isolates share one ceiling.
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

export async function allowAttemptDurable(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  const { getPrisma } = await import("@/lib/prisma");
  const prisma = getPrisma();
  const windowStart = new Date(now);
  const expiredBefore = new Date(now - windowMs);

  await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 0, windowStart },
    update: {},
  });

  await prisma.rateLimit.updateMany({
    where: { key, windowStart: { lte: expiredBefore } },
    data: { count: 0, windowStart },
  });

  const result = await prisma.rateLimit.updateMany({
    where: { key, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  return result.count === 1;
}
