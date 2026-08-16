/**
 * How the grammar catalog is arranged on screen.
 *
 * Filtering, the hero card and the CEFR grouping are the same rules the
 * mockup used — kept here so a unit test can pin them down without rendering.
 */

import {
  CEFR_LEVELS,
  levelIndex,
  type CefrLevel,
} from "@/lib/courses/cefr";
import type { CatalogCourse, ComingCourse } from "@/lib/courses/catalog";

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

export function pickHero(
  courses: CatalogCourseView[],
  level: CefrLevel,
): CatalogCourseView | null {
  return (
    courses.find((course) => course.doneCount > 0 && !course.completed) ??
    courses.find((course) => course.doneCount === 0 && course.level === level) ??
    courses.find((course) => course.doneCount === 0) ??
    null
  );
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
): ComingCourse[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return courses;
  return courses.filter((course) =>
    matchesQuery(course.title, course.titleRu, needle),
  );
}

export function showHero(query: string, scope: CatalogScope): boolean {
  return query.trim() === "" && scope === "all";
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
