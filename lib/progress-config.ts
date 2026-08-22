/** Client-safe display thresholds shared by the progress page and widgets. */
export const CHART_DAYS = 28;
export const MEMORY_MIN_WORDS = 20;
export const STUBBORN_LIMIT = 5;
export const GRAMMAR_PREVIEW = 3;

/**
 * What a calendar square can be coloured for. A section that adds a
 * `SittingKind` names its square here, and the calendar draws it.
 */
export const ACTIVITY_KINDS = [
  "reviews",
  "lesson",
  "grammarReview",
  "story",
  "reading",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Days of recorded sittings before the week's time is worth showing. */
export const TIME_MIN_DAYS = 3;

/**
 * Bands of the weekly time bar. Three, because the data palette is three
 * (`docs/design-system.md` §5.3): a new kind joins a band, or its plan argues
 * for a fourth colour.
 */
export const TIME_BANDS = ["practice", "grammar", "reading"] as const;
export type TimeBand = (typeof TIME_BANDS)[number];

export const TIME_BAND_OF_KIND: Record<ActivityKind, TimeBand> = {
  reviews: "practice",
  lesson: "grammar",
  grammarReview: "grammar",
  story: "reading",
  reading: "reading",
};
