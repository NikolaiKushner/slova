import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

/**
 * The "last updated" line is written out in each catalogue rather than
 * formatted from a date, so that neither language reads like a filing. The
 * risk that buys is the two drifting apart — a document claiming one date in
 * English and another in Russian is worse than an ugly date — so the numbers
 * in the two strings have to match.
 */
describe("legal pages", () => {
  it("say the same last-updated day and year in both languages", () => {
    const digits = (line: string) => line.match(/\d+/g) ?? [];

    expect(digits(en.legal.updated)).toEqual(digits(ru.legal.updated));
    expect(digits(en.legal.updated)).toHaveLength(2);
  });

  it("say the same effective day and year in both languages", () => {
    const digits = (line: string) => line.match(/\d+/g) ?? [];

    expect(digits(en.legal.effective)).toEqual(digits(ru.legal.effective));
    expect(digits(en.legal.effective)).toHaveLength(2);
  });

  it("keeps the same keys in both catalogues", () => {
    expect(Object.keys(en.legal).sort()).toEqual(Object.keys(ru.legal).sort());
  });
});
