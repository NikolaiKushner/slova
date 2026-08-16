import { LEARNED_INTERVAL_DAYS } from "@/lib/word-rating";
import { getPrisma } from "@/lib/prisma";

/**
 * The few numbers worth putting on the first screen.
 *
 * Deliberately few. A dashboard of tiles is the thing the design system says
 * this app is not, and most study statistics measure effort rather than
 * progress — minutes spent, cards flipped, days in a row. These four answer
 * questions somebody actually has: how much do I know, how much is waiting,
 * how much of it is still new, and is any of this getting easier.
 */

export type Overview = {
  words: number;
  /** Never studied. */
  fresh: number;
  /** Studied, not yet settled. */
  learning: number;
  /** Interval past the point the rest of the app calls learned. */
  learned: number;
  sets: number;
  /**
   * Share of translations that came from the shared base rather than a model,
   * all time. The one number that says whether the lexicon was worth building.
   * Null until anything has been translated at all.
   */
  hitRate: number | null;
};

export async function getOverview(userId: string): Promise<Overview> {
  const prisma = getPrisma();

  const [words, fresh, learned, sets, usage] = await Promise.all([
    prisma.userWord.count({ where: { userId } }),
    prisma.userWord.count({ where: { userId, introducedAt: null } }),
    prisma.userWord.count({
      where: { userId, intervalDays: { gte: LEARNED_INTERVAL_DAYS } },
    }),
    prisma.wordSet.count({ where: { userId } }),
    prisma.llmUsage.aggregate({
      where: { userId },
      _sum: { lexiconHits: true, llmMisses: true },
    }),
  ]);

  const hits = usage._sum.lexiconHits ?? 0;
  const misses = usage._sum.llmMisses ?? 0;
  const asked = hits + misses;

  return {
    words,
    fresh,
    learning: Math.max(0, words - fresh - learned),
    learned,
    sets,
    hitRate: asked === 0 ? null : hits / asked,
  };
}
