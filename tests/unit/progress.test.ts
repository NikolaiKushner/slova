import { describe, expect, it } from "vitest";
import {
  countOnDay,
  currentStreak,
  dayKey,
  progressLine,
} from "@/lib/progress";

const at = (day: number, hour = 12) => new Date(2026, 7, day, hour);
const now = at(10, 20);

describe("dayKey", () => {
  it("pads month and day", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 0))).toBe("2026-01-05");
  });

  it("ignores the time of day", () => {
    expect(dayKey(new Date(2026, 7, 10, 0, 1))).toBe(dayKey(at(10, 23)));
  });
});

describe("currentStreak", () => {
  it("is zero with no reviews", () => {
    expect(currentStreak([], now)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(currentStreak([at(8), at(9), at(10)], now)).toBe(3);
  });

  it("counts several reviews on one day once", () => {
    expect(currentStreak([at(10, 9), at(10, 14), at(10, 21)], now)).toBe(1);
  });

  it("survives a day that has not been studied yet", () => {
    expect(currentStreak([at(8), at(9)], now)).toBe(2);
  });

  it("breaks after a fully skipped day", () => {
    expect(currentStreak([at(6), at(7)], now)).toBe(0);
  });

  it("stops at the gap, not before it", () => {
    expect(currentStreak([at(1), at(2), at(9), at(10)], now)).toBe(2);
  });

  it("counts a streak that runs across a month boundary", () => {
    const august = new Date(2026, 7, 2, 12);
    const days = [
      new Date(2026, 6, 31, 12),
      new Date(2026, 7, 1, 12),
      new Date(2026, 7, 2, 12),
    ];
    expect(currentStreak(days, august)).toBe(3);
  });
});

describe("countOnDay", () => {
  it("counts only the given day", () => {
    expect(countOnDay([at(9), at(10, 8), at(10, 19)], now)).toBe(2);
  });

  it("is zero when nothing happened", () => {
    expect(countOnDay([at(8)], now)).toBe(0);
  });
});

describe("progressLine", () => {
  it("says nothing before the first review", () => {
    expect(progressLine(0, 0)).toBeNull();
  });

  it("mentions both when both are there", () => {
    expect(progressLine(12, 5)).toBe("12 reviewed today · 5-day streak");
  });

  it("keeps the streak alive on a day not yet studied", () => {
    expect(progressLine(0, 5)).toBe("5-day streak");
  });

  it("reports a first day without a streak claim", () => {
    expect(progressLine(4, 1)).toBe("4 reviewed today · 1-day streak");
  });
});
