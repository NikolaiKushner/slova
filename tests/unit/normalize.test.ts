import { describe, expect, it } from "vitest";
import {
  cleanCell,
  decapitalize,
  looksTransliterated,
  matchCase,
  normalizeRow,
} from "@/lib/normalize";

describe("cleanCell", () => {
  it("drops the quote a pasted cell was wrapped in", () => {
    expect(cleanCell('"Collocations')).toBe("Collocations");
    expect(cleanCell('second opinion"')).toBe("second opinion");
  });

  it("drops list numbering", () => {
    expect(cleanCell("1.Поставьте диагноз.")).toBe("Поставьте диагноз");
    expect(cleanCell("1. Поставьте диагноз.")).toBe("Поставьте диагноз");
    expect(cleanCell("• make a diagnosis")).toBe("make a diagnosis");
  });

  it("drops the wiki anchor MyMemory sometimes returns", () => {
    expect(cleanCell("Фразеологизм#.D0.A4.D1.80.D0.B0.D0.B7")).toBe(
      "Фразеологизм",
    );
  });

  it("drops a sentence period", () => {
    expect(cleanCell("человеческим фактором.")).toBe("человеческим фактором");
    expect(cleanCell("за медицинской помощью.")).toBe("за медицинской помощью");
  });

  it("keeps a period that belongs to an acronym", () => {
    expect(cleanCell("MRI")).toBe("MRI");
  });

  it("keeps a decimal that only looks like numbering", () => {
    expect(cleanCell("1.5 litres")).toBe("1.5 litres");
  });

  it("collapses whitespace", () => {
    expect(cleanCell("  analyze   medical  images ")).toBe(
      "analyze medical images",
    );
  });

  it("leaves a clean word untouched", () => {
    expect(cleanCell("healthcare")).toBe("healthcare");
  });
});

describe("decapitalize", () => {
  it("lowercases a line-initial capital", () => {
    expect(decapitalize("Прогнозировать")).toBe("прогнозировать");
  });

  it("keeps an acronym", () => {
    expect(decapitalize("MRI")).toBe("MRI");
    expect(decapitalize("ИИ")).toBe("ИИ");
  });

  it("keeps a phrase holding a name", () => {
    expect(decapitalize("New York")).toBe("New York");
  });

  it("is safe on an empty string", () => {
    expect(decapitalize("")).toBe("");
  });
});

describe("matchCase", () => {
  it("lowercases the translation when the English is lowercase", () => {
    expect(matchCase("predict", "Прогнозировать")).toBe("прогнозировать");
    expect(matchCase("artificial intelligence", "Искусственный интеллект")).toBe(
      "искусственный интеллект",
    );
  });

  it("keeps the translation capitalised when the English is a name", () => {
    expect(matchCase("Paris", "Париж")).toBe("Париж");
  });

  it("keeps a Cyrillic acronym", () => {
    expect(matchCase("ai", "ИИ")).toBe("ИИ");
  });
});

describe("looksTransliterated", () => {
  it("flags Latin script where Russian belongs", () => {
    expect(looksTransliterated("ISTORIIA BOLEZNI")).toBe(true);
  });

  it("accepts a Russian translation", () => {
    expect(looksTransliterated("история болезни")).toBe(false);
  });

  it("accepts Russian carrying a Latin term", () => {
    expect(looksTransliterated("рентген X-ray снимок")).toBe(false);
  });

  it("says nothing about an empty value", () => {
    expect(looksTransliterated("")).toBe(false);
  });
});

describe("normalizeRow", () => {
  it("cleans both sides of a pasted row", () => {
    expect(normalizeRow(' "Collocations', "Фразеологизм#.D0.A4")).toEqual({
      front: "collocations",
      back: "фразеологизм",
    });
  });

  it("fixes the case the translator invented", () => {
    expect(normalizeRow("save lives", "Спасение жизней.")).toEqual({
      front: "save lives",
      back: "спасение жизней",
    });
  });

  /*
   * The reason the add path folds case with this rather than toLowerCase: a
   * capital that belongs to the word is part of its spelling, and the spelling
   * shown in the dictionary is the one that gets learned.
   */
  it("keeps the capitals that belong to the words", () => {
    expect(normalizeRow("MRI scan", "МРТ")).toEqual({
      front: "MRI scan",
      back: "МРТ",
    });
    expect(normalizeRow("New York", "Нью-Йорк")).toEqual({
      front: "New York",
      back: "Нью-Йорк",
    });
  });

  it("drops the capital a phone keyboard added to the translation", () => {
    expect(normalizeRow("cat", "Кот")).toEqual({ front: "cat", back: "кот" });
  });

  /** Adding a word a second time must not walk its spelling further. */
  it("leaves an already normalised row alone", () => {
    const once = normalizeRow("Medical records", "Медицинские записи");
    expect(normalizeRow(once.front, once.back)).toEqual(once);
  });
});
