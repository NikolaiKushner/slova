/**
 * CEFR labels the catalog is built around. A1–B1 have shelves today; B2 is on
 * the picker so a person can say where they are before we write that shelf.
 */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2"] as const;

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export type LevelSource = "assumed" | "detected" | "chosen";

export const DEFAULT_CEFR_LEVEL: CefrLevel = "A1";
export const DEFAULT_LEVEL_SOURCE: LevelSource = "assumed";

export const CEFR_LEVEL_COOKIE = "cefr-level";
export const CEFR_SOURCE_COOKIE = "cefr-source";

export function isCefrLevel(
  value: string | undefined | null,
): value is CefrLevel {
  return (
    value === "A1" || value === "A2" || value === "B1" || value === "B2"
  );
}

export function isLevelSource(
  value: string | undefined | null,
): value is LevelSource {
  return value === "assumed" || value === "detected" || value === "chosen";
}

export function parseCefrLevel(
  value: string | undefined | null,
): CefrLevel {
  return isCefrLevel(value) ? value : DEFAULT_CEFR_LEVEL;
}

export function parseLevelSource(
  value: string | undefined | null,
): LevelSource {
  return isLevelSource(value) ? value : DEFAULT_LEVEL_SOURCE;
}

export function levelIndex(level: string): number {
  return CEFR_LEVELS.indexOf(level as CefrLevel);
}

const YEAR = 60 * 60 * 24 * 365;

export function persistLevelPref(level: CefrLevel, source: LevelSource) {
  const attrs = `Path=/; Max-Age=${YEAR}; SameSite=Lax`;
  document.cookie = `${CEFR_LEVEL_COOKIE}=${level}; ${attrs}`;
  document.cookie = `${CEFR_SOURCE_COOKIE}=${source}; ${attrs}`;
}
