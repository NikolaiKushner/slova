import { describe, expect, it } from "vitest";
import {
  LANG_CODES,
  STUDY_SOURCE_LANG,
  STUDY_TARGET_LANG,
  langCodeSchema,
  toLangCode,
} from "@/lib/languages";

describe("language codes", () => {
  it("has no duplicates", () => {
    expect(new Set(LANG_CODES).size).toBe(LANG_CODES.length);
  });

  it("covers the direction the app teaches", () => {
    expect(LANG_CODES).toContain(STUDY_SOURCE_LANG);
    expect(LANG_CODES).toContain(STUDY_TARGET_LANG);
  });

  it("teaches two different languages", () => {
    expect(STUDY_SOURCE_LANG).not.toBe(STUDY_TARGET_LANG);
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
