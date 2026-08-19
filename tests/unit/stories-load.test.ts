import { describe, expect, it } from "vitest";
import {
  loadAllStories,
  loadCatalog,
  loadStory,
  parseStory,
} from "@/lib/stories/load";
import { StoryContentError } from "@/lib/stories/validate";

const EXPECTED_SLUGS = [
  "missing-key",
  "wrong-coffee",
  "first-day",
  "way-to-library",
  "bus-is-gone",
  "rainy-weekend",
  "dinner-without-list",
  "package-next-door",
  "no-battery",
  "wrong-room",
];

describe("loadCatalog", () => {
  it("lists all ten stories in reading order, A1 before A2", () => {
    expect(loadCatalog()).toEqual(EXPECTED_SLUGS);
  });
});

describe("loadStory", () => {
  it("loads every catalog slug with a derived word count and reading time", () => {
    for (const slug of loadCatalog()) {
      const story = loadStory(slug);
      expect(story.slug, slug).toBe(slug);
      expect(story.wordCount, slug).toBeGreaterThanOrEqual(120);
      expect(story.wordCount, slug).toBeLessThanOrEqual(180);
      expect(story.estimatedMinutes, slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("throws for an unknown slug", () => {
    expect(() => loadStory("does-not-exist")).toThrow(StoryContentError);
  });
});

describe("loadAllStories", () => {
  it("returns all ten, in catalog order", () => {
    const stories = loadAllStories();
    expect(stories.map((s) => s.slug)).toEqual(EXPECTED_SLUGS);
  });
});

describe("parseStory", () => {
  it("throws when the file's slug does not match its catalog key", () => {
    const raw = { ...loadStory("missing-key"), slug: "other-slug" };
    expect(() => parseStory("missing-key", raw)).toThrow(
      /expected "missing-key"/,
    );
  });

  it("propagates a content-invariant failure", () => {
    const raw = {
      ...loadStory("missing-key"),
      paragraphs: [
        { id: "p1", text: "Too short." },
        { id: "p2", text: "Way too short." },
        { id: "p3", text: "Still short." },
      ],
    };
    expect(() => parseStory("missing-key", raw)).toThrow(/120-180 words/);
  });

  it("propagates a schema failure", () => {
    const raw = { ...loadStory("missing-key"), level: "B1" };
    expect(() => parseStory("missing-key", raw)).toThrow(StoryContentError);
  });
});
