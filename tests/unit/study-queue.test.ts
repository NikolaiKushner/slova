import { describe, expect, it } from "vitest";
import {
  setSummary,
  newAllowance,
  sessionTotal,
  startOfDay,
} from "@/lib/study-queue";

describe("startOfDay", () => {
  it("uses the learner's midnight rather than the server's", () => {
    const start = startOfDay(
      new Date("2026-08-18T00:30:00.000Z"),
      "Asia/Tbilisi",
    );
    expect(start.toISOString()).toBe("2026-08-17T20:00:00.000Z");
  });

  it("is stable across one learner calendar day", () => {
    const morning = startOfDay(
      new Date("2026-08-18T04:00:00.000Z"),
      "America/New_York",
    );
    const night = startOfDay(
      new Date("2026-08-19T03:59:59.000Z"),
      "America/New_York",
    );
    expect(morning.getTime()).toBe(night.getTime());
  });

  it("falls back to UTC for an invalid cookie value", () => {
    expect(
      startOfDay(
        new Date("2026-08-18T23:59:59.000Z"),
        "not/a-zone",
      ).toISOString(),
    ).toBe("2026-08-18T00:00:00.000Z");
  });
});

describe("newAllowance", () => {
  it("returns the full limit before anything is introduced", () => {
    expect(newAllowance(20, 0)).toBe(20);
  });

  it("shrinks as words are introduced", () => {
    expect(newAllowance(20, 7)).toBe(13);
  });

  it("is zero once the limit is reached", () => {
    expect(newAllowance(20, 20)).toBe(0);
  });

  it("never goes negative when the limit was lowered mid-day", () => {
    expect(newAllowance(5, 20)).toBe(0);
  });
});

describe("sessionTotal", () => {
  it("caps a fresh import at the daily allowance", () => {
    expect(sessionTotal(0, 200, 20)).toBe(20);
  });

  it("adds due reviews on top of the allowance", () => {
    expect(sessionTotal(12, 200, 20)).toBe(32);
  });

  it("does not invent unseen words that are not there", () => {
    expect(sessionTotal(3, 4, 20)).toBe(7);
  });

  it("is reviews only once the allowance is spent", () => {
    expect(sessionTotal(9, 200, 0)).toBe(9);
  });
});

describe("setSummary", () => {
  it("singularises a one-word list", () => {
    expect(setSummary(1, 0, 1)).toBe("1 word · 1 new");
  });

  it("names due and new separately", () => {
    expect(setSummary(120, 12, 108)).toBe("120 words · 12 due · 108 new");
  });

  it("omits parts that are zero", () => {
    expect(setSummary(120, 12, 0)).toBe("120 words · 12 due");
    expect(setSummary(120, 0, 108)).toBe("120 words · 108 new");
  });

  it("says so when a list is fully caught up", () => {
    expect(setSummary(120, 0, 0)).toBe("120 words · all caught up");
  });

  it("stays quiet for an empty list", () => {
    expect(setSummary(0, 0, 0)).toBe("0 words");
  });
});
