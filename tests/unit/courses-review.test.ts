import { describe, expect, it } from "vitest";

import type { Exercise, Lesson } from "@/content/courses/schema";
import { loadCourse, type LoadedCourse } from "@/lib/courses/load";
import {
  buildGrammarReviewQueue,
  dueOnCalendarDay,
  GRAMMAR_REVIEW_BATCH_LIMIT,
  GRAMMAR_REVIEW_CLEAR_STAGE,
  lessonForRule,
  reviewEstimateMinutes,
  scheduleGrammarReview,
  scheduleLessonMiss,
  type WeakRuleRow,
} from "@/lib/courses/review";
import { seededRng } from "@/lib/practice/random";

const MOSCOW = "Europe/Moscow";
const rng = () => seededRng(42);

function bankItem(id: string, ruleId: string): Exercise {
  return {
    type: "exercise",
    id,
    ruleId,
    kind: "gap",
    prompt: `${id} ___ here. (live)`,
    answer: "live",
  };
}

function choiceItem(id: string, ruleId: string, options: string[]): Exercise {
  return {
    type: "exercise",
    id,
    ruleId,
    kind: "choice",
    prompt: `${id} ___ here.`,
    options,
    answer: options[0],
  };
}

function lesson(slug: string, blocks: Lesson["blocks"]): Lesson {
  return { slug, title: slug, titleRu: slug, blocks };
}

function course(input: {
  slug: string;
  ruleIds: string[];
  lessons?: Lesson[];
  bank?: Exercise[];
}): LoadedCourse {
  return {
    course: {
      slug: input.slug,
      title: `Course ${input.slug}`,
      titleRu: `Курс ${input.slug}`,
      level: "A1",
      estMinutes: 20,
      lessons: (input.lessons ?? []).map((item) => item.slug),
    },
    rules: input.ruleIds.map((id) => ({
      id,
      title: `Rule ${id}`,
      anchorMd: `Anchor for ${id}.`,
    })),
    lessons: input.lessons ?? [],
    bank:
      input.bank ??
      input.ruleIds.flatMap((id) => [
        bankItem(`${id}-b1`, id),
        bankItem(`${id}-b2`, id),
      ]),
  };
}

function row(
  memoryId: string,
  courseSlug: string,
  ruleId: string,
  lastExerciseId: string | null = null,
): WeakRuleRow {
  return { memoryId, courseSlug, ruleId, lastExerciseId };
}

describe("dueOnCalendarDay", () => {
  it("returns the start of the local day, not a 24-hour offset", () => {
    const late = new Date("2026-08-20T20:55:00.000Z"); // 23:55 in Moscow
    const due = dueOnCalendarDay(late, MOSCOW, 1);
    expect(due.toISOString()).toBe("2026-08-20T21:00:00.000Z");
  });

  it("crosses a DST boundary on the calendar, not on the clock", () => {
    // Europe/Berlin leaves summer time on 2026-10-25 at 03:00 local.
    const before = new Date("2026-10-24T10:00:00.000Z");
    const due = dueOnCalendarDay(before, "Europe/Berlin", 2);
    expect(due.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });

  it("falls back to UTC for an unknown zone", () => {
    const now = new Date("2026-08-20T10:00:00.000Z");
    expect(dueOnCalendarDay(now, "Mars/Olympus", 1).toISOString()).toBe(
      "2026-08-21T00:00:00.000Z",
    );
  });
});

describe("scheduleLessonMiss", () => {
  it("makes a new miss stage 0, due the next local day", () => {
    const now = new Date("2026-08-20T20:55:00.000Z");
    expect(scheduleLessonMiss(null, now, MOSCOW)).toEqual({
      stage: 0,
      dueAt: new Date("2026-08-20T21:00:00.000Z"),
    });
  });

  it("reactivates a cleared rule the next day", () => {
    const now = new Date("2026-08-20T09:00:00.000Z");
    const next = scheduleLessonMiss({ dueAt: null }, now, "UTC");
    expect(next.stage).toBe(0);
    expect(next.dueAt.toISOString()).toBe("2026-08-21T00:00:00.000Z");
  });

  it("never postpones a review that was already waiting", () => {
    const now = new Date("2026-08-20T09:00:00.000Z");
    const earlier = new Date("2026-08-20T00:00:00.000Z");
    expect(scheduleLessonMiss({ dueAt: earlier }, now, "UTC").dueAt).toEqual(
      earlier,
    );
  });

  it("pulls a distant review forward to tomorrow", () => {
    const now = new Date("2026-08-20T09:00:00.000Z");
    const later = new Date("2026-08-27T00:00:00.000Z");
    expect(
      scheduleLessonMiss({ dueAt: later }, now, "UTC").dueAt.toISOString(),
    ).toBe("2026-08-21T00:00:00.000Z");
  });
});

describe("scheduleGrammarReview", () => {
  const now = new Date("2026-08-20T09:00:00.000Z");

  it("spaces a correct answer by three days from stage 0", () => {
    expect(scheduleGrammarReview(0, true, now, "UTC")).toEqual({
      stage: 1,
      dueAt: new Date("2026-08-23T00:00:00.000Z"),
      cleared: false,
    });
  });

  it("spaces a correct answer by seven days from stage 1", () => {
    expect(scheduleGrammarReview(1, true, now, "UTC")).toEqual({
      stage: 2,
      dueAt: new Date("2026-08-27T00:00:00.000Z"),
      cleared: false,
    });
  });

  it("clears the rule on the third correct return", () => {
    expect(scheduleGrammarReview(2, true, now, "UTC")).toEqual({
      stage: GRAMMAR_REVIEW_CLEAR_STAGE,
      dueAt: null,
      cleared: true,
    });
  });

  it("sends a miss back to stage 0 and tomorrow, from any stage", () => {
    for (const stage of [0, 1, 2, 3]) {
      expect(scheduleGrammarReview(stage, false, now, "UTC")).toEqual({
        stage: 0,
        dueAt: new Date("2026-08-21T00:00:00.000Z"),
        cleared: false,
      });
    }
  });

  it("refuses a stage the model cannot produce", () => {
    expect(() => scheduleGrammarReview(-1, true, now, "UTC")).toThrow(RangeError);
    expect(() => scheduleGrammarReview(4, true, now, "UTC")).toThrow(RangeError);
    expect(() => scheduleGrammarReview(1.5, true, now, "UTC")).toThrow(RangeError);
  });
});

describe("buildGrammarReviewQueue", () => {
  const pack = course({ slug: "c1", ruleIds: ["r1", "r2", "r3"] });
  const resolve = (slug: string) => (slug === "c1" ? pack : null);

  it("asks each due rule exactly once", () => {
    const items = buildGrammarReviewQueue(
      [row("m1", "c1", "r1"), row("m2", "c1", "r1"), row("m3", "c1", "r2")],
      resolve,
      { rng: rng() },
    );
    expect(items.map((item) => item.ruleId)).toEqual(["r1", "r2"]);
  });

  it("stops at the batch limit, keeping the oldest due rules", () => {
    const many = course({
      slug: "big",
      ruleIds: Array.from({ length: 14 }, (_, i) => `r${i}`),
    });
    const items = buildGrammarReviewQueue(
      Array.from({ length: 14 }, (_, i) => row(`m${i}`, "big", `r${i}`)),
      (slug) => (slug === "big" ? many : null),
      { rng: rng() },
    );
    expect(items).toHaveLength(GRAMMAR_REVIEW_BATCH_LIMIT);
    expect(items[0].ruleId).toBe("r0");
    expect(items.at(-1)?.ruleId).toBe("r9");
  });

  it("skips a course that no longer exists without dropping the rest", () => {
    const items = buildGrammarReviewQueue(
      [row("m1", "gone", "r1"), row("m2", "c1", "r2")],
      resolve,
      { rng: rng() },
    );
    expect(items.map((item) => item.courseSlug)).toEqual(["c1"]);
  });

  it("skips a rule the course no longer declares", () => {
    const items = buildGrammarReviewQueue(
      [row("m1", "c1", "retired"), row("m2", "c1", "r1")],
      resolve,
      { rng: rng() },
    );
    expect(items.map((item) => item.ruleId)).toEqual(["r1"]);
  });

  it("draws only from the review bank", () => {
    const withLesson = course({
      slug: "c2",
      ruleIds: ["r1"],
      lessons: [lesson("forms", [bankItem("lesson-r1-1", "r1")])],
      bank: [bankItem("bank-r1-1", "r1"), bankItem("bank-r1-2", "r1")],
    });
    const items = buildGrammarReviewQueue(
      [row("m1", "c2", "r1")],
      () => withLesson,
      { rng: rng() },
    );
    expect(items[0].exercise.id).toMatch(/^bank-/);
  });

  it("avoids the prompt seen last time when the bank has another", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const items = buildGrammarReviewQueue(
        [row("m1", "c1", "r1", "r1-b1")],
        resolve,
        { rng: seededRng(seed) },
      );
      expect(items[0].exercise.id).toBe("r1-b2");
    }
  });

  it("still asks the only prompt a rule has", () => {
    const thin = course({
      slug: "thin",
      ruleIds: ["r1"],
      bank: [bankItem("only", "r1")],
    });
    const items = buildGrammarReviewQueue(
      [row("m1", "thin", "r1", "only")],
      () => thin,
      { rng: rng() },
    );
    expect(items[0].exercise.id).toBe("only");
  });

  it("shuffles choices without moving the answer", () => {
    const withChoice = course({
      slug: "ch",
      ruleIds: ["r1"],
      bank: [choiceItem("c-1", "r1", ["go", "goes", "going", "gone"])],
    });
    const items = buildGrammarReviewQueue(
      [row("m1", "ch", "r1")],
      () => withChoice,
      { rng: seededRng(7) },
    );
    const exercise = items[0].exercise;
    if (exercise.kind !== "choice") throw new Error("expected a choice");
    expect([...exercise.options].sort()).toEqual(
      ["go", "goes", "going", "gone"].sort(),
    );
    expect(exercise.options).toContain(exercise.answer);
    expect(exercise.answer).toBe("go");
  });

  it("carries the rule anchor and the course title for the miss panel", () => {
    const items = buildGrammarReviewQueue([row("m1", "c1", "r1")], resolve, {
      rng: rng(),
    });
    expect(items[0]).toMatchObject({
      memoryId: "m1",
      courseTitle: "Course c1",
      ruleTitle: "Rule r1",
      ruleAnchorMd: "Anchor for r1.",
    });
  });
});

describe("lessonForRule", () => {
  it("prefers the lesson that explains the rule", () => {
    const pack = course({
      slug: "c",
      ruleIds: ["r1"],
      lessons: [
        lesson("drill", [bankItem("d-1", "r1")]),
        lesson("theory", [
          { type: "explanation", ruleId: "r1", md: "Because." },
        ]),
      ],
    });
    expect(lessonForRule(pack, "r1")?.slug).toBe("theory");
  });

  it("falls back to a lesson that drills the rule", () => {
    const pack = course({
      slug: "c",
      ruleIds: ["r1"],
      lessons: [lesson("drill", [bankItem("d-1", "r1")])],
    });
    expect(lessonForRule(pack, "r1")?.slug).toBe("drill");
  });

  it("never sends the learner to the test", () => {
    const pack = course({
      slug: "c",
      ruleIds: ["r1"],
      lessons: [lesson("test", [bankItem("t-1", "r1")])],
    });
    expect(lessonForRule(pack, "r1")).toBeNull();
  });

  it("finds every live rule a lesson to open", () => {
    for (const slug of ["present-simple", "to-be-present", "irregular-verbs"]) {
      const loaded = loadCourse(slug);
      for (const rule of loaded.rules) {
        expect(lessonForRule(loaded, rule.id), `${slug}/${rule.id}`).not.toBeNull();
      }
    }
  });
});

describe("reviewEstimateMinutes", () => {
  it("reads as one minute a rule, capped at the batch", () => {
    expect(reviewEstimateMinutes(0)).toBe(1);
    expect(reviewEstimateMinutes(4)).toBe(4);
    expect(reviewEstimateMinutes(40)).toBe(GRAMMAR_REVIEW_BATCH_LIMIT);
  });
});
