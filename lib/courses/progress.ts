/**
 * Scores and pass marks for a grammar course.
 *
 * Persistence is a separate function; the scoring helpers are the part a unit
 * test can run without Postgres. A lesson at 80% is done; the course test is
 * 90%, and a worse retry cannot take a pass away.
 */

import { getPrisma } from "@/lib/prisma";
import { CourseContentError, loadCourse } from "@/lib/courses/load";
import { lessonPool, practiceSessionSize } from "@/lib/courses/practice";

export const LESSON_PASS_PERCENT = 80;
export const TEST_PASS_PERCENT = 90;

export function scorePercent(right: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((100 * right) / total);
}

export function isTestLesson(lessonSlug: string): boolean {
  return lessonSlug === "test";
}

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

export async function saveLessonProgress(input: {
  userId: string;
  courseSlug: string;
  lessonSlug: string;
  right: number;
  missedRuleIds: string[];
  now?: Date;
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

  const right = Math.min(Math.max(0, input.right), total);
  const allowedRules = new Set(loaded.rules.map((rule) => rule.id));
  const missedRuleIds = [
    ...new Set(
      input.missedRuleIds.filter((id) => allowedRules.has(id)).slice(0, 50),
    ),
  ];

  const now = input.now ?? new Date();
  const percent = scorePercent(right, total);
  const prisma = getPrisma();

  await prisma.userCourse.upsert({
    where: {
      userId_courseSlug: {
        userId: input.userId,
        courseSlug: input.courseSlug,
      },
    },
    create: {
      userId: input.userId,
      courseSlug: input.courseSlug,
      lastLessonSlug: input.lessonSlug,
      startedAt: now,
    },
    update: { lastLessonSlug: input.lessonSlug },
  });

  const previousRow = await prisma.userLesson.findUnique({
    where: {
      userId_courseSlug_lessonSlug: {
        userId: input.userId,
        courseSlug: input.courseSlug,
        lessonSlug: input.lessonSlug,
      },
    },
  });

  const previous: LessonRecord | null = previousRow
    ? {
        status:
          previousRow.status === "completed" ? "completed" : "in_progress",
        score: previousRow.score,
        bestScore: previousRow.bestScore,
        attempts: previousRow.attempts,
        missedRuleIds: previousRow.missedRuleIds,
        completedAt: previousRow.completedAt,
      }
    : null;

  const next = nextLessonRecord(
    previous,
    percent,
    missedRuleIds,
    input.lessonSlug,
    now,
  );

  await prisma.userLesson.upsert({
    where: {
      userId_courseSlug_lessonSlug: {
        userId: input.userId,
        courseSlug: input.courseSlug,
        lessonSlug: input.lessonSlug,
      },
    },
    create: {
      userId: input.userId,
      courseSlug: input.courseSlug,
      lessonSlug: input.lessonSlug,
      status: next.status,
      score: next.score,
      bestScore: next.bestScore,
      attempts: next.attempts,
      missedRuleIds: next.missedRuleIds,
      completedAt: next.completedAt,
    },
    update: {
      status: next.status,
      score: next.score,
      bestScore: next.bestScore,
      attempts: next.attempts,
      missedRuleIds: next.missedRuleIds,
      completedAt: next.completedAt,
    },
  });

  const siblings = await prisma.userLesson.findMany({
    where: { userId: input.userId, courseSlug: input.courseSlug },
  });

  const statuses = loaded.lessons.map((lesson) => {
    if (lesson.slug === input.lessonSlug) {
      return { slug: lesson.slug, status: next.status };
    }
    const row = siblings.find((item) => item.lessonSlug === lesson.slug);
    return { slug: lesson.slug, status: row?.status ?? "in_progress" };
  });

  if (courseShouldComplete(statuses)) {
    await prisma.userCourse.updateMany({
      where: {
        userId: input.userId,
        courseSlug: input.courseSlug,
        completedAt: null,
      },
      data: { completedAt: now },
    });
  }

  return next;
}
