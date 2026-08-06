import { describe, expect, it } from "vitest";
import { scheduleReview } from "@/lib/srs";

describe("scheduleReview", () => {
  const now = new Date("2026-08-06T12:00:00.000Z");

  it("marks again as due immediately", () => {
    const next = scheduleReview({ intervalDays: 4, ease: 2.5 }, "again", now);
    expect(next.intervalDays).toBe(0);
    expect(next.dueAt.getTime()).toBe(now.getTime());
    expect(next.ease).toBe(2.3);
  });

  it("schedules first good to one day", () => {
    const next = scheduleReview({ intervalDays: 0, ease: 2.5 }, "good", now);
    expect(next.intervalDays).toBe(1);
    expect(next.dueAt.toISOString()).toBe("2026-08-07T12:00:00.000Z");
  });

  it("grows interval by ease on subsequent good", () => {
    const next = scheduleReview({ intervalDays: 2, ease: 2.5 }, "good", now);
    expect(next.intervalDays).toBe(5);
    expect(next.ease).toBe(2.55);
  });
});
