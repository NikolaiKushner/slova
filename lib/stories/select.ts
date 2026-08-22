import { normalizeKey } from "@/lib/lexicon/key";
import type { LoadedStory } from "@/lib/stories/load";
import { ratingOf, type RatedWord } from "@/lib/word-rating";

/**
 * Ordering and the counts the catalog card shows — docs/plans/shipped/stories.md
 * §5.3. Ten stories and one reader need sorting, not a scoring engine: hide
 * completed stories, sort by "yours" descending, break ties by catalog
 * order (A1 before A2).
 *
 * Pure — no Prisma import. The caller fetches `UserWord` rows and completed
 * slugs and passes them in, which is also what keeps this testable without a
 * database. `completedSlugs` has no source yet: `StoryProgress` is Phase 3,
 * so every caller before then passes an empty set.
 */

export type FocusClassification = "yours" | "known" | "new";

export type StoryCounts = {
  yours: number;
  known: number;
  new: number;
};

export type OrderedStory = LoadedStory & { counts: StoryCounts };

/** The subset of `UserWord` this needs: enough to run `ratingOf`, plus the key it's matched on. */
export type DictionaryWord = RatedWord & { key: string };

const UNSTUDIED: RatedWord = { introducedAt: null, intervalDays: 0 };

function classify(record: RatedWord | undefined): FocusClassification {
  const rating = ratingOf(record ?? UNSTUDIED);
  if (rating === 5) return "known";
  if (rating === 1) return "new";
  return "yours";
}

export function focusCounts(
  story: LoadedStory,
  dictionary: DictionaryWord[],
): StoryCounts {
  const byKey = new Map(dictionary.map((word) => [word.key, word]));
  const counts: StoryCounts = { yours: 0, known: 0, new: 0 };

  for (const annotation of story.annotations) {
    if (annotation.role !== "focus") continue;
    const word = byKey.get(normalizeKey(annotation.lemma));
    counts[classify(word)] += 1;
  }

  return counts;
}

export function orderStories(
  stories: LoadedStory[],
  catalogOrder: string[],
  dictionary: DictionaryWord[],
  completedSlugs: ReadonlySet<string> = new Set(),
): OrderedStory[] {
  const positionOf = new Map(catalogOrder.map((slug, index) => [slug, index]));

  return stories
    .filter((story) => !completedSlugs.has(story.slug))
    .map((story): OrderedStory => ({ ...story, counts: focusCounts(story, dictionary) }))
    .sort((a, b) => {
      if (a.counts.yours !== b.counts.yours) {
        return b.counts.yours - a.counts.yours;
      }
      const posA = positionOf.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
      const posB = positionOf.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
      return posA - posB;
    });
}
