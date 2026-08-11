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

describe("kindOf", () => {
  it("tells a phrase from a word by the space in it", () => {
    expect(kindOf("cat")).toBe("word");
    expect(kindOf("discharge summary")).toBe("phrase");
  });
});
