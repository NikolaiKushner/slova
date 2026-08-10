import { getPrisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/study-queue";

/** How far back the streak is allowed to reach. */
export const STREAK_WINDOW_DAYS = 365;

/** Local calendar day of a timestamp, as a sortable YYYY-MM-DD key. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Days studied in a row, counting back from today. Today not being studied yet
 * does not break a streak — it only stops growing it — so the number does not
 * collapse to zero every midnight before the first review.
 */
export function currentStreak(reviewedAt: Date[], now: Date): number {
  if (reviewedAt.length === 0) return 0;

  const studied = new Set(reviewedAt.map(dayKey));
  const cursor = startOfDay(now);

  // Yesterday still counts as an unbroken streak until today is over.
  if (!studied.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!studied.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (studied.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

/** Reviews recorded on the given day. */
export function countOnDay(reviewedAt: Date[], day: Date): number {
  const key = dayKey(day);
  return reviewedAt.filter((date) => dayKey(date) === key).length;
}

/** One quiet line for Home: what happened today and how long the run is. */
export async function getProgress(userId: string, now: Date) {
  const since = startOfDay(now);
  since.setDate(since.getDate() - STREAK_WINDOW_DAYS);

  const logs = await getPrisma().reviewLog.findMany({
    where: { card: { deck: { userId } }, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const reviewedAt = logs.map((log) => log.createdAt);

  return {
    today: countOnDay(reviewedAt, now),
    streak: currentStreak(reviewedAt, now),
  };
}

/** Wording for the progress line, or null when there is nothing to say yet. */
export function progressLine(today: number, streak: number): string | null {
  if (today === 0 && streak === 0) return null;

  const parts: string[] = [];
  if (today > 0) parts.push(`${today} reviewed today`);
  if (streak > 0) parts.push(`${streak}-day streak`);
  return parts.join(" · ");
}
