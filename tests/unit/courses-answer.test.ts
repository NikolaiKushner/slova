import { describe, expect, it } from "vitest";
import { gradeExercise, normalizeGrammarAnswer } from "@/lib/courses/answer";
import type { Exercise } from "@/content/courses/schema";

const gap = {
  type: "exercise",
  id: "t-gap",
  ruleId: "ps-third-person-s",
  kind: "gap",
  prompt: "She ___ here. (live)",
  answer: "lives",
} as const satisfies Exercise;

const negative = {
  type: "exercise",
  id: "t-neg",
  ruleId: "ps-negative-doesnt",
  kind: "gap",
  prompt: "He ___ like tea. (does not)",
  answer: "doesn't",
  accept: ["does not"],
} as const satisfies Exercise;

describe("normalizeGrammarAnswer", () => {
  it("folds case and extra spaces, and keeps the apostrophe", () => {
    expect(normalizeGrammarAnswer("  Doesn't  ")).toBe("doesn't");
  });
});

describe("gradeExercise", () => {
  it("accepts a listed variant, not an edit-distance neighbour", () => {
    expect(gradeExercise(negative, "does not")).toBe("correct");
    expect(gradeExercise(negative, "doesn't")).toBe("correct");
    expect(gradeExercise(negative, "Doesn't")).toBe("correct");
  });

  it("treats likes vs like as wrong, not almost", () => {
    expect(gradeExercise(gap, "like")).toBe("wrong");
    expect(gradeExercise(gap, "lives")).toBe("correct");
    expect(gradeExercise(gap, "Lives")).toBe("correct");
  });

  it("ignores a trailing full stop on a whole sentence", () => {
    const transform = {
      type: "exercise",
      id: "t-tr",
      ruleId: "ps-negative-doesnt",
      kind: "transform",
      prompt: "Сделайте отрицание.",
      source: "She works here.",
      answer: "She doesn't work here.",
      accept: ["She does not work here."],
    } satisfies Exercise;
    expect(gradeExercise(transform, "She doesn't work here")).toBe("correct");
    expect(gradeExercise(transform, "She does not work here")).toBe("correct");
  });

  it("accepts be-contraction variants listed on the item", () => {
    const transform = {
      type: "exercise",
      id: "t-be-neg",
      ruleId: "tb-negative",
      kind: "transform",
      prompt: "Сделайте отрицание.",
      source: "She is tired.",
      answer: "She isn't tired.",
      accept: ["She is not tired.", "She's not tired."],
    } satisfies Exercise;
    expect(gradeExercise(transform, "She isn't tired")).toBe("correct");
    expect(gradeExercise(transform, "She is not tired")).toBe("correct");
    expect(gradeExercise(transform, "She's not tired")).toBe("correct");
    expect(gradeExercise(transform, "She doesn't is tired")).toBe("wrong");
  });
});
