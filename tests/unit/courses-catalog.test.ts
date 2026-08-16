import { describe, expect, it } from "vitest";
import { grammarCatalog } from "@/lib/courses/catalog";
import type { CatalogCourse } from "@/lib/courses/catalog";
import { parseCefrLevel, parseLevelSource } from "@/lib/courses/cefr";
import {
  defaultOpenLevels,
  filterAvailable,
  groupCourses,
  groupOrder,
  pickHero,
  showHero,
  sortFlat,
  useFlatList,
  withProgress,
  type CatalogCourseView,
} from "@/lib/courses/catalog-view";

describe("grammarCatalog", () => {
  it("puts Present Simple and to be live, the rest on the coming shelf", () => {
    const catalog = grammarCatalog();
    expect(catalog.available.map((course) => course.slug)).toEqual([
      "present-simple",
      "to-be-present",
    ]);
    expect(catalog.available[0]).toMatchObject({
      href: "/courses/grammar/present-simple",
      level: "A1",
      lessonCount: 6,
      estMinutes: 40,
    });
    expect(catalog.available[1]).toMatchObject({
      href: "/courses/grammar/to-be-present",
      title: "to be",
      titleRu: "am / is / are",
      level: "A1",
      lessonCount: 5,
      estMinutes: 30,
    });
    expect(catalog.available[0]?.outcomes.length).toBeGreaterThan(0);
    expect(catalog.available[1]?.outcomes.length).toBeGreaterThan(0);
    expect(catalog.coming[0]).toMatchObject({
      slug: "there-is",
      status: "coming",
      level: "A1",
    });
    expect(catalog.coming.map((course) => course.level)).toContain("B1");
  });
});

describe("cefr preference", () => {
  it("falls back to A1 assumed when the cookie is missing or junk", () => {
    expect(parseCefrLevel(undefined)).toBe("A1");
    expect(parseCefrLevel("C2")).toBe("A1");
    expect(parseLevelSource(undefined)).toBe("assumed");
    expect(parseLevelSource("guess")).toBe("assumed");
    expect(parseCefrLevel("B2")).toBe("B2");
    expect(parseLevelSource("chosen")).toBe("chosen");
  });
});

const sample: CatalogCourse = {
  slug: "present-simple",
  title: "Present Simple",
  titleRu: "Простое настоящее",
  status: "available",
  href: "/courses/grammar/present-simple",
  level: "A1",
  lessonCount: 6,
  estMinutes: 40,
  outcomes: ["one"],
  lessons: ["forms", "use", "spelling", "negatives", "questions", "test"],
};

function course(
  overrides: Partial<CatalogCourse> &
    Partial<Pick<CatalogCourseView, "doneCount" | "completed" | "nextHref">>,
): CatalogCourseView {
  const base = { ...sample, ...overrides };
  if (
    "doneCount" in overrides ||
    "completed" in overrides ||
    "nextHref" in overrides
  ) {
    return {
      ...base,
      doneCount: overrides.doneCount ?? 0,
      completed: overrides.completed ?? false,
      nextHref: overrides.nextHref ?? `${base.href}/${base.lessons[0]}`,
    };
  }
  return withProgress(base, undefined);
}

describe("withProgress", () => {
  it("points at the first unfinished lesson", () => {
    const view = withProgress(sample, {
      completedLessons: ["forms", "use", "spelling"],
      completed: false,
    });
    expect(view.doneCount).toBe(3);
    expect(view.nextHref).toBe("/courses/grammar/present-simple/negatives");
    expect(view.completed).toBe(false);
  });
});

describe("pickHero", () => {
  const inProgress = course({
    slug: "to-be",
    title: "to be",
    doneCount: 3,
    completed: false,
    nextHref: "/courses/grammar/to-be/forms",
  });
  const unstartedA1 = course({ slug: "present-simple", level: "A1" });
  const unstartedA2 = course({
    slug: "past-simple",
    title: "Past Simple",
    level: "A2",
  });

  it("prefers a course that is underway", () => {
    expect(pickHero([unstartedA2, inProgress, unstartedA1], "A2")?.slug).toBe(
      "to-be",
    );
  });

  it("then an unstarted course at the person's level", () => {
    expect(pickHero([unstartedA1, unstartedA2], "A2")?.slug).toBe("past-simple");
  });

  it("then any unstarted course", () => {
    expect(pickHero([unstartedA1], "B1")?.slug).toBe("present-simple");
  });
});

describe("catalog arrangement", () => {
  it("hides the hero while searching or on my-level", () => {
    expect(showHero("", "all")).toBe(true);
    expect(showHero("past", "all")).toBe(false);
    expect(showHero("", "mine")).toBe(false);
  });

  it("filters by query and by the person's level", () => {
    const list = [
      course({ title: "Present Simple", titleRu: "Простое настоящее", level: "A1" }),
      course({
        slug: "past-simple",
        title: "Past Simple",
        titleRu: "простое прошедшее",
        level: "A2",
      }),
    ];
    expect(filterAvailable(list, "прош", "all", "A1").map((c) => c.slug)).toEqual([
      "past-simple",
    ]);
    expect(filterAvailable(list, "", "mine", "A2").map((c) => c.slug)).toEqual([
      "past-simple",
    ]);
  });

  it("recommends the person's level first, then above, then below", () => {
    expect(groupOrder("rec", "A2")).toEqual(["A2", "B1", "B2", "A1"]);
    expect(groupOrder("level", "A2")).toEqual(["A1", "A2", "B1", "B2"]);
  });

  it("closes shelves below the person's level by default", () => {
    const groups = groupCourses(
      [
        course({ level: "A1" }),
        course({
          slug: "past-simple",
          title: "Past Simple",
          level: "A2",
        }),
        course({
          slug: "passive",
          title: "Passive Voice",
          level: "B1",
        }),
      ],
      "rec",
      "A2",
    );
    expect(groups.map((group) => [group.level, group.kind])).toEqual([
      ["A2", "mine"],
      ["B1", "above"],
      ["A1", "below"],
    ]);
    expect(defaultOpenLevels(groups)).toEqual(["A2", "B1"]);
  });

  it("flattens on name, started, search and my-level", () => {
    expect(useFlatList("rec", "", "all")).toBe(false);
    expect(useFlatList("name", "", "all")).toBe(true);
    expect(useFlatList("started", "", "all")).toBe(true);
    expect(useFlatList("rec", "past", "all")).toBe(true);
    expect(useFlatList("rec", "", "mine")).toBe(true);
  });

  it("sorts started courses ahead of untouched ones", () => {
    const sorted = sortFlat(
      [
        course({ slug: "done", title: "Done", doneCount: 6, completed: true }),
        course({ slug: "fresh", title: "Fresh", doneCount: 0 }),
        course({
          slug: "mid",
          title: "Mid",
          doneCount: 2,
          completed: false,
        }),
      ],
      "started",
    );
    expect(sorted.map((course) => course.slug)).toEqual(["mid", "fresh", "done"]);
  });
});
