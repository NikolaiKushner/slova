import catalogJson from "@/content/stories/catalog.json";
import busIsGone from "@/content/stories/stories/bus-is-gone.json";
import dinnerWithoutList from "@/content/stories/stories/dinner-without-list.json";
import firstDay from "@/content/stories/stories/first-day.json";
import missingKey from "@/content/stories/stories/missing-key.json";
import noBattery from "@/content/stories/stories/no-battery.json";
import packageNextDoor from "@/content/stories/stories/package-next-door.json";
import rainyWeekend from "@/content/stories/stories/rainy-weekend.json";
import wayToLibrary from "@/content/stories/stories/way-to-library.json";
import wrongCoffee from "@/content/stories/stories/wrong-coffee.json";
import wrongRoom from "@/content/stories/stories/wrong-room.json";
import {
  catalogSchema,
  storyFileSchema,
  type Catalog,
  type StoryFile,
} from "@/content/stories/schema";
import { StoryContentError, storyWordCount, validateStory } from "@/lib/stories/validate";

/**
 * Stories on disk, parsed and checked. Same reason as
 * `lib/courses/load.ts`: JSON is imported, not read from the filesystem, so
 * it travels with the serverless bundle.
 */

/** Conservative for a learner pausing on glosses — see docs/plans/shipped/stories.md §6.2's "~2 мин" example on a ~150-word story. */
const READING_WORDS_PER_MINUTE = 100;

const STORIES: Record<string, unknown> = {
  "missing-key": missingKey,
  "wrong-coffee": wrongCoffee,
  "dinner-without-list": dinnerWithoutList,
  "first-day": firstDay,
  "way-to-library": wayToLibrary,
  "package-next-door": packageNextDoor,
  "bus-is-gone": busIsGone,
  "rainy-weekend": rainyWeekend,
  "no-battery": noBattery,
  "wrong-room": wrongRoom,
};

export type LoadedStory = StoryFile & {
  wordCount: number;
  estimatedMinutes: number;
};

export function loadCatalog(): Catalog {
  const parsed = catalogSchema.safeParse(catalogJson);
  if (!parsed.success) {
    throw new StoryContentError(
      `catalog.json: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  return parsed.data;
}

export function parseStory(slug: string, raw: unknown): LoadedStory {
  const story = parseOrThrow(storyFileSchema, raw, `stories/${slug}.json`);
  if (story.slug !== slug) {
    throw new StoryContentError(
      `stories/${slug}.json slug is "${story.slug}", expected "${slug}".`,
    );
  }
  validateStory(story);

  const wordCount = storyWordCount(story);
  const estimatedMinutes = Math.max(
    1,
    Math.ceil(wordCount / READING_WORDS_PER_MINUTE),
  );
  return { ...story, wordCount, estimatedMinutes };
}

export function loadStory(slug: string): LoadedStory {
  const raw = STORIES[slug];
  if (raw === undefined) {
    throw new StoryContentError(`No story pack for slug "${slug}".`);
  }
  return parseStory(slug, raw);
}

export function loadAllStories(catalog: Catalog = loadCatalog()): LoadedStory[] {
  return catalog.map((slug) => loadStory(slug));
}

function parseOrThrow<T>(
  schema: {
    safeParse: (
      data: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { message: string }[] } };
  },
  data: unknown,
  label: string,
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new StoryContentError(
      `${label}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
    );
  }
  return parsed.data;
}
