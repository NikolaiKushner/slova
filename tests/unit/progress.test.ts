import { describe, expect, it } from "vitest";
import {
  countOnDay,
  currentStreak,
  dayKey,
  longestStreak,
  matureRetention,
  progressLine,
  reviewCountsByDay,
  reviewsByDay,
  studiedDays,
} from "@/lib/progress";

const TZ = "UTC";
const at = (day: number, hour = 12) => new Date(Date.UTC(2026, 7, day, hour));
const now = at(10, 20);

describe("dayKey", () => {
  it("pads month and day", () => {
    expect(dayKey(new Date(Date.UTC(2026, 0, 5, 23, 0)), TZ)).toBe("2026-01-05");
  });

  it("ignores the time of day in the given zone", () => {
    expect(dayKey(new Date(Date.UTC(2026, 7, 10, 0, 1)), TZ)).toBe(
      dayKey(at(10, 23), TZ),
    );
  });

  it("uses the learner's zone, not the process", () => {
    const lateUtc = new Date("2026-08-16T23:30:00Z");
    expect(dayKey(lateUtc, "UTC")).toBe("2026-08-16");
    expect(dayKey(lateUtc, "Asia/Dubai")).toBe("2026-08-17");
  });
});

describe("studiedDays", () => {
  it("collapses several reviews on one day", () => {
    expect(studiedDays([at(10, 9), at(10, 14), at(10, 21)], TZ)).toEqual(
      new Set(["2026-08-10"]),
    );
  });
});

describe("currentStreak", () => {
  it("is zero with no reviews", () => {
    expect(currentStreak([], now, TZ)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(currentStreak([at(8), at(9), at(10)], now, TZ)).toBe(3);
  });

  it("counts several reviews on one day once", () => {
    expect(currentStreak([at(10, 9), at(10, 14), at(10, 21)], now, TZ)).toBe(1);
  });

  it("survives a day that has not been studied yet", () => {
    expect(currentStreak([at(8), at(9)], now, TZ)).toBe(2);
  });

  it("breaks after a fully skipped day", () => {
    expect(currentStreak([at(6), at(7)], now, TZ)).toBe(0);
  });

  it("stops at the gap, not before it", () => {
    expect(currentStreak([at(1), at(2), at(9), at(10)], now, TZ)).toBe(2);
  });

  it("counts a streak that runs across a month boundary", () => {
    const august = new Date(Date.UTC(2026, 7, 2, 12));
    const days = [
      new Date(Date.UTC(2026, 6, 31, 12)),
      new Date(Date.UTC(2026, 7, 1, 12)),
      new Date(Date.UTC(2026, 7, 2, 12)),
    ];
    expect(currentStreak(days, august, TZ)).toBe(3);
  });

  it("counts a lesson with no reviews as a studied day", () => {
    const lessonDone = new Date(Date.UTC(2026, 7, 10, 16));
    expect(currentStreak([lessonDone], now, TZ)).toBe(1);
    expect(longestStreak([lessonDone], now, TZ)).toBe(1);
  });

  it("treats a 23:30 UTC review as today in Asia/Dubai", () => {
    const reviewed = [new Date("2026-08-16T23:30:00Z")];
    const mondayMorning = new Date("2026-08-17T06:00:00Z");
    expect(currentStreak(reviewed, mondayMorning, "Asia/Dubai")).toBe(1);
    expect(currentStreak(reviewed, mondayMorning, "UTC")).toBe(1);
  });
});

describe("longestStreak", () => {
  it("is zero with no reviews", () => {
    expect(longestStreak([], now, TZ)).toBe(0);
  });

  it("matches the current run when that is the only one", () => {
    expect(longestStreak([at(8), at(9), at(10)], now, TZ)).toBe(3);
  });

  it("keeps the record after a skip zeros the current streak", () => {
    const days = [at(1), at(2), at(3), at(8)];
    expect(currentStreak(days, now, TZ)).toBe(0);
    expect(longestStreak(days, now, TZ)).toBe(3);
  });

  it("picks the longer of two runs", () => {
    expect(
      longestStreak([at(1), at(2), at(8), at(9), at(10)], now, TZ),
    ).toBe(3);
  });

  it("still records yesterday's run when today has not been studied", () => {
    expect(longestStreak([at(8), at(9)], now, TZ)).toBe(2);
  });
});

describe("countOnDay", () => {
  it("counts only the given day", () => {
    expect(countOnDay([at(9), at(10, 8), at(10, 19)], now, TZ)).toBe(2);
  });

  it("is zero when nothing happened", () => {
    expect(countOnDay([at(8)], now, TZ)).toBe(0);
  });

  it("counts a late-UTC review on the Dubai morning", () => {
    const reviewed = [new Date("2026-08-16T23:30:00Z")];
    const dubaiMorning = new Date("2026-08-17T00:30:00Z");
    expect(countOnDay(reviewed, dubaiMorning, "Asia/Dubai")).toBe(1);
    expect(countOnDay(reviewed, dubaiMorning, "UTC")).toBe(0);
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

describe("matureRetention", () => {
  it("is null when nothing has left learning", () => {
    expect(
      matureRetention([
        { rating: "good", prevIntervalDays: 0 },
        { rating: "again", prevIntervalDays: null },
      ]),
    ).toBeNull();
  });

  it("is goods over mature reviews", () => {
    expect(
      matureRetention([
        { rating: "good", prevIntervalDays: 3 },
        { rating: "again", prevIntervalDays: 1 },
        { rating: "good", prevIntervalDays: 0 },
      ]),
    ).toBe(0.5);
  });
});

describe("reviewsByDay", () => {
  it("fills 28 days including zeros", () => {
    const series = reviewsByDay([at(10)], now, TZ);
    expect(series).toHaveLength(28);
    expect(series.at(-1)).toEqual({ day: "2026-08-10", count: 1 });
    expect(series.at(-2)?.count).toBe(0);
  });
});

describe("reviewCountsByDay", () => {
  it("counts every review in the streak window", () => {
    expect(reviewCountsByDay([at(10, 9), at(10, 14), at(8)], now, TZ)).toEqual({
      "2026-08-08": 1,
      "2026-08-10": 2,
    });
  });
});
