import { describe, expect, it } from "vitest";
import { groupTheoryBlocks } from "@/components/courses/block-view";

describe("groupTheoryBlocks", () => {
  it("keeps the lead together until a heading, pitfall or recap", () => {
    const groups = groupTheoryBlocks([
      { type: "explanation", md: "lead" },
      { type: "example", en: "I walk.", ru: "Я хожу." },
      { type: "heading", title: "Facts" },
      { type: "explanation", md: "facts" },
      { type: "example", en: "Water freezes.", ru: "Вода замерзает." },
      { type: "pitfall", md: "slip" },
      { type: "heading", title: "Коротко" },
      { type: "recap", items: [{ k: "a", v: "b" }] },
    ]);

    expect(groups.map((group) => group.map((block) => block.type))).toEqual([
      ["explanation", "example"],
      ["heading", "explanation", "example"],
      ["pitfall"],
      ["heading", "recap"],
    ]);
  });
});
