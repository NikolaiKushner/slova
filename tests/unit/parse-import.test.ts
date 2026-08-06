import { describe, expect, it } from "vitest";
import { parseImportText } from "@/lib/parse-import";

describe("parseImportText", () => {
  it("parses em-dash pairs", () => {
    const { cards, skipped } = parseImportText("hello — привет\nthanks — спасибо");
    expect(skipped).toBe(0);
    expect(cards).toEqual([
      { front: "hello", back: "привет" },
      { front: "thanks", back: "спасибо" },
    ]);
  });

  it("parses tabs and commas", () => {
    const { cards } = parseImportText("cat\tкот\ndog, собака");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({ front: "cat", back: "кот" });
    expect(cards[1]).toEqual({ front: "dog", back: "собака" });
  });

  it("skips header and bad lines", () => {
    const { cards, skipped } = parseImportText(
      "front,back\nonlyone\ngood - хорошо",
    );
    expect(cards).toEqual([{ front: "good", back: "хорошо" }]);
    expect(skipped).toBe(1);
  });
});
