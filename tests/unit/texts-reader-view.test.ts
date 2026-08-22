import { describe, expect, it } from "vitest";

import { lemmatize } from "@/lib/texts/lemma";
import { buildReaderParagraphs, uniqueKeys } from "@/lib/texts/reader-view";
import { parseText } from "@/lib/texts/tokenize";
import { LEARNED_INTERVAL_DAYS, type RatedWord } from "@/lib/word-rating";

const learned: RatedWord = {
  introducedAt: new Date("2026-01-01"),
  intervalDays: LEARNED_INTERVAL_DAYS,
};
const learning: RatedWord = {
  introducedAt: new Date("2026-08-01"),
  intervalDays: 2,
};

const read = (
  body: string,
  dictionary: Record<string, RatedWord> = {},
  translations: Record<string, string> = {},
) =>
  buildReaderParagraphs(
    parseText(body, lemmatize).paragraphs,
    new Map(Object.entries(dictionary)),
    new Map(Object.entries(translations)),
  );

const words = (body: string, dictionary?: Record<string, RatedWord>) =>
  read(body, dictionary)
    .flatMap((paragraph) => paragraph.segments)
    .flatMap((segment) => (segment.kind === "word" ? [segment.word] : []));

describe("buildReaderParagraphs", () => {
  it("puts the paragraph back together, punctuation and all", () => {
    const [paragraph] = read('He said: "two cities", then left.');
    const rebuilt = paragraph.segments
      .map((segment) => (segment.kind === "text" ? segment.text : segment.word.text))
      .join("");

    expect(rebuilt).toBe('He said: "two cities", then left.');
  });

  it("marks a word by the dictionary form, not the spelling in the text", () => {
    const [, went] = words("She went home.", { go: learned });

    expect(went).toMatchObject({ text: "went", lemma: "go", state: "known" });
  });

  it("separates learned, learning and absent", () => {
    const marked = words("Bread cheese apple.", {
      bread: learned,
      cheese: learning,
    });

    expect(marked.map((word) => word.state)).toEqual([
      "known",
      "learning",
      "absent",
    ]);
  });

  it("carries the shared-base translation when there is one", () => {
    const [paragraph] = read("cities", {}, { city: "город" });
    const [segment] = paragraph.segments;

    expect(segment.kind === "word" && segment.word.translation).toBe("город");
  });

  it("keeps every paragraph, in order", () => {
    expect(read("One.\nTwo.\nThree.").map((p) => p.id)).toEqual([0, 1, 2]);
  });
});

describe("uniqueKeys", () => {
  it("asks about the spelling and the dictionary form, once each", () => {
    const keys = uniqueKeys(parseText("Cities and cities.", lemmatize).paragraphs);

    expect([...keys].sort()).toEqual(["and", "cities", "city"]);
  });
});
