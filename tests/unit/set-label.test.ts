import { describe, expect, it } from "vitest";

import { shortenSetTitle } from "@/lib/words/set-label";

describe("shortenSetTitle", () => {
  it("keeps a short name as written", () => {
    expect(shortenSetTitle("Medical")).toBe("Medical");
    expect(shortenSetTitle("Кухня")).toBe("Кухня");
  });

  it("collapses a long Russian title to initials", () => {
    expect(shortenSetTitle("Неправильные глаголы")).toBe("НГ");
  });

  it("collapses a long English title to initials", () => {
    expect(shortenSetTitle("irregular verbs")).toBe("IV");
  });

  it("skips tiny joining words", () => {
    expect(shortenSetTitle("Words of the week")).toBe("WW");
  });

  it("takes the first letters of a single long word", () => {
    expect(shortenSetTitle("Vocabularybuilder")).toBe("Voc");
  });
});
