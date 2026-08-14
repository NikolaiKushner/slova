import { describe, expect, it } from "vitest";
import {
  courseShouldComplete,
  lessonPassed,
  nextLessonRecord,
  scorePercent,
} from "@/lib/courses/progress";

const now = new Date("2026-08-14T08:00:00.000Z");

describe("scorePercent", () => {
  it("rounds a typical lesson", () => {
    expect(scorePercent(4, 5)).toBe(80);
    expect(scorePercent(0, 8)).toBe(0);
  });
});

describe("lessonPassed", () => {
  it("passes a regular lesson at 80 and a test at 90", () => {
    expect(lessonPassed(80, "forms")).toBe(true);
    expect(lessonPassed(79, "forms")).toBe(false);
    expect(lessonPassed(89, "test")).toBe(false);
    expect(lessonPassed(90, "test")).toBe(true);
  });
});

describe("nextLessonRecord", () => {
  it("marks 80% completed and keeps a later worse run completed", () => {
    const first = nextLessonRecord(null, 80, ["ps-third-person-s"], "forms", now);
    expect(first.status).toBe("completed");
    expect(first.attempts).toBe(1);
    expect(first.bestScore).toBe(80);

    const retry = nextLessonRecord(first, 50, [], "forms", now);
    expect(retry.status).toBe("completed");
    expect(retry.score).toBe(50);
    expect(retry.bestScore).toBe(80);
    expect(retry.attempts).toBe(2);
    expect(retry.missedRuleIds).toEqual(["ps-third-person-s"]);
  });

  it("does not complete a 79% first attempt", () => {
    const first = nextLessonRecord(null, 79, ["ps-base-form"], "forms", now);
    expect(first.status).toBe("in_progress");
    expect(first.completedAt).toBeNull();
    expect(first.attempts).toBe(1);
  });
});

describe("courseShouldComplete", () => {
  const allDone = [
    { slug: "forms", status: "completed" },
    { slug: "use", status: "completed" },
    { slug: "spelling", status: "completed" },
    { slug: "negatives", status: "completed" },
    { slug: "questions", status: "completed" },
    { slug: "test", status: "completed" },
  ];

  it("completes when every lesson including the test is done", () => {
    expect(courseShouldComplete(allDone)).toBe(true);
    expect(
      courseShouldComplete(
        allDone.map((lesson) =>
          lesson.slug === "forms"
            ? { ...lesson, status: "in_progress" }
            : lesson,
        ),
      ),
    ).toBe(false);
    expect(
      courseShouldComplete(
        allDone.map((lesson) =>
          lesson.slug === "test"
            ? { ...lesson, status: "in_progress" }
            : lesson,
        ),
      ),
    ).toBe(false);
  });
});
