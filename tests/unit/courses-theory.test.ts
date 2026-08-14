import { describe, expect, it } from "vitest";
import { groupTheoryBlocks } from "@/components/courses/block-view";

describe("groupTheoryBlocks", () => {
  it("keeps examples with the explanation above them", () => {
    const groups = groupTheoryBlocks([
      { type: "explanation", md: "habits" },
      { type: "example", en: "I walk.", ru: "Я хожу." },
      { type: "example", en: "She plays.", ru: "Она играет." },
      { type: "explanation", md: "facts" },
      { type: "example", en: "Water freezes.", ru: "Вода замерзает." },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.map((block) => block.type)).toEqual([
      "explanation",
      "example",
      "example",
    ]);
    expect(groups[1]?.map((block) => block.type)).toEqual([
      "explanation",
      "example",
    ]);
  });
});
