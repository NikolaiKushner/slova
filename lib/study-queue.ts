import { getPrisma } from "@/lib/prisma";
import { dateFromDayKey } from "@/lib/calendar-date";
import {
  calendarDay,
  DEFAULT_TIMEZONE,
  readTimeZone,
} from "@/lib/timezone";

/** Unseen words a user may meet per day before the queue holds the rest back. */
export const DEFAULT_DAILY_NEW_LIMIT = 20;

/** Most due reviews handed out in one sitting, so a backlog stays finite. */
export const REVIEW_BATCH_LIMIT = 100;

/** Midnight of the learner's calendar day, represented as an absolute instant. */
export function startOfDay(
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  const zone = readTimeZone(timeZone);
  return new Date(dateFromDayKey(calendarDay(now, zone), zone, 0).getTime());
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

export type SetSummaryCopy = {
  words: (count: number) => string;
  due: (count: number) => string;
  unseen: (count: number) => string;
  caughtUp: string;
};

export const EN_SET_SUMMARY: SetSummaryCopy = {
  words: (count) => `${count} word${count === 1 ? "" : "s"}`,
  due: (count) => `${count} due`,
  unseen: (count) => `${count} new`,
  caughtUp: "all caught up",
};

/** One-line state of a set: size, what came back, what has never been seen. */
export function setSummary(
  total: number,
  dueReviews: number,
  unseen: number,
  copy: SetSummaryCopy = EN_SET_SUMMARY,
): string {
  const parts = [copy.words(total)];
  if (dueReviews > 0) parts.push(copy.due(dueReviews));
  if (unseen > 0) parts.push(copy.unseen(unseen));
  if (total > 0 && dueReviews === 0 && unseen === 0) parts.push(copy.caughtUp);
  return parts.join(" · ");
}

const WORD_FIELDS = {
  id: true,
  front: true,
  back: true,
  note: true,
  example: true,
} as const;

/**
 * Words belonging to this user, optionally narrowed to one set. Membership is
 * a join now, so "the words in this set" is a filter rather than ownership.
 */
function scopeOf(userId: string, setId?: string) {
  return setId
    ? { userId, sets: { some: { setId } } }
    : { userId };
}

/** How many unseen words this user may still be shown today. */
export async function getNewAllowance(
  userId: string,
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const [user, introducedToday] = await Promise.all([
    getPrisma().user.findUnique({
      where: { id: userId },
      select: { dailyNewLimit: true },
    }),
    getPrisma().userWord.count({
      where: { userId, introducedAt: { gte: startOfDay(now, timeZone) } },
    }),
  ]);

  const limit = user?.dailyNewLimit ?? DEFAULT_DAILY_NEW_LIMIT;
  return newAllowance(limit, introducedToday);
}

/**
 * Words for one sitting: due reviews first (they decay fastest), then as many
 * unseen words as today's allowance leaves. The allowance is counted across
 * every set even when studying one, so a limit means a limit.
 */
export async function buildStudyQueue(
  userId: string,
  options: { setId?: string; now?: Date; timeZone?: string } = {},
) {
  const now = options.now ?? new Date();
  const scope = scopeOf(userId, options.setId);

  const [allowance, reviews] = await Promise.all([
    getNewAllowance(userId, now, options.timeZone),
    getPrisma().userWord.findMany({
      where: { ...scope, introducedAt: { not: null }, dueAt: { lte: now } },
      orderBy: { dueAt: "asc" },
      take: REVIEW_BATCH_LIMIT,
      select: WORD_FIELDS,
    }),
  ]);

  const fresh =
    allowance > 0
      ? await getPrisma().userWord.findMany({
          where: { ...scope, introducedAt: null },
          orderBy: { createdAt: "asc" },
          take: allowance,
          select: WORD_FIELDS,
        })
      : [];

  return { words: [...reviews, ...fresh], reviewCount: reviews.length };
}

/** Counts behind the Today headline: reviews back, unseen words, allowance. */
export async function getStudySummary(
  userId: string,
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const [allowance, dueReviews, unseen] = await Promise.all([
    getNewAllowance(userId, now, timeZone),
    getPrisma().userWord.count({
      where: { userId, introducedAt: { not: null }, dueAt: { lte: now } },
    }),
    getPrisma().userWord.count({ where: { userId, introducedAt: null } }),
  ]);

  return {
    dueReviews,
    unseen,
    allowance,
    total: sessionTotal(dueReviews, unseen, allowance),
  };
}
