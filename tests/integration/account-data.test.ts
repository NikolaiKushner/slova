import { afterEach, beforeEach, expect, test } from "vitest";

import {
  accountRateLimitKeys,
  deleteAccountData,
  exportAccountData,
  planAccountDeletion,
} from "@/lib/account-data";
import { getPrisma } from "@/lib/prisma";

const prisma = getPrisma();
const USER_ID = "integration-account-data-user";
const EMAIL = "account-data@example.test";
const LEXEME_KEY = "__account_data_shared__";

async function cleanup() {
  await prisma.verificationToken.deleteMany({
    where: { identifier: { in: [`verify:${EMAIL}`, `reset:${EMAIL}`] } },
  });
  await prisma.lexemeTranslationConfirmation.deleteMany({ where: { userId: USER_ID } });
  await prisma.llmUsage.deleteMany({ where: { userId: USER_ID } });
  await prisma.ttsUsage.deleteMany({ where: { userId: USER_ID } });
  await prisma.rateLimit.deleteMany({
    where: { key: { in: accountRateLimitKeys(USER_ID, EMAIL) } },
  });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.lexeme.deleteMany({ where: { lang: "en", key: LEXEME_KEY } });
}

beforeEach(cleanup);
afterEach(cleanup);

test("exports personal data and verifiably deletes it while retaining shared text", async () => {
  const now = new Date("2026-08-18T09:00:00.000Z");
  await prisma.user.create({
    data: {
      id: USER_ID,
      email: EMAIL,
      passwordHash: "secret-password-hash",
      accounts: {
        create: {
          type: "oauth",
          provider: "google",
          providerAccountId: "account-data-provider",
          access_token: "secret-access-token",
          refresh_token: "secret-refresh-token",
        },
      },
      words: {
        create: {
          id: "account-data-word",
          key: "hello",
          front: "hello",
          back: "привет",
        },
      },
      sets: {
        create: { id: "account-data-set", title: "Exported set" },
      },
      courses: {
        create: {
          courseSlug: "account-data-course",
          lessons: {
            create: {
              lessonSlug: "lesson-1",
              status: "completed",
              attempts: 1,
              attemptLogs: {
                create: {
                  operationId: "account-data-lesson-operation",
                  score: 90,
                },
              },
            },
          },
        },
      },
      texts: {
        create: {
          id: "account-data-text",
          title: "A page I pasted",
          body: "A page I pasted\nIt was mine.",
          wordCount: 8,
          charCount: 28,
          glosses: { "0:1": "страница" },
        },
      },
      sittings: {
        create: {
          id: "account-data-sitting",
          kind: "study",
          label: "all",
          sourceState: "all",
          startedAt: now,
          lastAt: now,
        },
      },
    },
  });
  await prisma.wordSetItem.create({
    data: { wordId: "account-data-word", setId: "account-data-set" },
  });
  await prisma.reviewLog.create({
    data: {
      id: "account-data-review",
      operationId: "account-data-review-operation",
      wordId: "account-data-word",
      userId: USER_ID,
      sittingId: "account-data-sitting",
      rating: "good",
    },
  });
  await prisma.verificationToken.create({
    data: { identifier: `reset:${EMAIL}`, token: "secret-token-hash", expires: now },
  });
  await prisma.llmUsage.create({ data: { userId: USER_ID, day: "2026-08-18" } });
  await prisma.ttsUsage.create({ data: { userId: USER_ID, day: "2026-08-18" } });
  await prisma.rateLimit.createMany({
    data: accountRateLimitKeys(USER_ID, EMAIL).map((key) => ({
      key,
      count: 1,
      windowStart: now,
      expiresAt: new Date(now.getTime() + 60_000),
    })),
  });
  const lexeme = await prisma.lexeme.create({
    data: {
      lang: "en",
      key: LEXEME_KEY,
      text: "shared",
      source: "llm",
      translations: {
        create: {
          targetLang: "ru",
          text: "общий",
          source: "llm",
          confirmations: 1,
          isGlobal: true,
        },
      },
    },
    include: { translations: true },
  });
  await prisma.lexemeTranslationConfirmation.create({
    data: { translationId: lexeme.translations[0]!.id, userId: USER_ID },
  });

  const exported = await exportAccountData(prisma, EMAIL.toUpperCase());
  expect(exported.account).not.toHaveProperty("passwordHash");
  expect(exported.authentication.providers[0]).not.toHaveProperty("access_token");
  expect(exported.authentication.pendingTokens[0]).not.toHaveProperty("token");
  expect(exported.dictionary.words).toHaveLength(1);
  expect(exported.progress.reviewLogs).toHaveLength(1);
  expect(exported.reading.texts).toHaveLength(1);
  expect(exported.reading.texts[0]).toMatchObject({
    title: "A page I pasted",
    body: "A page I pasted\nIt was mine.",
    glosses: { "0:1": "страница" },
  });
  expect(exported.dictionary.sharedTranslationConfirmations).toHaveLength(1);

  const plan = await planAccountDeletion(prisma, EMAIL);
  expect(plan.rows).toMatchObject({
    accounts: 1,
    words: 1,
    sets: 1,
    reviewLogs: 1,
    texts: 1,
    verificationTokens: 1,
    sharedTranslationLinks: 1,
    llmUsage: 1,
    ttsUsage: 1,
    rateLimits: 5,
  });

  await expect(deleteAccountData(prisma, EMAIL, "wrong@example.test")).rejects.toThrow(
    "exactly match",
  );
  await expect(prisma.user.count({ where: { id: USER_ID } })).resolves.toBe(1);

  const deleted = await deleteAccountData(prisma, EMAIL, EMAIL);
  expect(Object.values(deleted.verification).every((count) => count === 0)).toBe(true);
  await expect(
    prisma.lexemeTranslation.findUnique({
      where: { id: lexeme.translations[0]!.id },
      select: { confirmations: true, isGlobal: true },
    }),
  ).resolves.toEqual({ confirmations: 1, isGlobal: true });
  await expect(
    prisma.lexemeTranslationConfirmation.count({ where: { userId: USER_ID } }),
  ).resolves.toBe(0);
});
