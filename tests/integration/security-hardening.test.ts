import { afterEach, describe, expect, test } from "vitest";

import { authAdapter } from "@/lib/auth-adapter";
import {
  consumeTokenWithUserUpdate,
  hashToken,
  issueToken,
  tokenIdentifier,
} from "@/lib/auth-tokens";
import { getPrisma } from "@/lib/prisma";
import { allowFixedWindowAttempt } from "@/lib/rate-limit";
import { cleanupExpiredSecurityState } from "@/lib/security-cleanup";

const prisma = getPrisma();
const USER_ID = "__security_hardening_user__";
const EMAIL = "security-hardening@slova.test";
const RATE_PREFIX = "__security_hardening_rate__";

async function cleanFixtures() {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.verificationToken.deleteMany({
    where: { identifier: { contains: EMAIL } },
  });
  await prisma.rateLimit.deleteMany({
    where: { key: { startsWith: RATE_PREFIX } },
  });
}

afterEach(cleanFixtures);

describe("atomic security state", () => {
  test("parallel fixed-window attempts cannot exceed the cap", async () => {
    const key = `${RATE_PREFIX}parallel`;
    const now = Date.parse("2098-05-01T12:00:00.000Z");
    const accepted = await Promise.all(
      Array.from({ length: 10 }, () =>
        allowFixedWindowAttempt(key, 3, 1_000, now),
      ),
    );
    expect(accepted.filter(Boolean)).toHaveLength(3);
    expect(await prisma.rateLimit.findUniqueOrThrow({ where: { key } }))
      .toMatchObject({ count: 3 });

    expect(await allowFixedWindowAttempt(key, 3, 1_000, now + 1_000))
      .toBe(true);
    expect(await prisma.rateLimit.findUniqueOrThrow({ where: { key } }))
      .toMatchObject({ count: 1 });
  });

  test("concurrent token reissue leaves one valid link", async () => {
    const issued = await Promise.all(
      Array.from({ length: 5 }, () => issueToken("reset", EMAIL)),
    );
    const identifier = tokenIdentifier("reset", EMAIL);
    expect(
      await prisma.verificationToken.count({ where: { identifier } }),
    ).toBe(1);
    const stored = await prisma.verificationToken.findUniqueOrThrow({
      where: { identifier },
    });
    expect(issued.map(hashToken)).toContain(stored.token);
  });

  test("one-time token consumption and user update commit together", async () => {
    await prisma.user.create({
      data: { id: USER_ID, email: EMAIL, passwordHash: "old:hash" },
    });
    const token = await issueToken("reset", EMAIL);
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        consumeTokenWithUserUpdate("reset", EMAIL, token, {
          passwordHash: `new:hash:${index}`,
          emailVerified: new Date("2098-05-01T12:00:00.000Z"),
          sessionVersion: { increment: 1 },
        }),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: USER_ID } }))
      .toMatchObject({ sessionVersion: 1, emailVerified: expect.any(Date) });
    expect(
      await prisma.verificationToken.count({
        where: { identifier: tokenIdentifier("reset", EMAIL) },
      }),
    ).toBe(0);
  });
});

describe("Auth.js adapter account linking", () => {
  test("Google verification cannot unlock an unverified password", async () => {
    await prisma.user.create({
      data: { id: USER_ID, email: EMAIL, passwordHash: "attacker:hash" },
    });
    const verifiedAt = new Date("2098-05-01T12:00:00.000Z");
    await authAdapter.updateUser!({
      id: USER_ID,
      email: EMAIL,
      emailVerified: verifiedAt,
    });
    await authAdapter.linkAccount!({
      userId: USER_ID,
      type: "oauth",
      provider: "google",
      providerAccountId: "__security_google_account__",
    });

    expect(await prisma.user.findUniqueOrThrow({ where: { id: USER_ID } }))
      .toMatchObject({ emailVerified: verifiedAt, passwordHash: null });
    expect(
      await prisma.account.count({ where: { userId: USER_ID } }),
    ).toBe(1);
  });
});

describe("security cleanup", () => {
  test("deletes only expired limiter and token rows", async () => {
    const now = new Date("2098-05-01T12:00:00.000Z");
    const [existingRateLimits, existingVerificationTokens] = await Promise.all([
      prisma.rateLimit.count({ where: { expiresAt: { lte: now } } }),
      prisma.verificationToken.count({ where: { expires: { lte: now } } }),
    ]);
    await prisma.rateLimit.createMany({
      data: [
        {
          key: `${RATE_PREFIX}expired`,
          count: 1,
          windowStart: new Date(now.getTime() - 2_000),
          expiresAt: new Date(now.getTime() - 1_000),
        },
        {
          key: `${RATE_PREFIX}active`,
          count: 1,
          windowStart: now,
          expiresAt: new Date(now.getTime() + 1_000),
        },
      ],
    });
    await prisma.verificationToken.createMany({
      data: [
        {
          identifier: `expired:${EMAIL}`,
          token: "expired",
          expires: new Date(now.getTime() - 1_000),
        },
        {
          identifier: `active:${EMAIL}`,
          token: "active",
          expires: new Date(now.getTime() + 1_000),
        },
      ],
    });

    expect(await cleanupExpiredSecurityState(now, prisma)).toEqual({
      rateLimits: existingRateLimits + 1,
      verificationTokens: existingVerificationTokens + 1,
    });
    expect(
      await prisma.rateLimit.findMany({
        where: { key: { startsWith: RATE_PREFIX } },
        select: { key: true },
      }),
    ).toEqual([{ key: `${RATE_PREFIX}active` }]);
    expect(
      await prisma.verificationToken.findMany({
        where: { identifier: { contains: EMAIL } },
        select: { token: true },
      }),
    ).toEqual([{ token: "active" }]);
  });
});
