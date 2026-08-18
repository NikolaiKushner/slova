import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { normalizeEmail } from "@/lib/password";

export class AccountDataNotFoundError extends Error {}
export class AccountDeletionVerificationError extends Error {}

function tokenIdentifiers(email: string) {
  return [`verify:${email}`, `reset:${email}`];
}

/** Keys attributable to one account. IP and shared generation keys stay. */
export function accountRateLimitKeys(userId: string, email: string) {
  return [
    `login:email:${email}`,
    `reset:email:${email}`,
    `words:${userId}`,
    `translate:${userId}`,
    `audio:${userId}`,
  ];
}

async function findAccount(
  db: PrismaClient | Prisma.TransactionClient,
  emailRaw: string,
) {
  const email = normalizeEmail(emailRaw);
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      dailyNewLimit: true,
      createdAt: true,
    },
  });
  if (!user) throw new AccountDataNotFoundError(`Account not found: ${email}`);
  return user;
}

/** A consistent, portable record of personal data without authentication secrets. */
export async function exportAccountData(
  prisma: PrismaClient,
  emailRaw: string,
) {
  return prisma.$transaction(
    async (transaction) => {
      const account = await findAccount(transaction, emailRaw);
      const userId = account.id;
      const rateLimitKeys = accountRateLimitKeys(userId, account.email);

      const [
        providers,
        words,
        sets,
        reviewLogs,
        sittings,
        courses,
        lessons,
        lessonAttempts,
        llmUsage,
        ttsUsage,
        sharedTranslationConfirmations,
        pendingTokens,
        rateLimits,
      ] = await Promise.all([
        transaction.account.findMany({
          where: { userId },
          select: {
            type: true,
            provider: true,
            providerAccountId: true,
            expires_at: true,
            token_type: true,
            scope: true,
          },
        }),
        transaction.userWord.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: { sets: { select: { setId: true, addedAt: true } } },
        }),
        transaction.wordSet.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          include: {
            items: {
              orderBy: { addedAt: "asc" },
              select: { wordId: true, addedAt: true },
            },
          },
        }),
        transaction.reviewLog.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
        }),
        transaction.studySitting.findMany({
          where: { userId },
          orderBy: { startedAt: "asc" },
        }),
        transaction.userCourse.findMany({
          where: { userId },
          orderBy: { startedAt: "asc" },
        }),
        transaction.userLesson.findMany({
          where: { userId },
          orderBy: [{ courseSlug: "asc" }, { lessonSlug: "asc" }],
        }),
        transaction.lessonAttempt.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
        }),
        transaction.llmUsage.findMany({
          where: { userId },
          orderBy: { day: "asc" },
        }),
        transaction.ttsUsage.findMany({
          where: { userId },
          orderBy: { day: "asc" },
        }),
        transaction.lexemeTranslationConfirmation.findMany({
          where: { userId },
          orderBy: { createdAt: "asc" },
          select: {
            createdAt: true,
            translation: {
              select: {
                targetLang: true,
                text: true,
                source: true,
                lexeme: { select: { lang: true, text: true } },
              },
            },
          },
        }),
        transaction.verificationToken.findMany({
          where: { identifier: { in: tokenIdentifiers(account.email) } },
          orderBy: { expires: "asc" },
          select: { identifier: true, expires: true },
        }),
        transaction.rateLimit.findMany({
          where: { key: { in: rateLimitKeys } },
          orderBy: { key: "asc" },
          select: {
            key: true,
            count: true,
            windowStart: true,
            expiresAt: true,
          },
        }),
      ]);

      return {
        format: "slova-account-export",
        version: 1,
        exportedAt: new Date().toISOString(),
        account,
        authentication: { providers, pendingTokens, rateLimits },
        dictionary: { words, sets, sharedTranslationConfirmations },
        progress: {
          reviewLogs,
          sittings,
          courses,
          lessons,
          lessonAttempts,
        },
        providerUsage: { llm: llmUsage, tts: ttsUsage },
      };
    },
    { isolationLevel: "RepeatableRead", maxWait: 10_000, timeout: 30_000 },
  );
}

async function deletionCounts(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
  email: string,
) {
  const rateLimitKeys = accountRateLimitKeys(userId, email);
  const counts = await Promise.all([
    db.account.count({ where: { userId } }),
    db.userWord.count({ where: { userId } }),
    db.wordSet.count({ where: { userId } }),
    db.wordSetItem.count({
      where: { OR: [{ word: { userId } }, { set: { userId } }] },
    }),
    db.reviewLog.count({ where: { userId } }),
    db.studySitting.count({ where: { userId } }),
    db.userCourse.count({ where: { userId } }),
    db.userLesson.count({ where: { userId } }),
    db.lessonAttempt.count({ where: { userId } }),
    db.verificationToken.count({
      where: { identifier: { in: tokenIdentifiers(email) } },
    }),
    db.lexemeTranslationConfirmation.count({ where: { userId } }),
    db.llmUsage.count({ where: { userId } }),
    db.ttsUsage.count({ where: { userId } }),
    db.rateLimit.count({ where: { key: { in: rateLimitKeys } } }),
  ]);
  const names = [
    "accounts",
    "words",
    "sets",
    "setItems",
    "reviewLogs",
    "sittings",
    "courses",
    "lessons",
    "lessonAttempts",
    "verificationTokens",
    "sharedTranslationLinks",
    "llmUsage",
    "ttsUsage",
    "rateLimits",
  ] as const;
  return Object.fromEntries(names.map((name, index) => [name, counts[index]!])) as
    Record<(typeof names)[number], number>;
}

export async function planAccountDeletion(
  prisma: PrismaClient,
  emailRaw: string,
) {
  const account = await findAccount(prisma, emailRaw);
  return {
    account,
    rows: await deletionCounts(prisma, account.id, account.email),
    retained: {
      sharedTranslations: true,
      sharedTranslationAggregateCounts: true,
      ipAndSharedRateLimits: true,
    },
  };
}

export async function verifyAccountDeletion(
  prisma: PrismaClient,
  deleted: { userId: string; email: string },
) {
  const [account, rows] = await Promise.all([
    prisma.user.count({
      where: { OR: [{ id: deleted.userId }, { email: deleted.email }] },
    }),
    deletionCounts(prisma, deleted.userId, deleted.email),
  ]);
  const remaining = { account, ...rows };
  const failures = Object.entries(remaining).filter(([, count]) => count !== 0);
  if (failures.length > 0) {
    throw new AccountDeletionVerificationError(
      `Account deletion left rows behind: ${failures
        .map(([table, count]) => `${table}=${count}`)
        .join(", ")}`,
    );
  }
  return remaining;
}

/** Delete personal rows atomically, then prove that the committed state is empty. */
export async function deleteAccountData(
  prisma: PrismaClient,
  emailRaw: string,
  confirmationRaw: string,
) {
  const email = normalizeEmail(emailRaw);
  if (confirmationRaw !== email) {
    throw new Error("Deletion confirmation must exactly match the normalized email.");
  }

  const deleted = await prisma.$transaction(
    async (transaction) => {
      const account = await findAccount(transaction, email);
      const rateLimitKeys = accountRateLimitKeys(account.id, account.email);
      const [verificationTokens, sharedTranslationLinks, llmUsage, ttsUsage, rateLimits] =
        await Promise.all([
          transaction.verificationToken.deleteMany({
            where: { identifier: { in: tokenIdentifiers(account.email) } },
          }),
          transaction.lexemeTranslationConfirmation.deleteMany({
            where: { userId: account.id },
          }),
          transaction.llmUsage.deleteMany({ where: { userId: account.id } }),
          transaction.ttsUsage.deleteMany({ where: { userId: account.id } }),
          transaction.rateLimit.deleteMany({ where: { key: { in: rateLimitKeys } } }),
        ]);
      await transaction.user.delete({ where: { id: account.id } });
      return {
        userId: account.id,
        email: account.email,
        explicitlyDeleted: {
          verificationTokens: verificationTokens.count,
          sharedTranslationLinks: sharedTranslationLinks.count,
          llmUsage: llmUsage.count,
          ttsUsage: ttsUsage.count,
          rateLimits: rateLimits.count,
        },
      };
    },
    { isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 },
  );

  const verification = await verifyAccountDeletion(prisma, deleted);
  return { ...deleted, verification };
}
