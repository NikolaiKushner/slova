import { describe, expect, it } from "vitest";
import { loadAllStories, loadCatalog, loadStory } from "@/lib/stories/load";
import {
  focusCounts,
  orderStories,
  type DictionaryWord,
} from "@/lib/stories/select";

/** `intervalDays` bands from lib/word-rating.ts: <3 → rating 2, <10 → 3, <21 → 4, else 5. */
function word(key: string, intervalDays: number): DictionaryWord {
  return { key, introducedAt: new Date("2026-01-01"), intervalDays };
}

describe("focusCounts", () => {
  it("counts every focus lemma as new against an empty dictionary", () => {
    const story = loadStory("missing-key");
    const focusLemmaCount = story.annotations.filter(
      (a) => a.role === "focus",
    ).length;
    const counts = focusCounts(story, []);
    expect(counts).toEqual({ yours: 0, known: 0, new: focusLemmaCount });
  });

  it("classifies rating 2-4 as yours and rating 5 as known", () => {
    const story = loadStory("missing-key");
    const focusLemmas = story.annotations
      .filter((a) => a.role === "focus")
      .map((a) => a.lemma);

    // First lemma: being learned (rating 2). Second: learned (rating 5, interval >= 21).
    const dictionary = [word(focusLemmas[0]!, 1), word(focusLemmas[1]!, 30)];
    const counts = focusCounts(story, dictionary);

    expect(counts.yours).toBe(1);
    expect(counts.known).toBe(1);
    expect(counts.new).toBe(focusLemmas.length - 2);
  });

  it("treats a pasted-but-never-studied UserWord as new (introducedAt null)", () => {
    const story = loadStory("missing-key");
    const [firstLemma] = story.annotations
      .filter((a) => a.role === "focus")
      .map((a) => a.lemma);
    const dictionary: DictionaryWord[] = [
      { key: firstLemma!, introducedAt: null, intervalDays: 0 },
    ];
    const counts = focusCounts(story, dictionary);
    expect(counts.yours).toBe(0);
    expect(counts.new).toBeGreaterThan(0);
  });
});

describe("orderStories", () => {
  it("puts the first catalog story first for a brand-new learner", () => {
    const stories = loadAllStories();
    const ordered = orderStories(stories, loadCatalog(), []);
    expect(ordered.map((s) => s.slug)).toEqual(loadCatalog());
    expect(ordered.every((s) => s.counts.yours === 0)).toBe(true);
  });

  it("ranks a story with more words being learned first", () => {
    const stories = loadAllStories();
    const laterSlug = loadCatalog()[5]!; // not the catalog's first story
    const laterStory = stories.find((s) => s.slug === laterSlug)!;
    const focusLemmas = laterStory.annotations
      .filter((a) => a.role === "focus")
      .map((a) => a.lemma);

    const dictionary = focusLemmas.map((lemma) => word(lemma, 1));
    const ordered = orderStories(stories, loadCatalog(), dictionary);

    expect(ordered[0]!.slug).toBe(laterSlug);
  });

  it("hides completed stories entirely", () => {
    const stories = loadAllStories();
    const completed = new Set([loadCatalog()[0]!]);
    const ordered = orderStories(stories, loadCatalog(), [], completed);
    expect(ordered.some((s) => s.slug === loadCatalog()[0])).toBe(false);
    expect(ordered).toHaveLength(stories.length - 1);
  });

  it("breaks a tie by catalog order", () => {
    const stories = loadAllStories();
    const ordered = orderStories(stories, loadCatalog(), []);
    // Every story ties at zero "yours" for an empty dictionary, so the
    // catalog order must survive untouched.
    expect(ordered.map((s) => s.slug)).toEqual(loadCatalog());
  });
});
