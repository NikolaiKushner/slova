import { describe, expect, it } from "vitest";
import { grammarCatalog } from "@/lib/courses/catalog";

describe("grammarCatalog", () => {
  it("puts Present Simple first and live, the next three as coming", () => {
    const [group] = grammarCatalog();
    expect(group?.courses.map((course) => [course.slug, course.status])).toEqual([
      ["present-simple", "available"],
      ["to-be-present", "coming"],
      ["present-continuous", "coming"],
      ["past-simple", "coming"],
    ]);
    expect(group?.courses[0]?.href).toBe("/courses/grammar/present-simple");
    expect(group?.courses[1]?.href).toBeNull();
  });
});
