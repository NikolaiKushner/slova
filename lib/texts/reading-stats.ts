import { getPrisma } from "@/lib/prisma";
import { coverageOf } from "@/lib/texts/coverage";
import { knownKeys } from "@/lib/texts/known-words";
import { lemmatize } from "@/lib/texts/lemma";
import { parseText } from "@/lib/texts/tokenize";
import { MIN_READING_SEC } from "@/lib/progress";

/**
 * What reading adds to Progress — docs/plans/reader.md §8. Kept out of
 * `lib/progress.ts` so the rest of the page need not load a language model.
 */

export type ReadingStats = {
  texts: number;
  words: number;
  /** Mean over the texts read, 0–100. Null when nothing was read. */
  meanCoverage: number | null;
};

export async function getReadingStats(
  userId: string,
  since: Date,
): Promise<ReadingStats> {
  const prisma = getPrisma();

  const sittings = await prisma.studySitting.findMany({
    where: {
      userId,
      kind: "reading",
      endedAt: { not: null },
      durationSec: { gte: MIN_READING_SEC },
      startedAt: { gte: since },
    },
    select: { label: true },
  });

  const ids = [...new Set(sittings.map((sitting) => sitting.label))];
  if (ids.length === 0) return { texts: 0, words: 0, meanCoverage: null };

  const [texts, dictionary] = await Promise.all([
    prisma.userText.findMany({
      where: { userId, id: { in: ids } },
      select: { body: true, wordCount: true },
    }),
    prisma.userWord.findMany({ where: { userId }, select: { key: true } }),
  ]);
  if (texts.length === 0) return { texts: 0, words: 0, meanCoverage: null };

  const known = knownKeys(dictionary);
  let words = 0;
  let coverage = 0;
  for (const text of texts) {
    words += text.wordCount;
    coverage += coverageOf(parseText(text.body, lemmatize), known).percent;
  }

  return {
    texts: texts.length,
    words,
    meanCoverage: coverage / texts.length,
  };
}
