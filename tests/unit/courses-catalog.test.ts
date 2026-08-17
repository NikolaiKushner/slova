import { describe, expect, it } from "vitest";
import { grammarCatalog } from "@/lib/courses/catalog";
import type { CatalogCourse, ComingCourse } from "@/lib/courses/catalog";
import { parseCefrLevel, parseLevelSource } from "@/lib/courses/cefr";
import {
  catalogRowHref,
  defaultOpenLevels,
  filterAvailable,
  filterComing,
  firstLevelWithCourses,
  groupCourses,
  groupOrder,
  shouldShowCatalogChrome,
  smallCatalogList,
  sortFlat,
  useFlatList,
  withProgress,
  type CatalogCourseView,
} from "@/lib/courses/catalog-view";

describe("grammarCatalog", () => {
  it("puts the finished courses live, the rest on the coming shelf", () => {
    const catalog = grammarCatalog();
    expect(catalog.available.map((course) => course.slug)).toEqual([
      "present-simple",
      "to-be-present",
      "irregular-verbs",
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

describe("catalog arrangement", () => {
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

describe("catalogRowHref", () => {
  it("sends a fresh or finished course to the outline, and an underway one to the next lesson", () => {
    const fresh = course({ slug: "fresh", doneCount: 0 });
    const mid = course({
      slug: "mid",
      doneCount: 2,
      completed: false,
      nextHref: "/courses/grammar/present-simple/spelling",
    });
    const done = course({
      slug: "done",
      doneCount: 6,
      completed: true,
      nextHref: "/courses/grammar/present-simple",
    });
    expect(catalogRowHref(fresh)).toBe("/courses/grammar/present-simple");
    expect(catalogRowHref(mid)).toBe("/courses/grammar/present-simple/spelling");
    expect(catalogRowHref(done)).toBe("/courses/grammar/present-simple");
  });
});

describe("catalog chrome", () => {
  it("hides library chrome for two A1 courses and shows it once the catalogue is a library", () => {
    expect(
      shouldShowCatalogChrome([
        course({ slug: "a", level: "A1" }),
        course({ slug: "b", level: "A1" }),
      ]),
    ).toBe(false);
    expect(
      shouldShowCatalogChrome(
        Array.from({ length: 6 }, (_, i) =>
          course({ slug: `c${i}`, level: "A1" }),
        ),
      ),
    ).toBe(true);
    expect(
      shouldShowCatalogChrome([
        course({ slug: "a", level: "A1" }),
        course({ slug: "b", level: "A2" }),
      ]),
    ).toBe(true);
  });
});

describe("smallCatalogList", () => {
  it("keeps this level plus anything already underway, started first", () => {
    const list = smallCatalogList(
      [
        course({ slug: "fresh-a1", title: "Fresh A1", level: "A1", doneCount: 0 }),
        course({
          slug: "mid-a2",
          title: "Mid A2",
          level: "A2",
          doneCount: 2,
          completed: false,
        }),
        course({
          slug: "fresh-a2",
          title: "Fresh A2",
          level: "A2",
          doneCount: 0,
        }),
        course({
          slug: "done-a1",
          title: "Done A1",
          level: "A1",
          doneCount: 6,
          completed: true,
        }),
      ],
      "A1",
    );
    expect(list.map((item) => item.slug)).toEqual([
      "mid-a2",
      "fresh-a1",
      "done-a1",
    ]);
  });
});

describe("firstLevelWithCourses", () => {
  it("returns the lowest CEFR that still has a live course", () => {
    expect(
      firstLevelWithCourses([
        course({ slug: "b", level: "B1" }),
        course({ slug: "a", level: "A2" }),
      ]),
    ).toBe("A2");
    expect(firstLevelWithCourses([])).toBeNull();
  });
});

describe("filterComing", () => {
  const coming: ComingCourse[] = [
    {
      slug: "there-is",
      title: "there is / there are",
      titleRu: "есть, находится",
      status: "coming",
      level: "A1",
    },
    {
      slug: "present-perfect",
      title: "Present Perfect",
      titleRu: "Настоящее совершённое",
      status: "coming",
      level: "B1",
    },
  ];

  it("keeps the selected CEFR and still matches a query inside it", () => {
    expect(filterComing(coming, "", "A1").map((item) => item.slug)).toEqual([
      "there-is",
    ]);
    expect(
      filterComing(coming, "perfect", "A1").map((item) => item.slug),
    ).toEqual([]);
    expect(
      filterComing(coming, "perfect", "B1").map((item) => item.slug),
    ).toEqual(["present-perfect"]);
  });
});

