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
  startOfIsoWeek,
  studiedDays,
  studyDaysThisWeek,
  studyTime,
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

describe("startOfIsoWeek", () => {
  it("returns Monday for a Monday", () => {
    expect(startOfIsoWeek("2026-08-10")).toBe("2026-08-10");
  });

  it("walks Sunday back to the preceding Monday", () => {
    expect(startOfIsoWeek("2026-08-16")).toBe("2026-08-10");
  });
});

describe("studyDaysThisWeek", () => {
  it("counts Monday through today and ignores the rest of the week", () => {
    const wednesday = at(12);
    expect(
      studyDaysThisWeek(
        ["2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13"],
        wednesday,
        TZ,
      ),
    ).toBe(3);
  });

  it("is zero when nothing this week has been studied", () => {
    expect(studyDaysThisWeek(["2026-08-09"], at(12), TZ)).toBe(0);
  });
});

/**
 * The streak reads one list of timestamps, whatever produced them. Grammar
 * Review sittings join that list in `getStudyActivity`; this is the guarantee
 * they rely on — a day whose only activity is a review still counts, and a
 * gap it fills keeps a run unbroken.
 */
describe("a study day that was only Grammar Review", () => {
  it("keeps the streak alive on its own", () => {
    const reviewOnly = [at(10, 9)];
    expect(currentStreak(reviewOnly, now, TZ)).toBe(1);
  });

  it("joins vocabulary and lesson days into one unbroken run", () => {
    const vocabularyDay = at(8);
    const grammarReviewDay = at(9, 22);
    const lessonDay = at(10, 7);
    expect(
      currentStreak([vocabularyDay, grammarReviewDay, lessonDay], now, TZ),
    ).toBe(3);
  });
});

describe("studyTime", () => {
  // The fixed `now` above is a Monday; a week needs days before today in it.
  const saturday = at(15, 20);
  const sitting = (
    day: number,
    durationSec: number,
    extra: { kind?: string; label?: string; endedAt?: Date | null } = {},
  ) => ({
    kind: extra.kind ?? "practice",
    label: extra.label ?? "all",
    endedAt: extra.endedAt === undefined ? at(day, 10) : extra.endedAt,
    endedReason: "completed",
    durationSec,
    reviews: 4,
    introduced: 0,
  });

  const week = [
    sitting(15, 600),
    sitting(13, 900, { kind: "grammar", label: "present-simple/lesson-1" }),
    sitting(11, 300, { kind: "grammar", label: "review" }),
  ];

  it("sums today and the week from durationSec", () => {
    const time = studyTime(week, saturday, TZ);

    expect(time.todayMinutes).toBe(10);
    expect(time.weekMinutes).toBe(30);
  });

  it("splits the week by kind", () => {
    expect(studyTime(week, saturday, TZ).weekByKind).toEqual({
      reviews: 10,
      lesson: 15,
      grammarReview: 5,
      story: 0,
    });
  });

  it("leaves last week out of the week, but counts its day", () => {
    const time = studyTime([...week, sitting(9, 1200)], saturday, TZ);

    expect(time.weekMinutes).toBe(30);
    expect(time.recordedDays).toBe(4);
  });

  it("ignores a sitting still open and one with no time on it", () => {
    const time = studyTime(
      [sitting(15, 999, { endedAt: null }), sitting(14, 0)],
      saturday,
      TZ,
    );

    expect(time).toEqual({
      todayMinutes: 0,
      weekMinutes: 0,
      weekByKind: { reviews: 0, lesson: 0, grammarReview: 0, story: 0 },
      recordedDays: 0,
    });
  });
});
