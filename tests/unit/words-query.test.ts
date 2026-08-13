import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  nextSort,
  pageCount,
  parseWordsQuery,
  wordsOrderBy,
  wordsSkip,
  wordsWhere,
} from "@/lib/words-query";
import { ratingLabel, ratingOf } from "@/lib/word-rating";

const parse = (search: string) => parseWordsQuery(new URLSearchParams(search));

describe("parseWordsQuery", () => {
  it("has usable defaults for a bare URL", () => {
    expect(DEFAULT_PAGE_SIZE).toBe(10);
    expect(parse("")).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      q: "",
      set: "",
      sort: "added",
      dir: "desc",
    });
  });

  it("never lets the page go below one", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-5").page).toBe(1);
    expect(parse("page=nonsense").page).toBe(1);
  });

  it("caps the page size, however large the URL asks for", () => {
    expect(parse("pageSize=1000").pageSize).toBe(MAX_PAGE_SIZE);
    expect(parse("pageSize=0").pageSize).toBe(1);
    expect(parse("pageSize=50").pageSize).toBe(50);
  });

  it("falls back to a real sort field when handed something else", () => {
    expect(parse("sort=DROP TABLE").sort).toBe("added");
    expect(parse("sort=rating").sort).toBe("rating");
  });

  it("defaults newest-first for dates and A-to-Z for text", () => {
    expect(parse("sort=added").dir).toBe("desc");
    expect(parse("sort=word").dir).toBe("asc");
    expect(parse("sort=word&dir=desc").dir).toBe("desc");
    expect(parse("sort=word&dir=sideways").dir).toBe("asc");
  });

  it("trims the search box", () => {
    expect(parse("q=%20%20cat%20%20").q).toBe("cat");
  });
});

describe("wordsWhere", () => {
  it("scopes to the user and nothing else by default", () => {
    expect(wordsWhere("u1", parse(""))).toEqual({ userId: "u1" });
  });

  it("searches both sides of the card", () => {
    const where = wordsWhere("u1", parse("q=cat")) as {
      OR: { front?: unknown; back?: unknown }[];
    };
    expect(where.OR).toHaveLength(2);
    expect(where.OR[0]).toHaveProperty("front");
    expect(where.OR[1]).toHaveProperty("back");
  });

  it("filters by set, and can ask for the words in none", () => {
    expect(wordsWhere("u1", parse("set=s1"))).toMatchObject({
      sets: { some: { setId: "s1" } },
    });
    expect(wordsWhere("u1", parse("set=none"))).toMatchObject({
      sets: { none: {} },
    });
  });
});

describe("wordsOrderBy", () => {
  it("orders by rating through the column it is derived from", () => {
    // Rating is a function of intervalDays and monotone in it, so the database
    // can sort by rating without the rating existing as a column.
    expect(wordsOrderBy(parse("sort=rating&dir=desc"))[0]).toEqual({
      intervalDays: "desc",
    });
  });

  it("always ends on a unique column, so pages cannot repeat a row", () => {
    for (const sort of ["word", "translation", "rating", "added"]) {
      const order = wordsOrderBy(parse(`sort=${sort}`));
      expect(order[order.length - 1]).toEqual({ id: "asc" });
    }
  });
});

describe("nextSort", () => {
  it("cycles unsorted → asc → desc → unsorted", () => {
    expect(nextSort("added", "desc", "word")).toEqual({
      sort: "word",
      dir: "asc",
    });
    expect(nextSort("word", "asc", "word")).toEqual({
      sort: "word",
      dir: "desc",
    });
    expect(nextSort("word", "desc", "word")).toEqual({ sort: "", dir: "" });
  });

  it("starts a different column from the beginning", () => {
    expect(nextSort("word", "desc", "rating")).toEqual({
      sort: "rating",
      dir: "asc",
    });
  });
});

describe("paging arithmetic", () => {
  it("skips whole pages", () => {
    expect(wordsSkip(parse("page=1"))).toBe(0);
    expect(wordsSkip(parse("page=3&pageSize=25"))).toBe(50);
  });

  it("counts pages, and an empty list is still one page", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(25, 25)).toBe(1);
    expect(pageCount(26, 25)).toBe(2);
  });
});

describe("ratingOf", () => {
  const day = 24 * 60 * 60 * 1000;
  const introduced = new Date(Date.now() - 30 * day);

  it("is 1 until the word has been studied at all", () => {
    expect(ratingOf({ introducedAt: null, intervalDays: 0 })).toBe(1);
    // Even if a schedule somehow exists, never studied means never known.
    expect(ratingOf({ introducedAt: null, intervalDays: 40 })).toBe(1);
  });

  it("climbs with the interval the scheduler is willing to wait", () => {
    expect(ratingOf({ introducedAt: introduced, intervalDays: 0 })).toBe(2);
    expect(ratingOf({ introducedAt: introduced, intervalDays: 5 })).toBe(3);
    expect(ratingOf({ introducedAt: introduced, intervalDays: 14 })).toBe(4);
    expect(ratingOf({ introducedAt: introduced, intervalDays: 21 })).toBe(5);
    expect(ratingOf({ introducedAt: introduced, intervalDays: 400 })).toBe(5);
  });

  it("puts the top of the scale exactly where the app says learned", () => {
    expect(ratingOf({ introducedAt: introduced, intervalDays: 20.9 })).toBe(4);
    expect(ratingOf({ introducedAt: introduced, intervalDays: 21 })).toBe(5);
  });

  it("has a word for every step", () => {
    for (const rating of [1, 2, 3, 4, 5] as const) {
      expect(ratingLabel(rating)).toBeTruthy();
    }
  });
});
