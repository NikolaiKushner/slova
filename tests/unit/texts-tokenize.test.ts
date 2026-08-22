import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { coverageOf, readabilityOf } from "@/lib/texts/coverage";
import { assumedKnown, knownKeys } from "@/lib/texts/known-words";
import { lemmatize } from "@/lib/texts/lemma";
import { parseText, splitParagraphs, tokenSpans } from "@/lib/texts/tokenize";

const fixture = (name: string) =>
  readFileSync(
    path.join(process.cwd(), "tests/fixtures/texts", `${name}.txt`),
    "utf8",
  );

const surfaces = (text: string) =>
  tokenSpans(text).map((span) => text.slice(span.start, span.end));

const lemmasOf = (body: string) => {
  const parsed = parseText(body, lemmatize);
  return new Map(
    parsed.paragraphs.flatMap((paragraph) =>
      paragraph.tokens.map((token) => [
        paragraph.text.slice(token.start, token.end),
        token.lemma,
      ]),
    ),
  );
};

describe("tokenSpans", () => {
  it("keeps a contraction and a hyphenated compound whole", () => {
    expect(surfaces("He doesn't use e-mail, it is well-known.")).toEqual([
      "He",
      "doesn't",
      "use",
      "e-mail",
      "it",
      "is",
      "well-known",
    ]);
  });

  it("does not turn a decade into a word", () => {
    expect(surfaces("Built in the 1990s, rebuilt in 2011.")).toEqual([
      "Built",
      "in",
      "the",
      "rebuilt",
      "in",
    ]);
  });

  it("slices back to exactly what it matched", () => {
    const text = "Anna's mother said: “two cities”, then left.";
    for (const span of tokenSpans(text)) {
      expect(text.slice(span.start, span.end)).toMatch(/^\p{L}/u);
    }
  });
});

describe("splitParagraphs", () => {
  it("keeps one paragraph per non-empty line", () => {
    expect(splitParagraphs("One.\n\n  Two.  \n\nThree.\n")).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
  });
});

describe("parseText", () => {
  it("counts every running word", () => {
    expect(parseText(fixture("a2-narrative")).wordCount).toBe(58);
    expect(parseText(fixture("news-paragraph")).wordCount).toBe(54);
  });

  it("works without a lemmatizer, key as its own lemma", () => {
    const parsed = parseText("She went home.");
    expect(parsed.paragraphs[0].tokens.map((token) => token.lemma)).toEqual([
      "she",
      "went",
      "home",
    ]);
  });
});

describe("lemmatize", () => {
  it("resolves the irregulars the coverage number depends on", () => {
    const lemmas = lemmasOf(fixture("a2-narrative"));

    expect(lemmas.get("went")).toBe("go");
    expect(lemmas.get("cities")).toBe("city");
    expect(lemmas.get("children")).toBe("child");
    expect(lemmas.get("saw")).toBe("see");
    expect(lemmas.get("slept")).toBe("sleep");
  });

  it("leaves a contraction and a compound as themselves", () => {
    const lemmas = lemmasOf(fixture("news-paragraph"));

    expect(lemmas.get("doesn't")).toBe("doesn't");
    expect(lemmas.get("e-mail")).toBe("e-mail");
    expect(lemmas.get("well-known")).toBe("well-known");
  });

  it("does not read a noun as the verb it spells like", () => {
    expect(lemmasOf("He bought a saw.").get("saw")).toBe("saw");
    expect(lemmasOf("She saw the bridge.").get("saw")).toBe("see");
  });
});

/**
 * The A1 words of the narrative, listed so the misses can be checked by
 * reading it: only the name Anna, twice, and "tired" are outside this.
 */
const A2_DICTIONARY = new Set([
  "the", "a", "and", "to", "in", "they", "her", "with", "but", "at", "about",
  "under", "near", "back", "well", "last", "summer", "two", "old", "small",
  "family", "child", "bread", "cheese", "shop", "tree", "lunch", "evening",
  "hotel", "city", "go", "see", "buy", "eat", "come", "sleep", "talk", "be",
  "trip", "river", "bridge", "station",
]);

describe("coverageOf", () => {
  it("matches the hand count on the narrative", () => {
    const coverage = coverageOf(
      parseText(fixture("a2-narrative"), lemmatize),
      A2_DICTIONARY,
    );

    expect(coverage.running).toBe(58);
    expect(coverage.runningKnown).toBe(55);
    expect(coverage.percent).toBeCloseTo((55 / 58) * 100, 1);
  });

  it("counts a word the reader has, whatever the lemmatizer made of it", () => {
    const parsed = parseText("The data is personal.", lemmatize);

    expect(parsed.paragraphs[0].tokens[1].lemma).toBe("datum");
    expect(coverageOf(parsed, new Set(["data"])).runningKnown).toBe(1);
  });

  it("counts every running word, repeats included", () => {
    const coverage = coverageOf(
      parseText("The cat and the cat.", lemmatize),
      new Set(["the"]),
    );

    expect(coverage.running).toBe(5);
    expect(coverage.runningKnown).toBe(2);
    expect(coverage.unique).toBe(3);
    expect(coverage.uniqueKnown).toBe(1);
  });

  it("is zero, not NaN, for a text with no words", () => {
    expect(coverageOf(parseText("1234 —"), new Set()).percent).toBe(0);
  });
});

describe("readabilityOf", () => {
  it("draws the lines where the research does", () => {
    expect(readabilityOf(94.9)).toBe("hard");
    expect(readabilityOf(95)).toBe("withHelp");
    expect(readabilityOf(97.9)).toBe("withHelp");
    expect(readabilityOf(98)).toBe("readable");
    expect(readabilityOf(100)).toBe("readable");
  });
});

describe("assumedKnown", () => {
  it("is the commonest words, so the thresholds mean something", () => {
    const known = assumedKnown();

    expect(known.has("the")).toBe(true);
    expect(known.has("under")).toBe(true);
    expect(known.has("spokeswoman")).toBe(false);
  });

  it("keeps the two words the source list drops", () => {
    expect(assumedKnown().has("a")).toBe(true);
    expect(assumedKnown().has("i")).toBe(true);
  });

  it("carries most of a narrative on its own, and the dictionary does the rest", () => {
    const parsed = parseText(fixture("a2-narrative"), lemmatize);
    const content = [
      "summer", "bridge", "river", "bread", "cheese", "station", "eat",
      "lunch", "tree", "talk", "trip", "evening", "sleep", "anna", "tired",
      "near",
    ].map((key) => ({ key }));

    expect(coverageOf(parsed, new Set()).percent).toBeLessThan(1);
    expect(coverageOf(parsed, assumedKnown()).percent).toBeGreaterThan(70);
    expect(coverageOf(parsed, knownKeys(content)).percent).toBe(100);
  });
});
