import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOURCE_LANG,
  DEFAULT_TARGET_LANG,
  LANG_CODES,
  LANG_OPTIONS,
  langCodeSchema,
  toLangCode,
} from "@/lib/languages";

describe("language options", () => {
  it("offers a label for every code", () => {
    expect(LANG_OPTIONS.map((o) => o.code)).toEqual([...LANG_CODES]);
  });

  it("has no duplicate codes", () => {
    expect(new Set(LANG_CODES).size).toBe(LANG_CODES.length);
  });

  it("can offer both defaults", () => {
    const codes = LANG_OPTIONS.map((o) => o.code);
    expect(codes).toContain(DEFAULT_SOURCE_LANG);
    expect(codes).toContain(DEFAULT_TARGET_LANG);
  });
});

describe("langCodeSchema", () => {
  it("accepts a supported code", () => {
    expect(langCodeSchema.safeParse("de").success).toBe(true);
  });

  it("rejects an unsupported one", () => {
    expect(langCodeSchema.safeParse("jp").success).toBe(false);
  });
});

describe("toLangCode", () => {
  it("passes a known code through", () => {
    expect(toLangCode("fr", "en")).toBe("fr");
  });

  it("falls back on a value the database should not hold", () => {
    expect(toLangCode("klingon", "en")).toBe("en");
  });
});
