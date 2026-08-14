import { describe, expect, it } from "vitest";
import { CONFIRMATIONS_TO_PUBLISH, promote } from "@/lib/lexicon/write";
import { pickTranslation } from "@/lib/lexicon/lookup";

describe("promote", () => {
  it("keeps a typed translation private until something agrees", () => {
    const first = promote(null, "import");
    expect(first).toEqual({ confirmations: 1, isGlobal: false });
  });

  it("publishes it once a second source produces the same text", () => {
    const first = promote(null, "import");
    const second = promote(first, "import");
    expect(second.confirmations).toBe(CONFIRMATIONS_TO_PUBLISH);
    expect(second.isGlobal).toBe(true);
  });

  it("does not let the same person confirm twice", () => {
    const first = promote(null, "import");
    expect(promote(first, "import", true)).toEqual({
      confirmations: 1,
      isGlobal: false,
    });
  });

  it("counts the model as that second source", () => {
    const candidate = promote(null, "import");
    expect(candidate.isGlobal).toBe(false);
    expect(promote(candidate, "llm").isGlobal).toBe(true);
  });

  it("does not publish a model answer on its own", () => {
    expect(promote(null, "llm")).toEqual({ confirmations: 1, isGlobal: false });
  });

  it("trusts a seed and a curated entry on their own", () => {
    for (const source of ["seed", "curated"] as const) {
      expect(promote(null, source)).toEqual({ confirmations: 1, isGlobal: true });
    }
  });

  it("never takes a published translation back out of the base", () => {
    const published = { confirmations: 5, isGlobal: true };
    expect(promote(published, "import").isGlobal).toBe(true);
  });

  it("counts a different wording separately", () => {
    // Two different texts are two rows, so each starts its own count — the
    // caller looks up by text, and a disagreement is not a confirmation.
    expect(promote(null, "import").confirmations).toBe(1);
  });
});

describe("pickTranslation", () => {
  const t = (text: string, source: string, isPrimary = false) => ({
    text,
    source,
    isPrimary,
  });

  it("answers with nothing when there is nothing usable", () => {
    expect(pickTranslation([])).toBeNull();
    // An empty translation is the model declining, not an answer.
    expect(pickTranslation([t("   ", "llm")])).toBeNull();
  });

  it("prefers the one marked primary", () => {
    const chosen = pickTranslation([t("а", "llm"), t("б", "seed", true)]);
    expect(chosen?.text).toBe("б");
  });

  it("falls back to the most trusted source", () => {
    const chosen = pickTranslation([
      t("из импорта", "import"),
      t("от модели", "llm"),
      t("вручную", "curated"),
    ]);
    expect(chosen?.text).toBe("вручную");
  });

  it("does not let an unknown source outrank a known one", () => {
    const chosen = pickTranslation([t("хорошо", "seed"), t("откуда-то", "mystery")]);
    expect(chosen?.text).toBe("хорошо");
  });
});
