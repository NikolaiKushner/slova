import { loadStory } from "@/lib/stories/load";
import { buildParagraphSegments } from "@/lib/stories/reader-view";
import { StoryContentError } from "@/lib/stories/validate";

/**
 * The one reading state the landing page draws.
 *
 * The landing used to invent a product state in JSX, which is how it ended up
 * advertising a screen that had been removed. This goes the other way: the
 * still is derived from a real story file, through the same loader and the
 * same segment builder the reader uses, so a story that stops validating stops
 * the build rather than quietly misrepresenting the product.
 *
 * Pure and server-only by construction — no Prisma, session or network.
 */

export type MarketingStoryConfig = {
  slug: string;
  paragraphId: string;
  openAnnotationId: string;
};

/**
 * "pulled away" shows why a contextual gloss beats a dictionary word pair: the
 * two words mean nothing apart, and the story is what makes them "отъезжать".
 */
export const MARKETING_STORY: MarketingStoryConfig = {
  slug: "bus-is-gone",
  paragraphId: "p2",
  openAnnotationId: "a-pulled-away",
};

export type MarketingSegment =
  | { kind: "text"; text: string }
  | { kind: "annotation"; text: string; open: boolean };

export type MarketingStoryStill = {
  title: string;
  level: "A1" | "A2";
  estimatedMinutes: number;
  segments: MarketingSegment[];
  gloss: { surface: string; lemma: string; glossRu: string };
};

export function buildMarketingStoryStill(
  config: MarketingStoryConfig,
): MarketingStoryStill {
  const story = loadStory(config.slug);

  const paragraph = story.paragraphs.find((one) => one.id === config.paragraphId);
  if (!paragraph) {
    throw new StoryContentError(
      `Marketing still: "${config.slug}" has no paragraph "${config.paragraphId}".`,
    );
  }

  const open = story.annotations.find((one) => one.id === config.openAnnotationId);
  if (!open) {
    throw new StoryContentError(
      `Marketing still: "${config.slug}" has no annotation "${config.openAnnotationId}".`,
    );
  }
  if (open.paragraphId !== paragraph.id) {
    throw new StoryContentError(
      `Marketing still: annotation "${open.id}" is in paragraph "${open.paragraphId}", not "${paragraph.id}".`,
    );
  }

  const segments = buildParagraphSegments(paragraph, story.annotations).map(
    (segment): MarketingSegment =>
      segment.kind === "text"
        ? segment
        : {
            kind: "annotation",
            text: segment.text,
            open: segment.annotation.id === open.id,
          },
  );

  if (!segments.some((segment) => segment.kind === "annotation" && segment.open)) {
    throw new StoryContentError(
      `Marketing still: annotation "${open.id}" is covered by an overlapping phrase and never renders.`,
    );
  }

  return {
    title: story.title,
    level: story.level,
    estimatedMinutes: story.estimatedMinutes,
    segments,
    gloss: { surface: open.surface, lemma: open.lemma, glossRu: open.glossRu },
  };
}

export function loadMarketingStoryStill(): MarketingStoryStill {
  return buildMarketingStoryStill(MARKETING_STORY);
}
