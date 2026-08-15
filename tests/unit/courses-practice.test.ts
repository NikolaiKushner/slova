import { describe, expect, it } from "vitest";

import type { Exercise } from "@/content/courses/schema";
import {
  dealLessonPractice,
  LESSON_PRACTICE_SIZE,
  practiceSessionSize,
} from "@/lib/courses/practice";
import { seededRng } from "@/lib/practice/random";

function gap(id: string, ruleId: string): Exercise {
  return {
    type: "exercise",
    id,
    ruleId,
    kind: "gap",
    prompt: `${id} ___ here. (live)`,
    answer: "live",
  };
}

function choice(
  id: string,
  ruleId: string,
  options: string[],
): Extract<Exercise, { kind: "choice" }> {
  return {
    type: "exercise",
    id,
    ruleId,
    kind: "choice",
    prompt: `${id} ___ here.`,
    options,
    answer: options[0] ?? "live",
  };
}

describe("practiceSessionSize", () => {
  it("caps a regular lesson at eight and keeps the whole test", () => {
    expect(practiceSessionSize("forms", 16)).toBe(LESSON_PRACTICE_SIZE);
    expect(practiceSessionSize("forms", 6)).toBe(6);
    expect(practiceSessionSize("test", 12)).toBe(12);
  });
});

describe("dealLessonPractice", () => {
  const pool = [
    ...Array.from({ length: 8 }, (_, i) => gap(`a-${i}`, "rule-a")),
    ...Array.from({ length: 8 }, (_, i) => gap(`b-${i}`, "rule-b")),
  ];

  it("deals eight, covering both rules", () => {
    const dealt = dealLessonPractice(pool, {
      take: 8,
      rng: seededRng(1),
    });
    expect(dealt).toHaveLength(8);
    const rules = new Set(dealt.map((item) => item.ruleId));
    expect(rules).toEqual(new Set(["rule-a", "rule-b"]));
    expect(dealt.filter((item) => item.ruleId === "rule-a")).toHaveLength(4);
    expect(dealt.filter((item) => item.ruleId === "rule-b")).toHaveLength(4);
  });

  it("draws the same sitting from the same seed, a different sitting from another", () => {
    const first = dealLessonPractice(pool, { rng: seededRng(7) }).map(
      (item) => item.id,
    );
    const again = dealLessonPractice(pool, { rng: seededRng(7) }).map(
      (item) => item.id,
    );
    const other = dealLessonPractice(pool, { rng: seededRng(8) }).map(
      (item) => item.id,
    );
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it("keeps every item when the sitting is the whole pool", () => {
    const dealt = dealLessonPractice(pool, {
      take: pool.length,
      rng: seededRng(3),
    });
    expect(dealt.map((item) => item.id).sort()).toEqual(
      pool.map((item) => item.id).sort(),
    );
  });

  it("shuffles options without mutating the pool", () => {
    const original = ["live", "lives"] as const;
    const item = choice("c-1", "rule-a", [...original]);
    dealLessonPractice([item], { rng: seededRng(99) });
    expect(item.options).toEqual(["live", "lives"]);
  });
});
