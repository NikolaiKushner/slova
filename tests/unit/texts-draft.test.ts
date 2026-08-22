import { describe, expect, it } from "vitest";

import {
  MAX_TEXT_CHARS,
  MAX_TEXTS,
  MAX_TITLE_CHARS,
  titleFrom,
} from "@/lib/texts/draft";

describe("caps", () => {
  it("are the two numbers the route enforces", () => {
    expect(MAX_TEXT_CHARS).toBe(20_000);
    expect(MAX_TEXTS).toBe(20);
  });
});

describe("titleFrom", () => {
  it("takes the first line", () => {
    expect(titleFrom("A morning in Tbilisi\n\nIt was raining.")).toBe(
      "A morning in Tbilisi",
    );
  });

  it("skips the blank lines a paste starts with", () => {
    expect(titleFrom("\n\n  Real first line\nSecond.")).toBe("Real first line");
  });

  it("cuts a long first line at a word boundary", () => {
    const title = titleFrom(`${"word ".repeat(60)}end`);

    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_CHARS + 1);
    expect(title.endsWith("…")).toBe(true);
    expect(title).not.toContain("wor…");
  });

  it("is empty for an empty paste, so the caller can name it", () => {
    expect(titleFrom("   \n\n ")).toBe("");
  });
});
