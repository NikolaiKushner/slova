import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { blueprintSchema } from "@/content/stories/schema";

/**
 * docs/plans/stories.md §8: ten blueprints, six A1 and four A2. Nothing at
 * runtime reads these files, so this test — not a static import list — is
 * what would catch a malformed or missing brief.
 */
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

function loadBlueprints() {
  return readdirSync(BLUEPRINTS_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      file: name,
      data: JSON.parse(readFileSync(resolve(BLUEPRINTS_DIR, name), "utf8")),
    }));
}

describe("story blueprints", () => {
  it("has exactly the ten blueprints named in the source specification", () => {
    const files = loadBlueprints();
    expect(files.map((f) => f.file.replace(/\.json$/, "")).sort()).toEqual(
      EXPECTED_SLUGS,
    );
  });

  it("parses every blueprint against the schema", () => {
    for (const { file, data } of loadBlueprints()) {
      const parsed = blueprintSchema.safeParse(data);
      expect(parsed.success, `${file}: ${JSON.stringify(parsed.success ? null : parsed.error.issues)}`).toBe(true);
    }
  });

  it("names its own slug matching the filename", () => {
    for (const { file, data } of loadBlueprints()) {
      expect(data.slug, file).toBe(file.replace(/\.json$/, ""));
    }
  });

  it("splits six A1 and four A2, per §8", () => {
    const files = loadBlueprints();
    const byLevel = { A1: 0, A2: 0 } as Record<string, number>;
    for (const { data } of files) {
      byLevel[data.level] = (byLevel[data.level] ?? 0) + 1;
    }
    expect(byLevel.A1).toBe(6);
    expect(byLevel.A2).toBe(4);
  });
});
