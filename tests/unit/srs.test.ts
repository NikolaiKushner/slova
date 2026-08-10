import { describe, expect, it } from "vitest";
import { restoreFromSnapshot, scheduleReview } from "@/lib/srs";

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

describe("restoreFromSnapshot", () => {
  const dueAt = new Date("2026-08-14T12:00:00.000Z");

  it("returns the state the card had before the rating", () => {
    expect(
      restoreFromSnapshot({
        prevIntervalDays: 4,
        prevEase: 2.5,
        prevDueAt: dueAt,
        prevIntroducedAt: null,
      }),
    ).toEqual({
      intervalDays: 4,
      ease: 2.5,
      dueAt,
      introducedAt: null,
    });
  });

  it("puts a first-ever rating back to unseen", () => {
    const restored = restoreFromSnapshot({
      prevIntervalDays: 0,
      prevEase: 2.5,
      prevDueAt: dueAt,
      prevIntroducedAt: null,
    });
    expect(restored?.introducedAt).toBeNull();
  });

  it("keeps introducedAt when the card was already seen", () => {
    const introduced = new Date("2026-08-01T09:00:00.000Z");
    const restored = restoreFromSnapshot({
      prevIntervalDays: 2,
      prevEase: 2.4,
      prevDueAt: dueAt,
      prevIntroducedAt: introduced,
    });
    expect(restored?.introducedAt).toBe(introduced);
  });

  it("refuses a log written before undo existed", () => {
    expect(
      restoreFromSnapshot({
        prevIntervalDays: null,
        prevEase: null,
        prevDueAt: null,
        prevIntroducedAt: null,
      }),
    ).toBeNull();
  });

  it("treats a zero interval as a real value, not a missing one", () => {
    const restored = restoreFromSnapshot({
      prevIntervalDays: 0,
      prevEase: 1.3,
      prevDueAt: dueAt,
      prevIntroducedAt: null,
    });
    expect(restored?.intervalDays).toBe(0);
  });
});
