import { Prisma } from "@/app/generated/prisma/client";

/**
 * Fixed-window limiter. The in-memory copy mirrors the durable PostgreSQL
 * rule for fast unit tests: the first accepted hit anchors the window, and a
 * hit at or after its expiry starts a fresh one.
 */
export function createFixedWindowRateLimiter() {
  const windows = new Map<string, { count: number; expiresAt: number }>();

  return function allowAttempt(
    key: string,
    limit: number,
    windowMs: number,
    now = Date.now(),
  ): boolean {
    const existing = windows.get(key);
    if (!existing || now >= existing.expiresAt) {
      windows.set(key, { count: 1, expiresAt: now + windowMs });
      return true;
    }
    if (existing.count >= limit) return false;
    existing.count += 1;
    return true;
  };
}

export async function allowFixedWindowAttempt(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<boolean> {
  if (!key || !Number.isInteger(limit) || limit < 1 || windowMs < 1) {
    throw new Error("Invalid fixed-window rate-limit configuration.");
  }
  const { getPrisma } = await import("@/lib/prisma");
  const prisma = getPrisma();
  const windowStart = new Date(now);
  const expiresAt = new Date(now + windowMs);

  // One statement is the decision and the mutation. Parallel serverless
  // invocations cannot all observe a spare slot and increment past the cap.
  const accepted = await prisma.$queryRaw<Array<{ key: string }>>(Prisma.sql`
    INSERT INTO "RateLimit" (
      "key", "count", "windowStart", "expiresAt"
    ) VALUES (
      ${key}, 1, ${windowStart}, ${expiresAt}
    )
    ON CONFLICT ("key") DO UPDATE
    SET "count" = CASE
          WHEN "RateLimit"."expiresAt" <= ${windowStart} THEN 1
          ELSE "RateLimit"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimit"."expiresAt" <= ${windowStart}
            THEN ${windowStart}
          ELSE "RateLimit"."windowStart"
        END,
        "expiresAt" = CASE
          WHEN "RateLimit"."expiresAt" <= ${windowStart}
            THEN ${expiresAt}
          ELSE "RateLimit"."expiresAt"
        END
    WHERE "RateLimit"."expiresAt" <= ${windowStart}
       OR "RateLimit"."count" < ${limit}
    RETURNING "key"
  `);
  return accepted.length === 1;
}
