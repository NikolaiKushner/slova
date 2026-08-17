import { describe, expect, it } from "vitest";
import {
  meanRetrievability,
  retrievabilityOf,
  scheduleReview,
  type ScheduledWord,
} from "@/lib/srs";

const NOW = new Date("2026-08-17T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

const fresh = (overrides: Partial<ScheduledWord> = {}): ScheduledWord => ({
  dueAt: NOW,
  intervalDays: 0,
  stability: null,
  difficulty: null,
  srsState: 0,
  learningSteps: 0,
  reps: 0,
  lapses: 0,
  lastReviewAt: null,
  ...overrides,
});

describe("retrievabilityOf", () => {
  it("is null until the word has a memory", () => {
    expect(retrievabilityOf(fresh(), NOW)).toBeNull();
  });

  it("is close to 1 just after a successful review", () => {
    const next = scheduleReview(fresh(), "good", NOW);
    const r = retrievabilityOf({ ...fresh(), ...next }, NOW);
    expect(r).toBeGreaterThan(0.9);
    expect(r).toBeLessThanOrEqual(1);
  });

  it("falls as time passes without a review", () => {
    const next = scheduleReview(fresh(), "good", NOW);
    const later = new Date(NOW.getTime() + 30 * DAY);
    const rNow = retrievabilityOf({ ...fresh(), ...next }, NOW);
    const rLater = retrievabilityOf({ ...fresh(), ...next }, later);
    expect(rNow).not.toBeNull();
    expect(rLater).not.toBeNull();
    expect(rLater!).toBeLessThan(rNow!);
  });
});

describe("meanRetrievability", () => {
  it("is null when nothing has a memory", () => {
    expect(meanRetrievability([fresh(), fresh()], NOW)).toBeNull();
  });

  it("averages only the words that have stability", () => {
    const known = scheduleReview(fresh(), "good", NOW);
    const mean = meanRetrievability(
      [fresh(), { ...fresh(), ...known }],
      NOW,
    );
    expect(mean).toBeCloseTo(retrievabilityOf({ ...fresh(), ...known }, NOW)!, 8);
  });
});
