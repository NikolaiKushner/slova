import { describe, expect, it } from "vitest";

import {
  MARKETING_STORY,
  buildMarketingStoryStill,
  loadMarketingStoryStill,
} from "@/lib/stories/marketing";
import { loadStory } from "@/lib/stories/load";
import { StoryContentError } from "@/lib/stories/validate";

describe("loadMarketingStoryStill", () => {
  const still = loadMarketingStoryStill();
  const story = loadStory(MARKETING_STORY.slug);

  it("reports the configured story, not a hand-written one", () => {
    expect(still.title).toBe(story.title);
    expect(still.level).toBe(story.level);
    expect(still.estimatedMinutes).toBeGreaterThan(0);
  });

  it("opens a gloss that says what the phrase means here", () => {
    expect(still.gloss.surface).toBe("pulled away");
    expect(still.gloss.glossRu.trim().length).toBeGreaterThan(0);
  });

  it("reconstructs the paragraph it was cut from", () => {
    const paragraph = story.paragraphs.find(
      (one) => one.id === MARKETING_STORY.paragraphId,
    );
    expect(still.segments.map((segment) => segment.text).join("")).toBe(
      paragraph?.text,
    );
  });

  it("marks exactly one annotation as the open one", () => {
    const open = still.segments.filter(
      (segment) => segment.kind === "annotation" && segment.open,
    );
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ text: still.gloss.surface });
  });

  it("underlines the paragraph's other annotations too", () => {
    const annotated = still.segments.filter(
      (segment) => segment.kind === "annotation",
    );
    expect(annotated.length).toBeGreaterThan(1);
  });
});

describe("buildMarketingStoryStill", () => {
  it("names the paragraph it could not find", () => {
    expect(() =>
      buildMarketingStoryStill({ ...MARKETING_STORY, paragraphId: "p99" }),
    ).toThrow(StoryContentError);
  });

  it("names the annotation it could not find", () => {
    expect(() =>
      buildMarketingStoryStill({ ...MARKETING_STORY, openAnnotationId: "a-nope" }),
    ).toThrow(StoryContentError);
  });

  it("refuses an annotation that lives in another paragraph", () => {
    expect(() =>
      buildMarketingStoryStill({ ...MARKETING_STORY, openAnnotationId: "a-wait" }),
    ).toThrow(StoryContentError);
  });

  it("refuses a story that is not in the pack", () => {
    expect(() =>
      buildMarketingStoryStill({ ...MARKETING_STORY, slug: "no-such-story" }),
    ).toThrow(StoryContentError);
  });
});
