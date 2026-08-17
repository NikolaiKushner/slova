import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { asVerbForms, parseVerbTable, verbTableAsWords } from "@/lib/lexicon/forms";

describe("asVerbForms", () => {
  it("reads the two forms a question needs", () => {
    expect(asVerbForms({ past: "went", participle: "gone" })).toEqual({
      past: "went",
      participle: "gone",
    });
  });

  it("keeps extra accepted past forms, minus a duplicate of the canonical one", () => {
    expect(
      asVerbForms({ past: "was", participle: "been", acceptPast: ["were", "was", ""] }),
    ).toEqual({
      past: "was",
      participle: "been",
      acceptPast: ["were"],
    });
  });

  it("returns nothing rather than a question with a blank to fill", () => {
    expect(asVerbForms(null)).toBeNull();
    expect(asVerbForms({ past: "went" })).toBeNull();
    expect(asVerbForms({ past: "", participle: "gone" })).toBeNull();
    expect(asVerbForms("went")).toBeNull();
  });

  it("keeps the gloss and table rank a question and an intro sitting need", () => {
    expect(
      asVerbForms({
        past: "lit",
        participle: "lit",
        gloss: "зажигать",
        family: "two-alike",
        rank: 0,
      }),
    ).toEqual({
      past: "lit",
      participle: "lit",
      gloss: "зажигать",
      family: "two-alike",
      rank: 0,
    });
  });
});

describe("parseVerbTable", () => {
  it("skips a broken line and keeps the next", () => {
    const entries = parseVerbTable(
      [
        "{not json",
        JSON.stringify({ text: "go", translation: "идти", past: "went", participle: "gone" }),
        JSON.stringify({ text: "cut", translation: "резать" }),
      ].join("\n"),
    );
    expect(entries).toEqual([
      {
        text: "go",
        key: "go",
        translation: "идти",
        forms: { past: "went", participle: "gone", gloss: "идти", rank: 0 },
      },
    ]);
  });

  it("reads the shipped table, including the one verb with two pasts", () => {
    const entries = parseVerbTable(
      readFileSync("content/lexicon/en-irregular-verbs.jsonl", "utf8"),
    );
    expect(entries.length).toBeGreaterThanOrEqual(90);
    const be = entries.find((entry) => entry.key === "be");
    expect(be?.forms.past).toBe("was");
    expect(be?.forms.participle).toBe("been");
    expect(be?.forms.acceptPast).toEqual(["were"]);
    expect(be?.forms.gloss).toBe("быть");
    expect(be?.forms.family).toBe("special");
    expect(be?.forms.rank).toBeGreaterThanOrEqual(0);

    const light = entries.find((entry) => entry.key === "light");
    expect(light?.forms.gloss).toBe("зажигать");
    expect(light?.forms).toMatchObject({ past: "lit", participle: "lit" });
    expect(entries.slice(0, 8).every((entry) => entry.forms.family === "same")).toBe(
      true,
    );
    expect(entries[0]?.text).toBe("cut");
  });
});

describe("verbTableAsWords", () => {
  it("turns the table into dictionary rows, infinitive and translation", () => {
    const rows = verbTableAsWords(
      JSON.stringify({
        text: "go",
        translation: "идти",
        past: "went",
        participle: "gone",
      }),
    );
    expect(rows).toEqual([{ front: "go", back: "идти" }]);
  });
});
