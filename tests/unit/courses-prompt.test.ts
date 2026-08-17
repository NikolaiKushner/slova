import { describe, expect, it } from "vitest";
import { endingAgainst, gapCue, splitGapPrompt } from "@/lib/courses/prompt";

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

describe("gapCue", () => {
  it("prefers an explicit cue over a trailing parenthetical", () => {
    expect(
      gapCue({
        type: "exercise",
        id: "x",
        ruleId: "ps-negative-dont",
        kind: "gap",
        prompt: "I ___ football. (do not play)",
        cue: "play",
        answer: "don't play",
      }),
    ).toBe("play");
  });

  it("falls back to the trailing parenthetical", () => {
    expect(
      gapCue({
        type: "exercise",
        id: "x",
        ruleId: "ps-third-person-s",
        kind: "gap",
        prompt: "She ___ here. (live)",
        answer: "lives",
      }),
    ).toBe("live");
  });

  it("is null when there is nothing to show", () => {
    expect(
      gapCue({
        type: "exercise",
        id: "x",
        ruleId: "ps-base-form",
        kind: "gap",
        prompt: "I ___ football.",
        answer: "play",
      }),
    ).toBeNull();
  });

  it("keeps a dictionary form even when it is the answer", () => {
    // The old placeholder leak-guard hid this, which is how `You ___ a new
    // bag. (need)` became mute. The question is still "-s or no -s".
    expect(
      gapCue({
        type: "exercise",
        id: "x",
        ruleId: "ps-base-form",
        kind: "gap",
        prompt: "You ___ a new bag. (need)",
        answer: "need",
      }),
    ).toBe("need");
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
