import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { storyFileSchema } from "@/content/stories/schema";
import { validateStory } from "@/lib/stories/validate";

/**
 * docs/plans/stories.md §8/§11 Phase 0 exit: "ten stories in the repository,
 * green". This reads the files directly with fs rather than importing them,
 * because nothing at runtime needs these ten JSON files bundled yet — that
 * static-import wiring is `lib/stories/load.ts`, Phase 1.
 */
const STORIES_DIR = resolve("content/stories/stories");
const BLUEPRINTS_DIR = resolve("content/stories/blueprints");

const EXPECTED_SLUGS = [
  "missing-key",
  "wrong-coffee",
  "dinner-without-list",
  "first-day",
  "way-to-library",
  "package-next-door",
  "bus-is-gone",
  "rainy-weekend",
  "no-battery",
  "wrong-room",
].sort();

function loadStories() {
  return readdirSync(STORIES_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      file: name,
      data: JSON.parse(readFileSync(resolve(STORIES_DIR, name), "utf8")),
    }));
}

describe("story content", () => {
  it("has exactly the ten stories named in the source specification", () => {
    const files = loadStories();
    expect(files.map((f) => f.file.replace(/\.json$/, "")).sort()).toEqual(
      EXPECTED_SLUGS,
    );
  });

  it("parses every story against the schema", () => {
    for (const { file, data } of loadStories()) {
      const parsed = storyFileSchema.safeParse(data);
      expect(
        parsed.success,
        `${file}: ${JSON.stringify(parsed.success ? null : parsed.error.issues)}`,
      ).toBe(true);
    }
  });

  it("passes every content invariant from §5.2", () => {
    for (const { file, data } of loadStories()) {
      const story = storyFileSchema.parse(data);
      expect(() => validateStory(story), file).not.toThrow();
    }
  });

  it("names its own slug matching the filename", () => {
    for (const { file, data } of loadStories()) {
      expect(data.slug, file).toBe(file.replace(/\.json$/, ""));
    }
  });

  it("names a blueprint that actually exists", () => {
    const blueprintSlugs = new Set(
      readdirSync(BLUEPRINTS_DIR)
        .filter((name) => name.endsWith(".json"))
        .map((name) => name.replace(/\.json$/, "")),
    );
    for (const { file, data } of loadStories()) {
      expect(blueprintSlugs.has(data.blueprint), file).toBe(true);
    }
  });

  it("splits six A1 and four A2, per §8", () => {
    const byLevel = { A1: 0, A2: 0 } as Record<string, number>;
    for (const { data } of loadStories()) {
      byLevel[data.level] = (byLevel[data.level] ?? 0) + 1;
    }
    expect(byLevel.A1).toBe(6);
    expect(byLevel.A2).toBe(4);
  });
});
