import { describe, expect, it } from "vitest";
import { endingAgainst, splitGapPrompt } from "@/lib/courses/prompt";

describe("splitGapPrompt", () => {
  it("splits on underscores and lifts a trailing hint", () => {
    expect(splitGapPrompt("She ___ in London.")).toEqual({
      before: "She ",
      after: " in London.",
      hint: null,
      hasGap: true,
    });
    expect(splitGapPrompt("She ___ to school. (go)")).toEqual({
      before: "She ",
      after: " to school.",
      hint: "go",
      hasGap: true,
    });
    expect(splitGapPrompt("___ you live here?")).toEqual({
      before: "",
      after: " you live here?",
      hint: null,
      hasGap: true,
    });
  });

  it("leaves a prompt without a gap as a single line", () => {
    expect(splitGapPrompt("Какое предложение верное?")).toEqual({
      before: "Какое предложение верное?",
      after: "",
      hint: null,
      hasGap: false,
    });
  });
});

describe("endingAgainst", () => {
  it("lights up the letters the right form adds", () => {
    expect(endingAgainst("speaks", ["speak"])).toEqual({
      stem: "speak",
      ending: "s",
    });
    expect(endingAgainst("goes", ["go"])).toEqual({
      stem: "go",
      ending: "es",
    });
  });

  it("does not mark a long leftover as an ending", () => {
    expect(endingAgainst("don't live", ["doesn't live"])).toBeNull();
  });
});
