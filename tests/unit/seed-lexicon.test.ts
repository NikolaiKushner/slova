import { describe, expect, it } from "vitest";
import { kindOf, parseDataset } from "@/lib/lexicon/dataset";
import { normalizeKey } from "@/lib/lexicon/key";

const line = (text: string, translation: string) =>
  JSON.stringify({ text, translation });

describe("parseDataset", () => {
  it("reads well-formed lines", () => {
    const { entries, warnings } = parseDataset(
      [line("cat", "кот"), line("house", "дом")].join("\n"),
    );
    expect(warnings).toEqual([]);
    expect(entries).toEqual([
      { text: "cat", key: "cat", translation: "кот" },
      { text: "house", key: "house", translation: "дом" },
    ]);
  });

  it("skips a broken line and keeps going", () => {
    const { entries, warnings } = parseDataset(
      [line("cat", "кот"), "{not json", line("house", "дом")].join("\n"),
    );
    expect(entries.map((e) => e.key)).toEqual(["cat", "house"]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ line: 2, reason: "not JSON" });
  });

  it("skips a line missing a field rather than storing undefined", () => {
    const { entries, warnings } = parseDataset(
      [JSON.stringify({ text: "cat" }), line("house", "дом")].join("\n"),
    );
    expect(entries.map((e) => e.key)).toEqual(["house"]);
    expect(warnings[0].reason).toContain("both be strings");
  });

  it("ignores blank lines without complaining about them", () => {
    const { entries, warnings } = parseDataset(
      ["", line("cat", "кот"), "   ", ""].join("\n"),
    );
    expect(entries).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it("collapses duplicate keys, keeping the first — the list is frequency-ordered", () => {
    const { entries, warnings } = parseDataset(
      [line("Cat", "кот"), line("cat", "кошка"), line(" CAT ", "кошак")].join("\n"),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].translation).toBe("кот");
    expect(warnings).toHaveLength(2);
    expect(warnings[1].reason).toContain("duplicate of line 1");
  });

  it("drops a word the model declined instead of caching the blank", () => {
    // Measured against the live API: `was/were` comes back with an empty
    // translation. Stored, it would count as a hit forever.
    const { entries, warnings } = parseDataset(
      [line("was/were", ""), line("cat", "кот")].join("\n"),
    );
    expect(entries.map((e) => e.key)).toEqual(["cat"]);
    expect(warnings[0].reason).toContain("declined");
  });

  it("rejects a translation that is not in the target script", () => {
    // All three happened in the first generated set: Chinese instead of
    // Russian, and the English word handed straight back.
    const { entries, warnings } = parseDataset(
      [
        line("estimated", "估计"),
        line("shareware", "shareware"),
        line("cat", "кот"),
      ].join("\n"),
    );
    expect(entries.map((e) => e.key)).toEqual(["cat"]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0].reason).toContain("target script");
  });

  it("keeps a translation that merely contains a Latin acronym", () => {
    const { entries } = parseDataset(line("dna test", "тест ДНК"));
    expect(entries).toHaveLength(1);
  });

  it("keys by the same rules the runtime looks up by", () => {
    const { entries } = parseDataset(line('  "Medical Records."  ', "истории болезни"));
    expect(entries[0].key).toBe(normalizeKey("medical records"));
  });

  it("cleans the artefacts a generated file can carry", () => {
    const { entries } = parseDataset(line("cat.", "кот,"));
    expect(entries[0]).toMatchObject({ text: "cat", translation: "кот" });
  });

  it("does not lowercase a translation whose source is a proper noun", () => {
    const { entries } = parseDataset(line("Paris", "Париж"));
    expect(entries[0].translation).toBe("Париж");
  });
});

describe("parseDataset — enrichment fields", () => {
  const enriched = (extra: Record<string, unknown>) =>
    JSON.stringify({ text: "water", translation: "вода", ...extra });

  it("reads a v1 line, which carries neither field, without complaint", () => {
    const { entries, dropped } = parseDataset(line("cat", "кот"));
    expect(entries[0]).toEqual({ text: "cat", key: "cat", translation: "кот" });
    expect(dropped).toEqual({ transcription: 0, partOfSpeech: 0 });
  });

  it("keeps a transcription and a known part of speech", () => {
    const { entries, dropped } = parseDataset(
      enriched({ transcription: "ˈwɔːtər", partOfSpeech: "noun" }),
    );
    expect(entries[0]).toMatchObject({
      transcription: "ˈwɔːtər",
      partOfSpeech: "noun",
    });
    expect(dropped).toEqual({ transcription: 0, partOfSpeech: 0 });
  });

  it("strips the slashes and brackets a transcription may be wrapped in", () => {
    const slashes = parseDataset(enriched({ transcription: "/ˈwɔːtər/" }));
    const brackets = parseDataset(enriched({ transcription: "[ˈwɔːtər]" }));
    expect(slashes.entries[0].transcription).toBe("ˈwɔːtər");
    expect(brackets.entries[0].transcription).toBe("ˈwɔːtər");
  });

  /**
   * The empty string is the model's documented way of declining the field, so
   * it is an answer rather than a failure — nothing is dropped and nothing is
   * counted. Storing it would put a blank in the column, which reads as "we
   * looked and there is none".
   */
  it("treats an empty field as a decline, not as a value or a drop", () => {
    const { entries, dropped } = parseDataset(
      enriched({ transcription: "", partOfSpeech: "" }),
    );
    expect(entries[0].transcription).toBeUndefined();
    expect(entries[0].partOfSpeech).toBeUndefined();
    expect(dropped).toEqual({ transcription: 0, partOfSpeech: 0 });
  });

  it("drops a part of speech outside the vocabulary and counts it", () => {
    const { entries, dropped } = parseDataset(enriched({ partOfSpeech: "gerund" }));
    expect(entries).toHaveLength(1);
    expect(entries[0].partOfSpeech).toBeUndefined();
    expect(dropped.partOfSpeech).toBe(1);
  });

  it("accepts a part of speech the model capitalised", () => {
    const { entries, dropped } = parseDataset(enriched({ partOfSpeech: "Noun" }));
    expect(entries[0].partOfSpeech).toBe("noun");
    expect(dropped.partOfSpeech).toBe(0);
  });

  it("drops a transcription written in the wrong alphabet", () => {
    // The failure this mirrors is real on the translation side: the model
    // answering in Cyrillic where IPA was asked for.
    const { entries, dropped } = parseDataset(enriched({ transcription: "вода" }));
    expect(entries[0].transcription).toBeUndefined();
    expect(dropped.transcription).toBe(1);
  });

  /**
   * The prose an unsure model writes instead of IPA is shorter than a
   * transcribed phrase, so a length limit does not catch it. What does is the
   * alphabet: English IPA always reaches outside plain ASCII, and a
   * respelling never does.
   */
  it("drops a plain-ASCII respelling, which is prose and not IPA", () => {
    const { entries, dropped } = parseDataset(
      enriched({ transcription: "roughly wah-ter" }),
    );
    expect(entries[0].transcription).toBeUndefined();
    expect(dropped.transcription).toBe(1);
  });

  it("keeps a short monosyllable, which carries no stress mark", () => {
    const { entries, dropped } = parseDataset(
      JSON.stringify({ text: "cat", translation: "кот", transcription: "kæt" }),
    );
    expect(entries[0].transcription).toBe("kæt");
    expect(dropped.transcription).toBe(0);
  });

  it("drops a transcription long enough to be an explanation", () => {
    const { entries, dropped } = parseDataset(
      enriched({
        transcription: "ˈwɔːtər — but the second vowel reduces in fast speech, roughly",
      }),
    );
    expect(entries[0].transcription).toBeUndefined();
    expect(dropped.transcription).toBe(1);
  });

  /** A bad field costs the field, never the word — the translation still lands. */
  it("keeps the entry when only an enrichment field is unusable", () => {
    const { entries, warnings } = parseDataset(
      enriched({ transcription: "вода", partOfSpeech: "gerund" }),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].translation).toBe("вода");
    expect(warnings).toEqual([]);
  });
});

describe("kindOf", () => {
  it("tells a phrase from a word by the space in it", () => {
    expect(kindOf("cat")).toBe("word");
    expect(kindOf("discharge summary")).toBe("phrase");
  });
});
