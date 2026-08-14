import { describe, expect, it } from "vitest";
import { grammarCatalog } from "@/lib/courses/catalog";

describe("grammarCatalog", () => {
  it("puts Present Simple first and live on the A1 shelf", () => {
    const groups = grammarCatalog();
    expect(groups.map((group) => group.id)).toEqual(["a1", "a2", "b1"]);
    expect(groups[0]?.courses.map((course) => [course.slug, course.status])).toEqual([
      ["present-simple", "available"],
      ["to-be-present", "coming"],
      ["there-is", "coming"],
      ["present-continuous", "coming"],
      ["past-simple", "coming"],
      ["can", "coming"],
      ["have-got", "coming"],
      ["articles-a-the", "coming"],
    ]);
    expect(groups[0]?.courses[0]?.href).toBe("/courses/grammar/present-simple");
    expect(groups[0]?.courses[0]?.level).toBe("A1");
    expect(groups[0]?.courses[0]?.lessonCount).toBe(6);
    expect(groups[0]?.courses[1]?.href).toBeNull();
  });
});
