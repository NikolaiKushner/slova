import { describe, expect, it } from "vitest";
import {
  setSummary,
  newAllowance,
  sessionTotal,
  startOfDay,
} from "@/lib/study-queue";

describe("startOfDay", () => {
  it("drops the time of day", () => {
    const start = startOfDay(new Date(2026, 7, 10, 23, 59, 59));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(10);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
  });

  it("is stable across a single day", () => {
    const morning = startOfDay(new Date(2026, 7, 10, 6, 0, 0));
    const night = startOfDay(new Date(2026, 7, 10, 22, 0, 0));
    expect(morning.getTime()).toBe(night.getTime());
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
