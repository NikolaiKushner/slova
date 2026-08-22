/**
 * Grammar Review — the schedule, and what one sitting contains.
 *
 * A rule missed in a lesson comes back the next local day. Three correct
 * returns, spaced 3 then 7 days, clear it for now; any miss puts it back to
 * the start. That is the whole model — docs/plans/shipped/grammar-review.md §7.
 *
 * Vocabulary has FSRS because it has thousands of independently scheduled
 * items and a recall model worth fitting. Twenty-five live rules being
 * corrected after a known mistake do not: three bounded returns are something
 * a person can predict and a test can assert.
 *
 * Everything here is pure. Postgres lives in `review-store.ts`; keeping the
 * arithmetic on this side is what lets the table in the plan be a unit test.
 */

import {
  isExerciseBlock,
  type Exercise,
  type Lesson,
} from "@/content/courses/schema";
import type { LoadedCourse } from "@/lib/courses/load";
import { isTestLesson, shuffleOptions } from "@/lib/courses/practice";
import { dateFromDayKey } from "@/lib/calendar-date";
import { calendarDay, readTimeZone, shiftCalendarDay } from "@/lib/timezone";
import { shuffle, type Rng } from "@/lib/practice/random";

/** One sitting is at most this many distinct rules. */
export const GRAMMAR_REVIEW_BATCH_LIMIT = 10;
/** Consecutive correct returns that clear a rule. */
export const GRAMMAR_REVIEW_CLEAR_STAGE = 3;
/** Days until the next return, by the stage the answer came from. */
export const GRAMMAR_REVIEW_CORRECT_INTERVALS = [3, 7] as const;
export const GRAMMAR_REVIEW_MISS_INTERVAL_DAYS = 1;

/**
 * Start of the local day `days` from now.
 *
 * Calendar days, not 24-hour durations: a miss at 23:55 is reviewable after
 * local midnight rather than at 23:55 tomorrow.
 */
export function dueOnCalendarDay(
  now: Date,
  timeZone: string,
  days: number,
): Date {
  // `calendarDay` already sanitizes; `dateFromDayKey` builds a TZDate, which
  // throws on a zone Intl does not know. A stale cookie is not a 500.
  const zone = readTimeZone(timeZone);
  const key = shiftCalendarDay(calendarDay(now, zone), days);
  return new Date(dateFromDayKey(key, zone, 0).getTime());
}

export type GrammarRuleSchedule = {
  stage: number;
  dueAt: Date | null;
  cleared: boolean;
};

function assertStage(stage: number): void {
  if (
    !Number.isInteger(stage) ||
    stage < 0 ||
    stage > GRAMMAR_REVIEW_CLEAR_STAGE
  ) {
    throw new RangeError(`Grammar review stage out of range: ${stage}.`);
  }
}

/**
 * What a lesson miss does to a rule.
 *
 * Always stage 0, always active. The due date is the earlier of what was
 * already scheduled and the next local day, so missing a rule again never
 * postpones a review that was already waiting — and a rule that is due now
 * stays due now.
 */
export function scheduleLessonMiss(
  current: { dueAt: Date | null } | null,
  now: Date,
  timeZone: string,
): { stage: 0; dueAt: Date } {
  const nextDay = dueOnCalendarDay(
    now,
    timeZone,
    GRAMMAR_REVIEW_MISS_INTERVAL_DAYS,
  );
  const existing = current?.dueAt ?? null;
  return {
    stage: 0,
    dueAt: existing !== null && existing < nextDay ? existing : nextDay,
  };
}

/** What one answer inside Grammar Review does to a rule. */
export function scheduleGrammarReview(
  stage: number,
  correct: boolean,
  now: Date,
  timeZone: string,
): GrammarRuleSchedule {
  assertStage(stage);

  if (!correct) {
    return {
      stage: 0,
      dueAt: dueOnCalendarDay(now, timeZone, GRAMMAR_REVIEW_MISS_INTERVAL_DAYS),
      cleared: false,
    };
  }

  const nextStage = stage + 1;
  if (nextStage >= GRAMMAR_REVIEW_CLEAR_STAGE) {
    return { stage: GRAMMAR_REVIEW_CLEAR_STAGE, dueAt: null, cleared: true };
  }

  const days = GRAMMAR_REVIEW_CORRECT_INTERVALS[stage];
  return {
    stage: nextStage,
    dueAt: dueOnCalendarDay(now, timeZone, days),
    cleared: false,
  };
}

/**
 * The lesson to send someone to after a miss.
 *
 * Where the rule is explained beats where it is drilled: "Open the full
 * lesson" is an offer to read, not to practise again. Tests are never the
 * answer — they teach nothing.
 */
export function lessonForRule(
  loaded: LoadedCourse,
  ruleId: string,
): Lesson | null {
  const teaching = loaded.lessons.filter((lesson) => !isTestLesson(lesson.slug));
  const explained = teaching.find((lesson) => theoryNamesRule(lesson, ruleId));
  if (explained) return explained;
  return (
    teaching.find((lesson) =>
      lesson.blocks.some(
        (block) => isExerciseBlock(block) && block.ruleId === ruleId,
      ),
    ) ?? null
  );
}

function theoryNamesRule(lesson: Lesson, ruleId: string): boolean {
  const inBlocks = lesson.blocks.some(
    (block) =>
      (block.type === "explanation" || block.type === "pitfall") &&
      block.ruleId === ruleId,
  );
  if (inBlocks) return true;
  return (lesson.ruleCard?.rows ?? []).some((row) => row.ruleId === ruleId);
}

/** A due row as the store hands it over: content ids, nothing Prisma-shaped. */
export type WeakRuleRow = {
  memoryId: string;
  courseSlug: string;
  ruleId: string;
  lastExerciseId: string | null;
};

/** What the review page passes to the client. Plain, serializable, no Dates. */
export type GrammarReviewItem = {
  memoryId: string;
  courseSlug: string;
  courseTitle: string;
  ruleId: string;
  ruleTitle: string;
  ruleAnchorMd: string;
  lessonSlug: string | null;
  lessonTitle: string | null;
  exercise: Exercise;
};

/**
 * One fresh bank prompt per due rule, up to the batch limit.
 *
 * Rows arrive in due order; content that no longer exists is skipped rather
 * than throwing, so deleting a course cannot break the queue. The exercise
 * just seen is avoided when the bank has another — content validation
 * guarantees two per rule, but a single one still works.
 */
export function buildGrammarReviewQueue(
  rows: readonly WeakRuleRow[],
  resolve: (slug: string) => LoadedCourse | null,
  options: { rng: Rng; limit?: number },
): GrammarReviewItem[] {
  const limit = options.limit ?? GRAMMAR_REVIEW_BATCH_LIMIT;
  const items: GrammarReviewItem[] = [];
  const seenRules = new Set<string>();
  const seenExercises = new Set<string>();
  const courses = new Map<string, LoadedCourse | null>();

  for (const row of rows) {
    if (items.length >= limit) break;

    const key = `${row.courseSlug}:${row.ruleId}`;
    if (seenRules.has(key)) continue;

    if (!courses.has(row.courseSlug)) {
      courses.set(row.courseSlug, resolve(row.courseSlug));
    }
    const loaded = courses.get(row.courseSlug) ?? null;
    if (!loaded) continue;

    const rule = loaded.rules.find((item) => item.id === row.ruleId);
    if (!rule) continue;

    const exercise = pickBankExercise(
      loaded.bank,
      row.ruleId,
      row.lastExerciseId,
      seenExercises,
      options.rng,
    );
    if (!exercise) continue;

    const lesson = lessonForRule(loaded, row.ruleId);
    seenRules.add(key);
    seenExercises.add(exercise.id);
    items.push({
      memoryId: row.memoryId,
      courseSlug: row.courseSlug,
      courseTitle: loaded.course.title,
      ruleId: rule.id,
      ruleTitle: rule.title,
      ruleAnchorMd: rule.anchorMd,
      lessonSlug: lesson?.slug ?? null,
      lessonTitle: lesson?.title ?? null,
      exercise: shuffleOptions(exercise, options.rng),
    });
  }

  return items;
}

function pickBankExercise(
  bank: readonly Exercise[],
  ruleId: string,
  lastExerciseId: string | null,
  taken: ReadonlySet<string>,
  rng: Rng,
): Exercise | null {
  const forRule = bank.filter(
    (item) => item.ruleId === ruleId && !taken.has(item.id),
  );
  if (forRule.length === 0) return null;

  const fresh = forRule.filter((item) => item.id !== lastExerciseId);
  const pool = fresh.length > 0 ? fresh : forRule;
  return shuffle(pool, rng)[0];
}

/** Copy-only estimate for the catalog card. Not a persisted metric. */
export function reviewEstimateMinutes(dueCount: number): number {
  return Math.min(GRAMMAR_REVIEW_BATCH_LIMIT, Math.max(1, dueCount));
}
