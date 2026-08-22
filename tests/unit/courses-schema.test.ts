import { describe, expect, it } from "vitest";
import { acceptedAnswers, exerciseSchema, type Exercise } from "@/content/courses/schema";
import {
  CourseContentError,
  listedAvailableSlugs,
  loadCatalog,
  loadCourse,
  parsePack,
} from "@/lib/courses/load";
import { LESSON_PRACTICE_POOL_MIN, TEST_SITTING_SIZE } from "@/lib/courses/practice";
import { gapCue } from "@/lib/courses/prompt";

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
    expect(loaded.lessons.map((lesson) => lesson.estMinutes)).toEqual([
      4, 5, 4, 4, 4, 6,
    ]);
    expect(loaded.lessons[5]?.titleRu).toBe("Проверка всего курса");
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

describe("to-be-present pack", () => {
  it("parses and satisfies the bank rule", () => {
    const loaded = loadCourse("to-be-present");
    expect(loaded.course.title).toBe("to be");
    expect(loaded.course.titleRu).toBe("am / is / are");
    expect(loaded.lessons.map((lesson) => lesson.slug)).toEqual([
      "forms",
      "use",
      "negatives",
      "questions",
      "test",
    ]);
    expect(loaded.lessons.map((lesson) => lesson.estMinutes)).toEqual([
      4, 5, 4, 5, 6,
    ]);
    expect(loaded.lessons[4]?.titleRu).toBe("Проверка всего курса");
    expect(loaded.rules.map((rule) => rule.id).sort()).toEqual([
      "tb-form-am",
      "tb-form-are",
      "tb-form-is",
      "tb-negative",
      "tb-question",
      "tb-short-answer",
      "tb-use-description",
      "tb-use-location",
    ]);
  });

  it("resolves every exercise ruleId", () => {
    const loaded = loadCourse("to-be-present");
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
    const loaded = loadCourse("to-be-present");
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
    const loaded = loadCourse("to-be-present");
    for (const lesson of loaded.lessons) {
      if (lesson.slug === "test") continue;
      const pool = lesson.blocks.filter((block) => block.type === "exercise");
      expect(pool.length).toBeGreaterThanOrEqual(LESSON_PRACTICE_POOL_MIN);
    }
  });

  it("mixes every rule into the test", () => {
    const loaded = loadCourse("to-be-present");
    const test = loaded.lessons.find((lesson) => lesson.slug === "test");
    const inTest = new Set(
      test?.blocks
        .filter((block) => block.type === "exercise")
        .map((block) => block.ruleId),
    );
    expect([...inTest].sort()).toEqual(
      loaded.rules.map((rule) => rule.id).sort(),
    );
  });
});

describe("irregular-verbs pack", () => {
  it("parses and groups the verbs by pattern", () => {
    const loaded = loadCourse("irregular-verbs");
    expect(loaded.course.titleRu).toBe("Неправильные глаголы");
    expect(loaded.course.level).toBe("A2");
    expect(loaded.lessons.map((lesson) => lesson.slug)).toEqual([
      "same",
      "two-alike",
      "vowel",
      "en",
      "special",
      "test",
    ]);
    expect(loaded.rules.map((rule) => rule.id).sort()).toEqual([
      "iv-after-did",
      "iv-en",
      "iv-no-ed",
      "iv-same",
      "iv-special",
      "iv-third-form",
      "iv-two-alike",
      "iv-vowel",
    ]);
  });

  it("mixes every rule into the test", () => {
    const loaded = loadCourse("irregular-verbs");
    const test = loaded.lessons.find((lesson) => lesson.slug === "test");
    const inTest = new Set(
      test?.blocks
        .filter((block) => block.type === "exercise")
        .map((block) => block.ruleId),
    );
    expect([...inTest].sort()).toEqual(
      loaded.rules.map((rule) => rule.id).sort(),
    );
  });

  /**
   * Same-form verbs (cut, put, hurt) make the dictionary form equal the
   * answer. The old placeholder leak-guard hid the cue in that case, which is
   * why this course would have been mute on those items. `gapCue` does not
   * filter; this assertion is that the content still names the verb.
   */
  it("names the verb on every gap, including where it equals the answer", () => {
    const loaded = loadCourse("irregular-verbs");
    const gaps = [
      ...loaded.lessons.flatMap((lesson) => lesson.blocks),
      ...loaded.bank,
    ].filter(
      (block): block is Extract<Exercise, { kind: "gap" }> =>
        block.type === "exercise" && block.kind === "gap",
    );

    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gapCue(gap), gap.id).not.toBeNull();
    }
  });
});

describe("catalog", () => {
  it("lists the three finished courses as available", () => {
    const catalog = loadCatalog();
    expect(listedAvailableSlugs(catalog)).toEqual([
      "present-simple",
      "to-be-present",
      "irregular-verbs",
    ]);
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

  it("has a pack for every available catalog slug", () => {
    for (const slug of listedAvailableSlugs()) {
      expect(() => loadCourse(slug)).not.toThrow();
    }
  });

  it("gives each live test at least twelve items", () => {
    for (const slug of listedAvailableSlugs()) {
      const loaded = loadCourse(slug);
      const test = loaded.lessons.find((lesson) => lesson.slug === "test");
      const pool = test?.blocks.filter((block) => block.type === "exercise") ?? [];
      expect(pool.length, slug).toBeGreaterThanOrEqual(TEST_SITTING_SIZE);
    }
  });

  it("gives every gap a dictionary-form cue that is not the inflected answer", () => {
    for (const slug of listedAvailableSlugs()) {
      const loaded = loadCourse(slug);
      const exercises = [
        ...loaded.lessons.flatMap((lesson) =>
          lesson.blocks.filter((block) => block.type === "exercise"),
        ),
        ...loaded.bank,
      ];
      for (const exercise of exercises) {
        if (exercise.kind !== "gap") continue;
        const cue = gapCue(exercise);
        expect(cue, `${slug}:${exercise.id}`).toBeTruthy();
        // `(do not play)` / `(doesn't drink)` — a cue that is the answer, with
        // a space or an apostrophe, is the shape that used to mute the question.
        const leaked = acceptedAnswers(exercise).some((item) => {
          const answer = item.trim().toLowerCase();
          return answer === cue!.trim().toLowerCase() && /['’\s]/.test(item);
        });
        expect(leaked, `${slug}:${exercise.id}`).toBe(false);
      }
    }
  });
});

describe("invariants", () => {
  it("parses a gap with an explicit cue and task", () => {
    const parsed = exerciseSchema.safeParse({
      type: "exercise",
      id: "x",
      ruleId: "ps-negative-dont",
      kind: "gap",
      prompt: "I ___ football.",
      cue: "play",
      task: "negative",
      answer: "don't play",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown gap task", () => {
    const parsed = exerciseSchema.safeParse({
      type: "exercise",
      id: "x",
      ruleId: "ps-negative-dont",
      kind: "gap",
      prompt: "I ___ football.",
      cue: "play",
      task: "passive",
      answer: "don't play",
    });
    expect(parsed.success).toBe(false);
  });

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

/**
 * Grammar Review deals one bank prompt per due rule and never repeats an
 * exercise inside a sitting, so "at least two bank exercises per lesson rule"
 * stopped being reserved capacity when that feature shipped: with one, a rule
 * missed twice would drill the prompt the learner just saw. The anchor is the
 * other runtime dependency — it is the whole explanation after a review miss,
 * where no lesson rule card is on screen.
 */
describe("review bank as a runtime dependency", () => {
  it("gives every missable rule a second prompt to come back with", () => {
    for (const slug of listedAvailableSlugs()) {
      const loaded = loadCourse(slug);
      const missable = new Set(
        loaded.lessons.flatMap((lesson) =>
          lesson.blocks
            .filter((block) => block.type === "exercise")
            .map((block) => block.ruleId),
        ),
      );
      for (const ruleId of missable) {
        const bank = loaded.bank.filter((item) => item.ruleId === ruleId);
        expect(bank.length, `${slug}/${ruleId}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("gives every rule an anchor to explain a review miss with", () => {
    for (const slug of listedAvailableSlugs()) {
      for (const rule of loadCourse(slug).rules) {
        expect(rule.anchorMd.trim(), `${slug}/${rule.id}`).not.toBe("");
      }
    }
  });
});
