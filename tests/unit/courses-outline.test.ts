import { describe, expect, it } from "vitest";
import {
  courseOutline,
  lessonMinutes,
} from "@/lib/courses/course-view";

const presentSimple = [
  { slug: "forms", title: "Forms", titleRu: "Форма", estMinutes: 4 },
  { slug: "use", title: "Use", titleRu: "Употребление", estMinutes: 5 },
  { slug: "spelling", title: "Spelling", titleRu: "Орфография", estMinutes: 4 },
  { slug: "negatives", title: "Negatives", titleRu: "Отрицание", estMinutes: 4 },
  { slug: "questions", title: "Questions", titleRu: "Вопросы", estMinutes: 4 },
  { slug: "test", title: "Test", titleRu: "Проверка всего курса", estMinutes: 6 },
];

describe("lessonMinutes", () => {
  it("keeps the time written on the lesson, and falls back by kind", () => {
    expect(lessonMinutes({ slug: "use", title: "Use", titleRu: "Употребление", estMinutes: 5 })).toBe(5);
    expect(lessonMinutes({ slug: "forms", title: "Forms", titleRu: "Форма" })).toBe(4);
    expect(lessonMinutes({ slug: "test", title: "Test", titleRu: "Проверка" })).toBe(6);
  });
});

describe("courseOutline", () => {
  it("starts on the first lesson when nothing is done", () => {
    const view = courseOutline("present-simple", presentSimple, []);
    expect(view.state).toBe("fresh");
    expect(view.doneCount).toBe(0);
    expect(view.next?.slug).toBe("forms");
    expect(view.next?.badge).toBe("start");
    expect(view.lessons.map((row) => row.kind)).toEqual([
      "next",
      "todo",
      "todo",
      "todo",
      "todo",
      "todo",
    ]);
  });

  it("points continue at the first unfinished lesson in course order", () => {
    const view = courseOutline("present-simple", presentSimple, [
      "forms",
      "use",
      "spelling",
    ]);
    expect(view.state).toBe("progress");
    expect(view.doneCount).toBe(3);
    expect(view.progressPercent).toBe(50);
    expect(view.next?.slug).toBe("negatives");
    expect(view.next?.badge).toBe("continue");
    expect(view.lessons[2]?.kind).toBe("done");
    expect(view.lessons[3]?.kind).toBe("next");
  });

  it("marks a later lesson done without skipping past an earlier gap", () => {
    const view = courseOutline("present-simple", presentSimple, [
      "questions",
    ]);
    expect(view.state).toBe("progress");
    expect(view.next?.slug).toBe("forms");
    expect(view.lessons[0]?.kind).toBe("next");
    expect(view.lessons[4]?.kind).toBe("done");
  });

  it("treats the whole course as done and keeps a path back to the test", () => {
    const view = courseOutline(
      "present-simple",
      presentSimple,
      presentSimple.map((lesson) => lesson.slug),
    );
    expect(view.state).toBe("done");
    expect(view.next).toBeNull();
    expect(view.testHref).toBe("/courses/grammar/present-simple/test");
    expect(view.lessons.every((row) => row.kind === "done")).toBe(true);
  });
});
