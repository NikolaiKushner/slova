import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  isAppLocale,
  localeFromAcceptLanguage,
  negotiateLocale,
} from "@/lib/i18n/locale";

describe("isAppLocale", () => {
  it("accepts the two UI languages", () => {
    expect(isAppLocale("en")).toBe(true);
    expect(isAppLocale("ru")).toBe(true);
  });

  it("rejects the study-pair codes that are not a UI locale", () => {
    expect(isAppLocale("de")).toBe(false);
    expect(isAppLocale("en-GB")).toBe(false);
  });
});

describe("localeFromAcceptLanguage", () => {
  it("picks Russian when it is the strongest tag", () => {
    expect(localeFromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.8")).toBe("ru");
  });

  it("picks English when Russian is weaker", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,ru;q=0.3")).toBe("en");
  });

  it("falls back when nothing matches", () => {
    expect(localeFromAcceptLanguage("de-DE,fr;q=0.8")).toBe(DEFAULT_LOCALE);
    expect(localeFromAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
  });
});

describe("negotiateLocale", () => {
  it("lets the cookie win over the browser", () => {
    expect(negotiateLocale("en", "ru")).toBe("en");
    expect(negotiateLocale("ru", "en-US")).toBe("ru");
  });

  it("uses Accept-Language when there is no cookie", () => {
    expect(negotiateLocale(undefined, "ru,en;q=0.8")).toBe("ru");
  });
});
