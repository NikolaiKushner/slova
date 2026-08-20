/**
 * Scores and pass marks for a grammar course.
 *
 * Persistence is a separate function; the scoring helpers are the part a unit
 * test can run without Postgres. A lesson at 80% is done; the course test is
 * 90%, and a worse retry cannot take a pass away.
 */

import { getPrisma } from "@/lib/prisma";
import { CourseContentError, loadCourse } from "@/lib/courses/load";
import {
  isTestLesson,
  lessonPool,
  practiceSessionSize,
} from "@/lib/courses/practice";
import { recordGrammarLessonMiss } from "@/lib/courses/review-store";
import { persistEnd } from "@/lib/sitting-store";
import { runSerializable } from "@/lib/serializable-transaction";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";

export const LESSON_PASS_PERCENT = 80;
export const TEST_PASS_PERCENT = 90;

export function scorePercent(right: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((100 * right) / total);
}

export { isTestLesson };

export function lessonPassed(percent: number, lessonSlug: string): boolean {
  return percent >=
    (isTestLesson(lessonSlug) ? TEST_PASS_PERCENT : LESSON_PASS_PERCENT);
}

export type LessonRecord = {
  status: "in_progress" | "completed";
  score: number;
  bestScore: number;
  attempts: number;
  missedRuleIds: string[];
  completedAt: Date | null;
};

export function nextLessonRecord(
  previous: LessonRecord | null,
  percent: number,
  missedRuleIds: string[],
  lessonSlug: string,
  now: Date,
): LessonRecord {
  const attempts = (previous?.attempts ?? 0) + 1;
  const bestScore = Math.max(previous?.bestScore ?? 0, percent);
  const passedNow = lessonPassed(percent, lessonSlug);
  const alreadyPassed = previous?.status === "completed";
  const completed = passedNow || alreadyPassed;

  const missed = new Set(previous?.missedRuleIds ?? []);
  for (const id of missedRuleIds) missed.add(id);

  return {
    status: completed ? "completed" : "in_progress",
    score: percent,
    bestScore,
    attempts,
    missedRuleIds: [...missed],
    completedAt: completed ? (previous?.completedAt ?? now) : null,
  };
}

export function courseShouldComplete(
  lessons: { slug: string; status: string }[],
): boolean {
  if (lessons.length === 0) return false;
  return lessons.every((lesson) => lesson.status === "completed");
}

export class CourseProgressConflictError extends Error {}

function lessonRecordOf(row: {
  status: string;
  score: number;
  bestScore: number;
  attempts: number;
  missedRuleIds: string[];
  completedAt: Date | null;
}): LessonRecord {
  return {
    status: row.status === "completed" ? "completed" : "in_progress",
    score: row.score,
    bestScore: row.bestScore,
    attempts: row.attempts,
    missedRuleIds: row.missedRuleIds,
    completedAt: row.completedAt,
  };
}

export async function saveLessonProgress(input: {
  userId: string;
  courseSlug: string;
  lessonSlug: string;
  operationId: string;
  right: number;
  missedRuleIds: string[];
  sittingId?: string;
  now?: Date;
  /** The learner's zone, read from the request — never from the body. */
  timeZone?: string;
}): Promise<LessonRecord> {
  const loaded = loadCourse(input.courseSlug);
  const lesson = loaded.lessons.find((item) => item.slug === input.lessonSlug);
  if (!lesson) {
    throw new CourseContentError(
      `${input.courseSlug}: no lesson "${input.lessonSlug}".`,
    );
  }

  const total = practiceSessionSize(
    lesson.slug,
    lessonPool(lesson).length,
  );
  if (total <= 0) {
    throw new CourseContentError(
      `${input.courseSlug}: lesson "${input.lessonSlug}" has no exercises.`,
    );
  }

  // Results are deliberately client-supplied. This is a self-study product,
  // not an assessment system: the server constrains the content identifiers
  // and score range but does not attempt to prove how an exercise was solved.
  const right = Math.min(Math.max(0, input.right), total);
  const allowedRules = new Set(loaded.rules.map((rule) => rule.id));
  const missedRuleIds = [
    ...new Set(
      input.missedRuleIds.filter((id) => allowedRules.has(id)).slice(0, 50),
    ),
  ];

  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? DEFAULT_TIMEZONE;
  const percent = scorePercent(right, total);
  const prisma = getPrisma();

  return runSerializable(prisma, async (transaction) => {
    const existingAttempt = await transaction.lessonAttempt.findUnique({
      where: { operationId: input.operationId },
    });
    if (existingAttempt) {
      const sameOperation =
        existingAttempt.userId === input.userId &&
        existingAttempt.courseSlug === input.courseSlug &&
        existingAttempt.lessonSlug === input.lessonSlug &&
        existingAttempt.score === percent &&
        existingAttempt.missedRuleIds.length === missedRuleIds.length &&
        existingAttempt.missedRuleIds.every(
          (ruleId, index) => ruleId === missedRuleIds[index],
        );
      if (!sameOperation) throw new CourseProgressConflictError();
      const persisted = await transaction.userLesson.findUniqueOrThrow({
        where: {
          userId_courseSlug_lessonSlug: {
            userId: input.userId,
            courseSlug: input.courseSlug,
            lessonSlug: input.lessonSlug,
          },
        },
      });
      return lessonRecordOf(persisted);
    }

    await transaction.userCourse.createMany({
      data: [
        {
          userId: input.userId,
          courseSlug: input.courseSlug,
          lastLessonSlug: input.lessonSlug,
          startedAt: now,
        },
      ],
      skipDuplicates: true,
    });
    await transaction.userCourse.updateMany({
      where: { userId: input.userId, courseSlug: input.courseSlug },
      data: { lastLessonSlug: input.lessonSlug },
    });
    await transaction.userLesson.createMany({
      data: [
        {
          userId: input.userId,
          courseSlug: input.courseSlug,
          lessonSlug: input.lessonSlug,
        },
      ],
      skipDuplicates: true,
    });

    const previousRow = await transaction.userLesson.findUniqueOrThrow({
      where: {
        userId_courseSlug_lessonSlug: {
          userId: input.userId,
          courseSlug: input.courseSlug,
          lessonSlug: input.lessonSlug,
        },
      },
    });
    const next = nextLessonRecord(
      lessonRecordOf(previousRow),
      percent,
      missedRuleIds,
      input.lessonSlug,
      now,
    );

    await transaction.userLesson.update({
      where: { id: previousRow.id },
      data: {
        status: next.status,
        score: next.score,
        bestScore: next.bestScore,
        attempts: next.attempts,
        missedRuleIds: next.missedRuleIds,
        completedAt: next.completedAt,
      },
    });
    await transaction.lessonAttempt.create({
      data: {
        operationId: input.operationId,
        userId: input.userId,
        courseSlug: input.courseSlug,
        lessonSlug: input.lessonSlug,
        score: percent,
        missedRuleIds,
      },
    });

    const siblings = await transaction.userLesson.findMany({
      where: { userId: input.userId, courseSlug: input.courseSlug },
    });
    const statuses = loaded.lessons.map((lesson) => {
      const row = siblings.find((item) => item.lessonSlug === lesson.slug);
      return { slug: lesson.slug, status: row?.status ?? "in_progress" };
    });
    if (courseShouldComplete(statuses)) {
      await transaction.userCourse.updateMany({
        where: {
          userId: input.userId,
          courseSlug: input.courseSlug,
          completedAt: null,
        },
        data: { completedAt: now },
      });
    }

    // Every rule missed here becomes reviewable tomorrow. Inside the same
    // transaction as the attempt: a lesson result that was recorded while its
    // weak rules were not would quietly lose the mistakes.
    for (const ruleId of missedRuleIds) {
      await recordGrammarLessonMiss(transaction, {
        userId: input.userId,
        courseSlug: input.courseSlug,
        ruleId,
        now,
        timeZone,
      });
    }

    if (input.sittingId) {
      // This attempt's misses, not the accumulated UserLesson list.
      await persistEnd(
        input.userId,
        input.sittingId,
        "completed",
        { now, score: percent, missedRuleIds },
        transaction,
      );
    }
    return next;
  });
}

export async function loadCourseProgressMap(
  userId: string,
  slugs: string[],
): Promise<Map<string, { completedLessons: string[]; completed: boolean }>> {
  const map = new Map<
    string,
    { completedLessons: string[]; completed: boolean }
  >();
  if (slugs.length === 0) return map;

  const prisma = getPrisma();
  const [lessons, courses] = await Promise.all([
    prisma.userLesson.findMany({
      where: {
        userId,
        courseSlug: { in: slugs },
        status: "completed",
      },
      select: { courseSlug: true, lessonSlug: true },
    }),
    prisma.userCourse.findMany({
      where: { userId, courseSlug: { in: slugs } },
      select: { courseSlug: true, completedAt: true },
    }),
  ]);

  for (const slug of slugs) {
    map.set(slug, { completedLessons: [], completed: false });
  }

  for (const row of lessons) {
    const entry = map.get(row.courseSlug);
    if (!entry) continue;
    entry.completedLessons.push(row.lessonSlug);
  }

  for (const row of courses) {
    const entry = map.get(row.courseSlug);
    if (!entry) continue;
    entry.completed = row.completedAt !== null;
  }

  return map;
}
