import { getPrisma } from "@/lib/prisma";
import {
  ACTIVITY_KINDS,
  CHART_DAYS,
  STUBBORN_LIMIT,
  type ActivityKind,
} from "@/lib/progress-config";
import type { SittingKind } from "@/lib/sitting";
import { meanRetrievability, type ScheduledWord } from "@/lib/srs";
import { measureServerOperation } from "@/lib/server-metrics";
import {
  calendarDay,
  DEFAULT_TIMEZONE,
  shiftCalendarDay,
} from "@/lib/timezone";

/** How far back the streak is allowed to reach. */
export const STREAK_WINDOW_DAYS = 365;

/** Grammar Review is a grammar sitting with its own label, not a fourth kind. */
const GRAMMAR_REVIEW_LABEL = "review";

/**
 * Which square a finished sitting colours, and whose minutes it adds to.
 * Exhaustive: a new `SittingKind` must name its square to compile.
 */
const ACTIVITY_OF_SITTING: Record<SittingKind, ActivityKind> = {
  practice: "reviews",
  brainstorm: "reviews",
  study: "reviews",
  grammar: "lesson",
};

type SittingRow = {
  kind: string;
  label: string;
  endedAt: Date | null;
  endedReason: string | null;
  durationSec: number;
  reviews: number;
  introduced: number;
};

function activityKindOf(row: SittingRow): ActivityKind | null {
  if (row.kind === "grammar" && row.label === GRAMMAR_REVIEW_LABEL) {
    return "grammarReview";
  }
  return ACTIVITY_OF_SITTING[row.kind as SittingKind] ?? null;
}

function emptyMinutes(): Record<ActivityKind, number> {
  const minutes = {} as Record<ActivityKind, number>;
  for (const kind of ACTIVITY_KINDS) minutes[kind] = 0;
  return minutes;
}

export type StudyTime = {
  todayMinutes: number;
  weekMinutes: number;
  weekByKind: Record<ActivityKind, number>;
  recordedDays: number;
};

/** Time spent. Only ended sittings, so the one open right now cannot inflate it. */
export function studyTime(
  sittings: SittingRow[],
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): StudyTime {
  const today = dayKey(now, timeZone);
  const weekStart = startOfIsoWeek(today);
  const oldest = shiftCalendarDay(today, -STREAK_WINDOW_DAYS);
  const seconds = { today: 0, week: 0 };
  const byKind = emptyMinutes();
  const days = new Set<string>();

  for (const row of sittings) {
    if (!row.endedAt || row.durationSec <= 0) continue;
    const key = dayKey(row.endedAt, timeZone);
    if (key < oldest || key > today) continue;
    days.add(key);
    if (key === today) seconds.today += row.durationSec;
    if (key < weekStart) continue;
    seconds.week += row.durationSec;
    const kind = activityKindOf(row);
    if (kind) byKind[kind] += row.durationSec;
  }

  for (const kind of ACTIVITY_KINDS) {
    byKind[kind] = Math.round(byKind[kind] / 60);
  }
  return {
    todayMinutes: Math.round(seconds.today / 60),
    weekMinutes: Math.round(seconds.week / 60),
    weekByKind: byKind,
    recordedDays: days.size,
  };
}

/** Opening a screen is not studying; answering in it, or finishing it, is. */
function didWork(row: SittingRow): boolean {
  return (
    row.endedReason === "completed" || row.reviews > 0 || row.introduced > 0
  );
}

function emptyDays(): Record<ActivityKind, Date[]> {
  const times = {} as Record<ActivityKind, Date[]>;
  for (const kind of ACTIVITY_KINDS) times[kind] = [];
  return times;
}

/** Days each kind was studied, as one keyed map of sorted YYYY-MM-DD keys. */
function dayKeysByKind(
  times: Record<ActivityKind, Date[]>,
  now: Date,
  timeZone: string,
): Record<ActivityKind, string[]> {
  const keys = {} as Record<ActivityKind, string[]>;
  for (const kind of ACTIVITY_KINDS) {
    keys[kind] = [...daysInWindow(times[kind], now, timeZone)].sort();
  }
  return keys;
}

/** Local calendar day of a timestamp, as a sortable YYYY-MM-DD key. */
export function dayKey(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return calendarDay(date, timeZone);
}

/** Distinct calendar days that have at least one timestamp, in the given zone. */
export function studiedDays(
  reviewedAt: Date[],
  timeZone: string = DEFAULT_TIMEZONE,
): Set<string> {
  return new Set(reviewedAt.map((date) => dayKey(date, timeZone)));
}

function daysInWindow(
  reviewedAt: Date[],
  now: Date,
  timeZone: string,
): Set<string> {
  const today = dayKey(now, timeZone);
  const oldest = shiftCalendarDay(today, -STREAK_WINDOW_DAYS);
  const inWindow = new Set<string>();
  for (const key of studiedDays(reviewedAt, timeZone)) {
    if (key >= oldest && key <= today) inWindow.add(key);
  }
  return inWindow;
}

/**
 * Days studied in a row, counting back from today. Today not being studied yet
 * does not break a streak — it only stops growing it — so the number does not
 * collapse to zero every midnight before the first review.
 */
export function currentStreak(
  reviewedAt: Date[],
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  const studied = daysInWindow(reviewedAt, now, timeZone);
  if (studied.size === 0) return 0;

  let cursor = dayKey(now, timeZone);

  // Yesterday still counts as an unbroken streak until today is over.
  if (!studied.has(cursor)) {
    cursor = shiftCalendarDay(cursor, -1);
    if (!studied.has(cursor)) return 0;
  }

  let streak = 0;
  while (studied.has(cursor)) {
    streak += 1;
    cursor = shiftCalendarDay(cursor, -1);
  }

  return streak;
}

/**
 * Longest consecutive run of studied days in the window. A skip that zeros
 * the current streak leaves this number alone.
 */
export function longestStreak(
  reviewedAt: Date[],
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  const studied = daysInWindow(reviewedAt, now, timeZone);
  if (studied.size === 0) return 0;

  const sorted = [...studied].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === shiftCalendarDay(sorted[i - 1], 1)) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return longest;
}

/** Reviews recorded on the given day. */
export function countOnDay(
  reviewedAt: Date[],
  day: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  const key = dayKey(day, timeZone);
  return reviewedAt.filter((date) => dayKey(date, timeZone) === key).length;
}

/** Mature reviews: the word already had at least a day's interval. */
export function matureRetention(
  logs: { rating: string; prevIntervalDays: number | null }[],
): number | null {
  let goods = 0;
  let total = 0;
  for (const log of logs) {
    if ((log.prevIntervalDays ?? 0) < 1) continue;
    total += 1;
    if (log.rating === "good") goods += 1;
  }
  return total === 0 ? null : goods / total;
}

export function reviewsByDay(
  reviewedAt: Date[],
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): { day: string; count: number }[] {
  const today = dayKey(now, timeZone);
  const counts = new Map<string, number>();
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    counts.set(shiftCalendarDay(today, -i), 0);
  }
  for (const date of reviewedAt) {
    const key = dayKey(date, timeZone);
    if (!counts.has(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([day, count]) => ({ day, count }));
}

/** Monday of the ISO week that contains this YYYY-MM-DD key. */
export function startOfIsoWeek(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  const fromMonday = weekday === 0 ? 6 : weekday - 1;
  return shiftCalendarDay(day, -fromMonday);
}

/**
 * Distinct studied days from Monday through today, in the learner's zone.
 * Future days in the same week are not counted.
 */
export function studyDaysThisWeek(
  studiedDayKeys: readonly string[],
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  const today = dayKey(now, timeZone);
  const start = startOfIsoWeek(today);
  return studiedDayKeys.filter((key) => key >= start && key <= today).length;
}

/** Review counts for every day in the streak window — calendar tooltips. */
export function reviewCountsByDay(
  reviewedAt: Date[],
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): Record<string, number> {
  const today = dayKey(now, timeZone);
  const oldest = shiftCalendarDay(today, -STREAK_WINDOW_DAYS);
  const counts: Record<string, number> = {};
  for (const date of reviewedAt) {
    const key = dayKey(date, timeZone);
    if (key < oldest || key > today) continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function windowStart(now: Date): Date {
  // A couple of extra UTC days so a TZ ahead of UTC does not clip the window.
  return new Date(now.getTime() - (STREAK_WINDOW_DAYS + 2) * MS_PER_DAY);
}

export type StudyActivity = {
  today: number;
  streak: number;
  longest: number;
  memory: number | null;
  memoryWords: number;
  retentionMature: number | null;
  reviewsByDay: { day: string; count: number }[];
  reviewCountsByDay: Record<string, number>;
  studiedDayKeys: string[];
  dayKeysByKind: Record<ActivityKind, string[]>;
  time: StudyTime;
  stubborn: { id: string; front: string; lapses: number }[];
  courses: {
    slug: string;
    completed: boolean;
    completedLessons: number;
  }[];
};

const SITTING_ACTIVITY_SELECT = {
  kind: true,
  label: true,
  endedAt: true,
  endedReason: true,
  durationSec: true,
  reviews: true,
  introduced: true,
} as const;

function activityTimes(input: {
  reviewedAt: Date[];
  sittings: SittingRow[];
  storyRows: { startedAt: Date; completedAt: Date | null }[];
  legacyLessonAt: Date[];
}): Record<ActivityKind, Date[]> {
  const times = emptyDays();
  times.reviews.push(...input.reviewedAt);
  // Stories, and lessons finished before sittings existed (migration
  // 20260817142019), have no sitting of their own to be read from yet.
  times.lesson.push(...input.legacyLessonAt);
  for (const row of input.storyRows) {
    times.story.push(row.startedAt);
    if (row.completedAt) times.story.push(row.completedAt);
  }
  for (const row of input.sittings) {
    if (!row.endedAt || !didWork(row)) continue;
    const kind = activityKindOf(row);
    if (kind) times[kind].push(row.endedAt);
  }
  return times;
}

export async function getStudyActivity(
  userId: string,
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): Promise<StudyActivity> {
  const since = windowStart(now);
  const prisma = getPrisma();

  const [
    logs,
    sittings,
    storyRows,
    legacyLessons,
    remembered,
    stubbornRows,
    courseRows,
    lessonRows,
  ] =
    await measureServerOperation("progress.full_report", () => Promise.all([
      prisma.reviewLog.findMany({
        where: { userId, createdAt: { gte: since }, undoneAt: null },
        select: { createdAt: true, rating: true, prevIntervalDays: true },
      }),
      prisma.studySitting.findMany({
        where: { userId, endedAt: { gte: since } },
        select: SITTING_ACTIVITY_SELECT,
      }),
      prisma.storyProgress.findMany({
        where: { userId, startedAt: { gte: since } },
        select: { startedAt: true, completedAt: true },
      }),
      prisma.userLesson.findMany({
        where: { userId, completedAt: { gte: since } },
        select: { completedAt: true },
      }),
      prisma.userWord.findMany({
        where: { userId, stability: { not: null } },
        select: {
          dueAt: true,
          intervalDays: true,
          stability: true,
          difficulty: true,
          srsState: true,
          learningSteps: true,
          reps: true,
          lapses: true,
          lastReviewAt: true,
        },
      }),
      prisma.userWord.findMany({
        where: { userId, lapses: { gt: 0 } },
        orderBy: { lapses: "desc" },
        take: STUBBORN_LIMIT,
        select: { id: true, front: true, lapses: true },
      }),
      prisma.userCourse.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        select: { courseSlug: true, completedAt: true },
      }),
      prisma.userLesson.findMany({
        where: { userId, status: "completed" },
        select: { courseSlug: true },
      }),
    ]));

  const reviewedAt = logs.map((log) => log.createdAt);
  const times = activityTimes({
    reviewedAt,
    sittings,
    storyRows,
    legacyLessonAt: legacyLessons.flatMap((lesson) =>
      lesson.completedAt ? [lesson.completedAt] : [],
    ),
  });
  const studiedAt = ACTIVITY_KINDS.flatMap((kind) => times[kind]);
  const memoryWords = remembered as ScheduledWord[];

  const completedByCourse = new Map<string, number>();
  for (const row of lessonRows) {
    completedByCourse.set(
      row.courseSlug,
      (completedByCourse.get(row.courseSlug) ?? 0) + 1,
    );
  }

  return {
    today: countOnDay(reviewedAt, now, timeZone),
    streak: currentStreak(studiedAt, now, timeZone),
    longest: longestStreak(studiedAt, now, timeZone),
    memory: meanRetrievability(memoryWords, now),
    memoryWords: memoryWords.length,
    retentionMature: matureRetention(logs),
    reviewsByDay: reviewsByDay(reviewedAt, now, timeZone),
    reviewCountsByDay: reviewCountsByDay(reviewedAt, now, timeZone),
    studiedDayKeys: [...daysInWindow(studiedAt, now, timeZone)].sort(),
    dayKeysByKind: dayKeysByKind(times, now, timeZone),
    time: studyTime(sittings, now, timeZone),
    stubborn: stubbornRows,
    courses: courseRows.map((row) => ({
      slug: row.courseSlug,
      completed: row.completedAt !== null,
      completedLessons: completedByCourse.get(row.courseSlug) ?? 0,
    })),
  };
}

/** One quiet line for Home: what happened today and how long the run is. */
export async function getProgress(
  userId: string,
  now: Date,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const since = windowStart(now);
  const prisma = getPrisma();
  const [logs, sittings, legacyLessons] = await measureServerOperation(
    "progress.practice_line",
    () =>
      Promise.all([
        prisma.reviewLog.findMany({
          where: { userId, createdAt: { gte: since }, undoneAt: null },
          select: { createdAt: true },
        }),
        prisma.studySitting.findMany({
          where: { userId, endedAt: { gte: since } },
          select: SITTING_ACTIVITY_SELECT,
        }),
        prisma.userLesson.findMany({
          where: { userId, completedAt: { gte: since } },
          select: { completedAt: true },
        }),
      ]),
  );

  const reviewedAt = logs.map((log) => log.createdAt);
  const times = activityTimes({
    reviewedAt,
    sittings,
    storyRows: [],
    legacyLessonAt: legacyLessons.flatMap((lesson) =>
      lesson.completedAt ? [lesson.completedAt] : [],
    ),
  });

  return {
    today: countOnDay(reviewedAt, now, timeZone),
    streak: currentStreak(
      ACTIVITY_KINDS.flatMap((kind) => times[kind]),
      now,
      timeZone,
    ),
  };
}

export type ProgressLineCopy = {
  reviewed: (count: number) => string;
  streak: (count: number) => string;
};

export const EN_PROGRESS_LINE: ProgressLineCopy = {
  reviewed: (count) => `${count} reviewed today`,
  streak: (count) => `${count}-day streak`,
};

/** Wording for the progress line, or null when there is nothing to say yet. */
export function progressLine(
  today: number,
  streak: number,
  copy: ProgressLineCopy = EN_PROGRESS_LINE,
): string | null {
  if (today === 0 && streak === 0) return null;

  const parts: string[] = [];
  if (today > 0) parts.push(copy.reviewed(today));
  if (streak > 0) parts.push(copy.streak(streak));
  return parts.join(" · ");
}
