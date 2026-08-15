import { describe, expect, it } from "vitest";
import { exerciseSchema } from "@/content/courses/schema";
import {
  CourseContentError,
  listedAvailableSlugs,
  loadCatalog,
  loadCourse,
  parsePack,
} from "@/lib/courses/load";
import { LESSON_PRACTICE_POOL_MIN } from "@/lib/courses/practice";

describe("present-simple pack", () => {
  it("parses and satisfies the bank rule", () => {
    const loaded = loadCourse("present-simple");
    expect(loaded.course.title).toBe("Present Simple");
    expect(loaded.lessons.map((lesson) => lesson.slug)).toEqual([
      "forms",
      "use",
      "spelling",
      "negatives",
      "questions",
      "test",
    ]);
    expect(loaded.rules.map((rule) => rule.id).sort()).toEqual([
      "ps-base-form",
      "ps-negative-doesnt",
      "ps-negative-dont",
      "ps-question-do",
      "ps-question-does",
      "ps-spelling-es",
      "ps-third-person-s",
      "ps-use-facts",
      "ps-use-habits",
    ]);
  });

  it("resolves every exercise ruleId", () => {
    const loaded = loadCourse("present-simple");
    const ruleIds = new Set(loaded.rules.map((rule) => rule.id));
    for (const lesson of loaded.lessons) {
      for (const block of lesson.blocks) {
        if (block.type !== "exercise") continue;
        expect(ruleIds.has(block.ruleId)).toBe(true);
      }
    }
    for (const item of loaded.bank) {
      expect(ruleIds.has(item.ruleId)).toBe(true);
    }
  });

  it("keeps lesson ids out of the bank, so a drill is a new prompt", () => {
    const loaded = loadCourse("present-simple");
    const lessonIds = new Set(
      loaded.lessons.flatMap((lesson) =>
        lesson.blocks
          .filter((block) => block.type === "exercise")
          .map((block) => block.id),
      ),
    );
    for (const item of loaded.bank) {
      expect(lessonIds.has(item.id)).toBe(false);
    }
  });

  it("gives each regular lesson a pool larger than one sitting", () => {
    const loaded = loadCourse("present-simple");
    for (const lesson of loaded.lessons) {
      if (lesson.slug === "test") continue;
      const pool = lesson.blocks.filter((block) => block.type === "exercise");
      expect(pool.length).toBeGreaterThanOrEqual(LESSON_PRACTICE_POOL_MIN);
    }
  });
});

describe("catalog", () => {
  it("lists present-simple as the only available course", () => {
    const catalog = loadCatalog();
    expect(listedAvailableSlugs(catalog)).toEqual(["present-simple"]);
    expect(catalog.groups.map((group) => group.id)).toEqual(["a1", "a2", "b1"]);
    expect(catalog.groups[0]?.courses.map((entry) => entry.slug)).toEqual([
      "present-simple",
      "to-be-present",
      "there-is",
      "present-continuous",
      "past-simple",
      "can",
      "have-got",
      "articles-a-the",
    ]);
  });
});

describe("invariants", () => {
  it("rejects an unknown kind at parse time", () => {
    const parsed = exerciseSchema.safeParse({
      type: "exercise",
      id: "x",
      ruleId: "ps-base-form",
      kind: "order",
      prompt: "Assemble this.",
      answer: "I work",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a choice whose answer is not an option", () => {
    expect(() =>
      parsePack("present-simple", {
        course: {
          slug: "present-simple",
          title: "Present Simple",
          titleRu: "Простое настоящее",
          level: "A1",
          order: 1,
          estMinutes: 40,
          lessons: ["forms"],
        },
        rules: [
          {
            id: "ps-base-form",
            title: "base",
            anchorMd: "base",
          },
        ],
        lessons: {
          forms: {
            slug: "forms",
            title: "Forms",
            titleRu: "Форма",
            blocks: [
              {
                type: "exercise",
                id: "bad-choice",
                ruleId: "ps-base-form",
                kind: "choice",
                prompt: "They ___.",
                options: ["work", "works"],
                answer: "working",
              },
            ],
          },
        },
        bank: [
          {
            type: "exercise",
            id: "bank-a",
            ruleId: "ps-base-form",
            kind: "gap",
            prompt: "I ___ here. (live)",
            answer: "live",
          },
          {
            type: "exercise",
            id: "bank-b",
            ruleId: "ps-base-form",
            kind: "gap",
            prompt: "You ___ tea. (like)",
            answer: "like",
          },
        ],
      }),
    ).toThrow(CourseContentError);
  });

  it("rejects a lesson rule with a thin bank", () => {
    expect(() =>
      parsePack("present-simple", {
        course: {
          slug: "present-simple",
          title: "Present Simple",
          titleRu: "Простое настоящее",
          level: "A1",
          order: 1,
          estMinutes: 40,
          lessons: ["forms"],
        },
        rules: [
          {
            id: "ps-base-form",
            title: "base",
            anchorMd: "base",
          },
        ],
        lessons: {
          forms: {
            slug: "forms",
            title: "Forms",
            titleRu: "Форма",
            blocks: [
              {
                type: "exercise",
                id: "only-one",
                ruleId: "ps-base-form",
                kind: "gap",
                prompt: "I ___ here. (live)",
                answer: "live",
              },
            ],
          },
        },
        bank: [
          {
            type: "exercise",
            id: "bank-a",
            ruleId: "ps-base-form",
            kind: "gap",
            prompt: "They ___ tea. (like)",
            answer: "like",
          },
        ],
      }),
    ).toThrow(/at least 2 bank exercises/);
  });

  it("rejects a regular lesson whose pool is too small to deal a sitting", () => {
    const gaps = Array.from({ length: 15 }, (_, i) => ({
      type: "exercise" as const,
      id: `thin-${i}`,
      ruleId: "ps-base-form",
      kind: "gap" as const,
      prompt: `I ___ here ${i}. (live)`,
      answer: "live",
    }));

    expect(() =>
      parsePack("present-simple", {
        course: {
          slug: "present-simple",
          title: "Present Simple",
          titleRu: "Простое настоящее",
          level: "A1",
          order: 1,
          estMinutes: 40,
          lessons: ["forms"],
        },
        rules: [
          {
            id: "ps-base-form",
            title: "base",
            anchorMd: "base",
          },
        ],
        lessons: {
          forms: {
            slug: "forms",
            title: "Forms",
            titleRu: "Форма",
            blocks: gaps,
          },
        },
        bank: [
          {
            type: "exercise",
            id: "bank-a",
            ruleId: "ps-base-form",
            kind: "gap",
            prompt: "They ___ tea. (like)",
            answer: "like",
          },
          {
            type: "exercise",
            id: "bank-b",
            ruleId: "ps-base-form",
            kind: "gap",
            prompt: "You ___ tea. (like)",
            answer: "like",
          },
        ],
      }),
    ).toThrow(/at least 16 exercises/);
  });
});
