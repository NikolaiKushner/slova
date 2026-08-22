import { readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  reviewLog: { findMany: vi.fn() },
  userLesson: { findMany: vi.fn() },
  storyProgress: { findMany: vi.fn() },
  studySitting: { findMany: vi.fn() },
  userWord: { findMany: vi.fn() },
  userCourse: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: () => prisma }));
vi.mock("@/lib/server-metrics", () => ({
  measureServerOperation: <T,>(_operation: string, run: () => Promise<T>) =>
    run(),
}));

import { getStudyActivity, studyDaysThisWeek } from "@/lib/progress";

type Row = Record<string, unknown>;

type Fixture = {
  now: string;
  timeZone: string;
  rows: Record<string, Row[]>;
  expected: {
    today: number;
    streak: number;
    longest: number;
    weekDays: number;
    reviewsCharted: number;
    studiedDayKeys: string[];
    dayKeysByKind: Record<string, string[]>;
  };
};

const ISO = /^\d{4}-\d{2}-\d{2}T/;

function load(name: string): Fixture {
  const file = path.join(
    process.cwd(),
    "tests/fixtures/progress",
    `${name}.json`,
  );
  return JSON.parse(readFileSync(file, "utf8"), (_key, value) =>
    typeof value === "string" && ISO.test(value) ? new Date(value) : value,
  ) as Fixture;
}

const order = (value: unknown): number =>
  value instanceof Date ? value.getTime() : Number(value);

/** Enough of a where clause to answer what `lib/progress.ts` actually asks. */
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([field, condition]) => {
    if (field === "userId") return true;
    const value = row[field] ?? null;
    if (
      condition !== null &&
      typeof condition === "object" &&
      !(condition instanceof Date)
    ) {
      const test = condition as Row;
      if ("gte" in test && !(value !== null && order(value) >= order(test.gte)))
        return false;
      if ("gt" in test && !(value !== null && order(value) > order(test.gt)))
        return false;
      if ("not" in test && value === test.not) return false;
      if ("in" in test && !(test.in as unknown[]).includes(value)) return false;
      return true;
    }
    return value === (condition ?? null);
  });
}

function serve(rows: Row[]) {
  return vi.fn(async (args?: { where?: Row }) =>
    rows.filter((row) => matches(row, args?.where ?? {})),
  );
}

function serveFixture(fixture: Fixture) {
  const rows = fixture.rows;
  prisma.reviewLog.findMany = serve(rows.reviewLog ?? []);
  prisma.userLesson.findMany = serve(rows.userLesson ?? []);
  prisma.storyProgress.findMany = serve(rows.storyProgress ?? []);
  prisma.studySitting.findMany = serve(rows.studySitting ?? []);
  prisma.userWord.findMany = serve([]);
  prisma.userCourse.findMany = serve([]);
}

describe.each(["mixed-year", "timezone-edge"])(
  "getStudyActivity over the %s fixture",
  (name) => {
    const fixture = load(name);
    const now = new Date(fixture.now);
    const tz = fixture.timeZone;

    beforeEach(() => {
      vi.clearAllMocks();
      serveFixture(fixture);
    });

    it("reports the streak, the record and the week", async () => {
      const activity = await getStudyActivity("user", now, tz);

      expect({
        today: activity.today,
        streak: activity.streak,
        longest: activity.longest,
        weekDays: studyDaysThisWeek(activity.studiedDayKeys, now, tz),
        reviewsCharted: activity.reviewsByDay.reduce(
          (total, day) => total + day.count,
          0,
        ),
      }).toEqual({
        today: fixture.expected.today,
        streak: fixture.expected.streak,
        longest: fixture.expected.longest,
        weekDays: fixture.expected.weekDays,
        reviewsCharted: fixture.expected.reviewsCharted,
      });
    });

    it("colours the same calendar days, kind by kind", async () => {
      const activity = await getStudyActivity("user", now, tz);

      expect(activity.studiedDayKeys).toEqual(fixture.expected.studiedDayKeys);
      expect(activity.dayKeysByKind).toEqual(fixture.expected.dayKeysByKind);
    });

    it("keeps the streak on a day spent in one kind alone", async () => {
      const activity = await getStudyActivity("user", now, tz);

      for (const [kind, days] of Object.entries(
        fixture.expected.dayKeysByKind,
      )) {
        const alone = days.filter((day) =>
          Object.entries(fixture.expected.dayKeysByKind).every(
            ([other, otherDays]) =>
              other === kind || !otherDays.includes(day),
          ),
        );
        for (const day of alone) {
          expect(activity.studiedDayKeys, `${kind} on ${day}`).toContain(day);
        }
      }
    });
  },
);

describe("a sitting that colours a square", () => {
  const now = new Date("2026-08-22T20:00:00Z");
  const tz = "UTC";
  const sitting = (extra: Row): Row => ({
    kind: "grammar",
    label: "present-simple/lesson-1",
    startedAt: new Date("2026-08-22T11:00:00Z"),
    lastAt: new Date("2026-08-22T11:06:00Z"),
    endedAt: new Date("2026-08-22T11:06:00Z"),
    endedReason: "abandoned",
    durationSec: 360,
    reviews: 0,
    introduced: 0,
    ...extra,
  });

  const activityOf = async (rows: Row[]) => {
    vi.clearAllMocks();
    serveFixture({ rows: { studySitting: rows } } as unknown as Fixture);
    return getStudyActivity("user", now, tz);
  };

  it("keeps a lesson left half-answered", async () => {
    const activity = await activityOf([sitting({ reviews: 4 })]);

    expect(activity.dayKeysByKind.lesson).toEqual(["2026-08-22"]);
    expect(activity.streak).toBe(1);
  });

  it("ignores one opened and left alone", async () => {
    const activity = await activityOf([sitting({})]);

    expect(activity.dayKeysByKind.lesson).toEqual([]);
    expect(activity.streak).toBe(0);
  });

  it("ignores one still open", async () => {
    const activity = await activityOf([
      sitting({ endedAt: null, endedReason: null, reviews: 4 }),
    ]);

    expect(activity.streak).toBe(0);
  });
});

describe("a reading sitting", () => {
  const now = new Date("2026-08-22T20:00:00Z");
  const tz = "UTC";
  const reading = (durationSec: number): Row => ({
    kind: "reading",
    label: "text",
    startedAt: new Date("2026-08-22T11:00:00Z"),
    lastAt: new Date("2026-08-22T11:06:00Z"),
    endedAt: new Date("2026-08-22T11:06:00Z"),
    endedReason: "abandoned",
    durationSec,
    reviews: 0,
    introduced: 0,
  });

  const activityOf = async (rows: Row[]) => {
    vi.clearAllMocks();
    serveFixture({ rows: { studySitting: rows } } as unknown as Fixture);
    return getStudyActivity("user", now, tz);
  };

  it("colours its square and keeps the streak on a day spent only reading", async () => {
    const activity = await activityOf([reading(600)]);

    expect(activity.dayKeysByKind.reading).toEqual(["2026-08-22"]);
    expect(activity.studiedDayKeys).toEqual(["2026-08-22"]);
    expect(activity.streak).toBe(1);
  });

  it("counts on time alone, having no reviews to show for itself", async () => {
    const activity = await activityOf([reading(600)]);

    expect(activity.time.todayMinutes).toBe(10);
    expect(activity.time.weekByKind.reading).toBe(10);
  });

  it("ignores a text opened and closed again", async () => {
    const activity = await activityOf([reading(4)]);

    expect(activity.dayKeysByKind.reading).toEqual([]);
    expect(activity.streak).toBe(0);
  });
});
