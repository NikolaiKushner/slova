/**
 * How one grammar course looks on its lesson list.
 *
 * The mockup has three screens — nothing started, underway, finished — and
 * they are the same list with a different top. Progress is a set of completed
 * slugs, not a consecutive prefix: a person can open any lesson, and "next"
 * is the first one in course order that is still open. That matches the
 * catalogue hero, and leaves sequential lock as the product decision it is.
 */

import { isTestLesson } from "@/lib/courses/practice";

export type OutlineLesson = {
  slug: string;
  title: string;
  titleRu: string;
  estMinutes?: number;
};

export type LessonKind = "done" | "next" | "todo";

export type OutlineRow = {
  slug: string;
  title: string;
  titleRu: string;
  href: string;
  index: number;
  kind: LessonKind;
  estMinutes: number;
  badge: "start" | "continue" | null;
};

export type CourseOutlineState = "fresh" | "progress" | "done";

export type CourseOutline = {
  state: CourseOutlineState;
  doneCount: number;
  total: number;
  progressPercent: number;
  next: OutlineRow | null;
  testHref: string | null;
  lessons: OutlineRow[];
};

const DEFAULT_LESSON_MINUTES = 4;
const DEFAULT_TEST_MINUTES = 6;

export function lessonMinutes(lesson: OutlineLesson): number {
  if (lesson.estMinutes && lesson.estMinutes > 0) return lesson.estMinutes;
  return isTestLesson(lesson.slug) ? DEFAULT_TEST_MINUTES : DEFAULT_LESSON_MINUTES;
}

export function courseOutline(
  courseSlug: string,
  lessons: OutlineLesson[],
  completedSlugs: Iterable<string>,
): CourseOutline {
  const done = new Set(completedSlugs);
  const total = lessons.length;
  const doneCount = lessons.filter((lesson) => done.has(lesson.slug)).length;
  const nextIndex = lessons.findIndex((lesson) => !done.has(lesson.slug));
  const state: CourseOutlineState =
    total > 0 && doneCount >= total
      ? "done"
      : doneCount === 0
        ? "fresh"
        : "progress";

  const rows: OutlineRow[] = lessons.map((lesson, index) => {
    const isDone = done.has(lesson.slug);
    const isNext = index === nextIndex;
    return {
      slug: lesson.slug,
      title: lesson.title,
      titleRu: lesson.titleRu,
      href: `/courses/grammar/${courseSlug}/${lesson.slug}`,
      index: index + 1,
      kind: isDone ? "done" : isNext ? "next" : "todo",
      estMinutes: lessonMinutes(lesson),
      badge: isNext ? (doneCount === 0 ? "start" : "continue") : null,
    };
  });

  const test = lessons.find((lesson) => isTestLesson(lesson.slug));
  const fallback = rows[rows.length - 1];

  return {
    state,
    doneCount,
    total,
    progressPercent:
      total === 0 ? 0 : Math.round((doneCount / total) * 100),
    next: nextIndex >= 0 ? (rows[nextIndex] ?? null) : null,
    testHref: test
      ? `/courses/grammar/${courseSlug}/${test.slug}`
      : (fallback?.href ?? null),
    lessons: rows,
  };
}
