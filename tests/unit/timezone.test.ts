import { describe, expect, it } from "vitest";
import { dateFromDayKey } from "@/lib/calendar-date";
import {
  calendarDay,
  DEFAULT_TIMEZONE,
  readTimeZone,
  shiftCalendarDay,
} from "@/lib/timezone";

describe("calendarDay", () => {
  it("formats a UTC instant as YYYY-MM-DD in UTC", () => {
    expect(calendarDay(new Date("2026-08-16T23:30:00Z"), "UTC")).toBe(
      "2026-08-16",
    );
  });

  it("rolls into the next calendar day in Asia/Dubai at 23:30 UTC", () => {
    expect(calendarDay(new Date("2026-08-16T23:30:00Z"), "Asia/Dubai")).toBe(
      "2026-08-17",
    );
  });

  it("stays on the 16th in UTC-4 at the same instant", () => {
    expect(
      calendarDay(new Date("2026-08-16T23:30:00Z"), "America/New_York"),
    ).toBe("2026-08-16");
  });

  it("falls back to UTC when the zone is junk", () => {
    expect(calendarDay(new Date("2026-08-16T23:30:00Z"), "Not/AZone")).toBe(
      "2026-08-16",
    );
  });
});

describe("readTimeZone", () => {
  it("returns UTC when the cookie is missing", () => {
    expect(readTimeZone(undefined)).toBe(DEFAULT_TIMEZONE);
    expect(readTimeZone(null)).toBe(DEFAULT_TIMEZONE);
    expect(readTimeZone("")).toBe(DEFAULT_TIMEZONE);
  });

  it("passes a real IANA name through", () => {
    expect(readTimeZone("Asia/Dubai")).toBe("Asia/Dubai");
    expect(readTimeZone(" UTC ")).toBe("UTC");
  });

  it("rejects names Intl does not know", () => {
    expect(readTimeZone("Foo/Bar")).toBe(DEFAULT_TIMEZONE);
    expect(readTimeZone("GMT+4")).toBe(DEFAULT_TIMEZONE);
  });

  it("rejects an oversized value rather than handing it to Intl", () => {
    expect(readTimeZone("A".repeat(81))).toBe(DEFAULT_TIMEZONE);
  });
});

describe("shiftCalendarDay", () => {
  it("steps across a month boundary", () => {
    expect(shiftCalendarDay("2026-08-01", -1)).toBe("2026-07-31");
    expect(shiftCalendarDay("2026-07-31", 1)).toBe("2026-08-01");
  });
});

describe("dateFromDayKey", () => {
  it.each(["Pacific/Auckland", "Pacific/Kiritimati", "America/Adak"])(
    "keeps the same calendar key in %s",
    (timeZone) => {
      const key = "2026-08-17";
      expect(calendarDay(dateFromDayKey(key, timeZone), timeZone)).toBe(key);
    },
  );
});
