/**
 * How the grammar catalog is arranged on screen.
 *
 * Two modes: a small catalog is "continue or start"; the full library chrome
 * (search, sort, CEFR shelves) waits until there are enough live courses.
 * The rules live here so a unit test can pin them down without rendering.
 */

import {
  CEFR_LEVELS,
  levelIndex,
  type CefrLevel,
} from "@/lib/courses/cefr";
import type { CatalogCourse, ComingCourse } from "@/lib/courses/catalog";

/** Live courses at or above this count get search, sort and CEFR shelves. */
export const CATALOG_CHROME_MIN_COURSES = 6;

export type CatalogSort = "rec" | "level" | "name" | "started";
export type CatalogScope = "all" | "mine";

export type CatalogCourseView = CatalogCourse & {
  doneCount: number;
  completed: boolean;
  nextHref: string;
};

export type CourseProgress = {
  completedLessons: string[];
  completed: boolean;
};

export type LevelGroupKind = "mine" | "below" | "above";

export type LevelGroup = {
  level: CefrLevel;
  kind: LevelGroupKind;
  courses: CatalogCourseView[];
  doneCount: number;
};

export function withProgress(
  course: CatalogCourse,
  progress: CourseProgress | undefined,
): CatalogCourseView {
  const done = new Set(progress?.completedLessons ?? []);
  const doneCount = course.lessons.filter((slug) => done.has(slug)).length;
  const next = course.lessons.find((slug) => !done.has(slug));
  return {
    ...course,
    doneCount,
    completed: Boolean(progress?.completed) || doneCount >= course.lessonCount,
    nextHref: next ? `${course.href}/${next}` : course.href,
  };
}

/** Outline until they have started; then the next unfinished lesson. */
export function catalogRowHref(course: CatalogCourseView): string {
  if (course.completed || course.doneCount === 0) return course.href;
  return course.nextHref;
}

export function isCourseInProgress(course: CatalogCourseView): boolean {
  return course.doneCount > 0 && !course.completed;
}

/**
 * Search, sort and "all / my level" earn their keep once the catalogue is a
 * library. Two A1 courses are not a library.
 */
export function shouldShowCatalogChrome(
  courses: Pick<CatalogCourseView, "level">[],
): boolean {
  if (courses.length >= CATALOG_CHROME_MIN_COURSES) return true;
  const levels = new Set(courses.map((course) => course.level));
  return levels.size >= 2;
}

/**
 * Small-catalog list: this CEFR, plus anything already underway at another
 * level, started first. Untouched courses on other shelves stay hidden.
 */
export function smallCatalogList(
  courses: CatalogCourseView[],
  level: CefrLevel,
): CatalogCourseView[] {
  return sortFlat(
    courses.filter(
      (course) => course.level === level || isCourseInProgress(course),
    ),
    "started",
  );
}

export function firstLevelWithCourses(
  courses: Pick<CatalogCourseView, "level">[],
): CefrLevel | null {
  for (const item of CEFR_LEVELS) {
    if (courses.some((course) => course.level === item)) return item;
  }
  return null;
}

export function filterAvailable(
  courses: CatalogCourseView[],
  query: string,
  scope: CatalogScope,
  level: CefrLevel,
): CatalogCourseView[] {
  const needle = query.trim().toLowerCase();
  return courses.filter((course) => {
    if (scope === "mine" && course.level !== level) return false;
    if (!needle) return true;
    return matchesQuery(course.title, course.titleRu, needle);
  });
}

export function filterComing(
  courses: ComingCourse[],
  query: string,
  level?: CefrLevel,
): ComingCourse[] {
  const needle = query.trim().toLowerCase();
  return courses.filter((course) => {
    if (level && course.level !== level) return false;
    if (!needle) return true;
    return matchesQuery(course.title, course.titleRu, needle);
  });
}

export function useFlatList(
  sort: CatalogSort,
  query: string,
  scope: CatalogScope,
): boolean {
  return (
    sort === "name" ||
    sort === "started" ||
    query.trim() !== "" ||
    scope === "mine"
  );
}

export function sortFlat(
  courses: CatalogCourseView[],
  sort: CatalogSort,
): CatalogCourseView[] {
  return courses.slice().sort((a, b) => {
    if (sort === "started") {
      const delta = startedRank(a) - startedRank(b);
      if (delta !== 0) return delta;
      return a.title.localeCompare(b.title, "en");
    }
    if (sort === "name") {
      return a.title.localeCompare(b.title, "en");
    }
    const byLevel = levelIndex(a.level) - levelIndex(b.level);
    if (byLevel !== 0) return byLevel;
    return a.title.localeCompare(b.title, "en");
  });
}

export function groupOrder(sort: CatalogSort, level: CefrLevel): CefrLevel[] {
  if (sort === "rec") {
    return [
      level,
      ...CEFR_LEVELS.filter(
        (item) => item !== level && levelIndex(item) > levelIndex(level),
      ),
      ...CEFR_LEVELS.filter((item) => levelIndex(item) < levelIndex(level)).reverse(),
    ];
  }
  return [...CEFR_LEVELS];
}

export function groupCourses(
  courses: CatalogCourseView[],
  sort: CatalogSort,
  level: CefrLevel,
): LevelGroup[] {
  const order = groupOrder(sort, level);
  return order.flatMap((item) => {
    const items = courses.filter((course) => course.level === item);
    if (items.length === 0) return [];
    return [
      {
        level: item,
        kind: groupKind(item, level),
        courses: items,
        doneCount: items.filter((course) => course.completed).length,
      },
    ];
  });
}

export function groupKind(item: CefrLevel, userLevel: CefrLevel): LevelGroupKind {
  if (item === userLevel) return "mine";
  return levelIndex(item) < levelIndex(userLevel) ? "below" : "above";
}

export function defaultOpenLevels(
  groups: LevelGroup[],
): CefrLevel[] {
  return groups
    .filter((group) => group.kind !== "below")
    .map((group) => group.level);
}

export function isAboveLevel(courseLevel: CefrLevel, userLevel: CefrLevel): boolean {
  return levelIndex(courseLevel) > levelIndex(userLevel);
}

function matchesQuery(title: string, titleRu: string, needle: string): boolean {
  return (
    title.toLowerCase().includes(needle) ||
    titleRu.toLowerCase().includes(needle)
  );
}

function startedRank(course: CatalogCourseView): number {
  if (course.doneCount > 0 && !course.completed) return 0;
  if (course.doneCount === 0) return 1;
  return 2;
}
