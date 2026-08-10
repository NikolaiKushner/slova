import { getPrisma } from "@/lib/prisma";

/** Unseen words a user may meet per day before the queue holds the rest back. */
export const DEFAULT_DAILY_NEW_LIMIT = 20;

/** Most due reviews handed out in one sitting, so a backlog stays finite. */
export const REVIEW_BATCH_LIMIT = 100;

/** Midnight of the server-local day; the new-word allowance resets here. */
export function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Unseen words still allowed today. Never negative, even if the limit drops. */
export function newAllowance(
  dailyNewLimit: number,
  introducedToday: number,
): number {
  return Math.max(0, dailyNewLimit - introducedToday);
}

/**
 * What a session would hold today: reviews that came back plus the unseen
 * words the daily allowance still permits.
 */
export function sessionTotal(
  dueReviews: number,
  unseen: number,
  allowance: number,
): number {
  return dueReviews + Math.min(unseen, allowance);
}

/** One-line state of a deck: size, what came back, what has never been seen. */
export function deckSummary(
  total: number,
  dueReviews: number,
  unseen: number,
): string {
  const parts = [`${total} word${total === 1 ? "" : "s"}`];
  if (dueReviews > 0) parts.push(`${dueReviews} due`);
  if (unseen > 0) parts.push(`${unseen} new`);
  if (total > 0 && dueReviews === 0 && unseen === 0) parts.push("all caught up");
  return parts.join(" · ");
}

const CARD_FIELDS = {
  id: true,
  front: true,
  back: true,
  note: true,
  example: true,
  deckId: true,
} as const;

/** How many unseen words this user may still be shown today. */
export async function getNewAllowance(userId: string, now: Date) {
  const [user, introducedToday] = await Promise.all([
    getPrisma().user.findUnique({
      where: { id: userId },
      select: { dailyNewLimit: true },
    }),
    getPrisma().card.count({
      where: {
        deck: { userId },
        introducedAt: { gte: startOfDay(now) },
      },
    }),
  ]);

  const limit = user?.dailyNewLimit ?? DEFAULT_DAILY_NEW_LIMIT;
  return newAllowance(limit, introducedToday);
}

/**
 * Cards for one sitting: due reviews first (they decay fastest), then as many
 * unseen words as today's allowance leaves. The allowance is counted across
 * every deck even when studying one, so a limit means a limit.
 */
export async function buildStudyQueue(
  userId: string,
  options: { deckId?: string; now?: Date } = {},
) {
  const now = options.now ?? new Date();
  const deck = { userId, ...(options.deckId ? { id: options.deckId } : {}) };

  const [allowance, reviews] = await Promise.all([
    getNewAllowance(userId, now),
    getPrisma().card.findMany({
      where: { deck, introducedAt: { not: null }, dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      take: REVIEW_BATCH_LIMIT,
      select: CARD_FIELDS,
    }),
  ]);

  const fresh =
    allowance > 0
      ? await getPrisma().card.findMany({
          where: { deck, introducedAt: null },
          orderBy: { createdAt: "asc" },
          take: allowance,
          select: CARD_FIELDS,
        })
      : [];

  return { cards: [...reviews, ...fresh], reviewCount: reviews.length };
}

/** Counts behind the Today headline: reviews back, unseen words, allowance. */
export async function getStudySummary(userId: string, now: Date) {
  const [allowance, dueReviews, unseen] = await Promise.all([
    getNewAllowance(userId, now),
    getPrisma().card.count({
      where: {
        deck: { userId },
        introducedAt: { not: null },
        dueAt: { lte: now },
      },
    }),
    getPrisma().card.count({
      where: { deck: { userId }, introducedAt: null },
    }),
  ]);

  return {
    dueReviews,
    unseen,
    allowance,
    total: sessionTotal(dueReviews, unseen, allowance),
  };
}
