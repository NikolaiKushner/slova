import { describe, expect, it } from "vitest";
import {
  restoreFromSnapshot,
  scheduleGraduation,
  scheduleReview,
  snapshotOf,
  type ScheduledWord,
} from "@/lib/srs";

const NOW = new Date("2026-08-12T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

/** A word nobody has studied — every word looks like this before its first review. */
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

describe("scheduleReview", () => {
  it("gives a new word a memory where it had none", () => {
    const next = scheduleReview(fresh(), "good", NOW);
    expect(next.stability).toBeGreaterThan(0);
    expect(next.difficulty).toBeGreaterThan(0);
    expect(next.reps).toBe(1);
  });

  it("pushes a known word further out each time it is remembered", () => {
    let word = fresh();
    let previous = 0;

    for (let day = 0; day < 5; day++) {
      const at = new Date(NOW.getTime() + day * 30 * DAY);
      const next = scheduleReview(word, "good", at);
      const waited = next.dueAt.getTime() - at.getTime();
      expect(waited).toBeGreaterThan(previous);
      previous = waited;
      word = { ...fresh(), ...next };
    }
  });

  it("brings a forgotten word back soon, and remembers that it was forgotten", () => {
    // Getting it properly learned first matters: forgetting something you are
    // still in the middle of learning is not a lapse, and FSRS is right not to
    // count it as one. A lapse is a word you had and lost.
    let word = fresh();
    for (let step = 0; step < 4; step++) {
      const at = new Date(NOW.getTime() + step * 20 * DAY);
      word = { ...fresh(), ...scheduleReview(word, "good", at) };
    }
    expect(word.lapses).toBe(0);

    const later = new Date(NOW.getTime() + 100 * DAY);
    const lapsed = scheduleReview(word, "again", later);

    expect(lapsed.dueAt.getTime() - later.getTime()).toBeLessThan(DAY);
    // The count is most of why this beats a fixed multiplier: a word forgotten
    // twice is treated differently from one forgotten once.
    expect(lapsed.lapses).toBe(1);
  });

  it("keeps a word that is hard for this person on a shorter leash", () => {
    const easy = scheduleReview(fresh(), "good", NOW);
    let hard = scheduleReview(fresh(), "again", NOW);
    hard = scheduleReview({ ...fresh(), ...hard }, "good", NOW);

    expect(hard.difficulty ?? 0).toBeGreaterThan(easy.difficulty ?? 0);
  });

  it("starts a word from before this scheduler without pretending to know it", () => {
    // Rows written by the interval-doubling scheduler have an interval and no
    // memory model. There is nothing to translate an ease factor into, so the
    // word starts fresh rather than inheriting a number that means something
    // else.
    const legacy = fresh({ intervalDays: 14, dueAt: NOW });
    const next = scheduleReview(legacy, "good", NOW);
    expect(next.stability).toBeGreaterThan(0);
    expect(next.reps).toBe(1);
  });
});

describe("scheduleGraduation", () => {
  it("sends a clean run further out than a struggle", () => {
    const clean = scheduleGraduation(0, NOW);
    const struggled = scheduleGraduation(5, NOW);
    expect(clean.dueAt.getTime()).toBeGreaterThan(struggled.dueAt.getTime());
  });

  it("never gets worse the better the run went", () => {
    const dues = [0, 1, 2, 3, 4, 6].map((errors) =>
      scheduleGraduation(errors, NOW).dueAt.getTime(),
    );
    for (let i = 1; i < dues.length; i++) {
      expect(dues[i]).toBeLessThanOrEqual(dues[i - 1]);
    }
  });

  it("hands over a real memory state, not just a date", () => {
    const graduated = scheduleGraduation(0, NOW);
    expect(graduated.stability).toBeGreaterThan(0);
    expect(graduated.difficulty).toBeGreaterThan(0);
  });
});

describe("restoreFromSnapshot", () => {
  it("puts back everything the scheduler knew, not just the date", () => {
    const word = fresh();
    const before = snapshotOf(word);
    const after = scheduleReview(word, "good", NOW);

    const restored = restoreFromSnapshot({
      prevCard: JSON.parse(JSON.stringify(before)),
      prevIntervalDays: word.intervalDays,
      prevEase: 2.5,
      prevDueAt: word.dueAt,
      prevIntroducedAt: null,
    });

    expect(restored).not.toBeNull();
    expect(restored!.reps).toBe(0);
    expect(restored!.reps).not.toBe(after.reps);
    expect(restored!.dueAt.getTime()).toBe(word.dueAt.getTime());
  });

  it("restores what a row from before FSRS actually has", () => {
    const restored = restoreFromSnapshot({
      prevIntervalDays: 6,
      prevEase: 2.5,
      prevDueAt: NOW,
      prevIntroducedAt: NOW,
    });

    expect(restored).toMatchObject({
      intervalDays: 6,
      dueAt: NOW,
      introducedAt: NOW,
      // No memory to put back — there never was one on those rows.
      stability: null,
      difficulty: null,
    });
  });

  it("refuses to guess when the log holds no snapshot at all", () => {
    expect(
      restoreFromSnapshot({
        prevIntervalDays: null,
        prevEase: null,
        prevDueAt: null,
        prevIntroducedAt: null,
      }),
    ).toBeNull();
  });

  it("reads a snapshot that has been through JSON and back", () => {
    // It has: the column is Json, so dates arrive as strings.
    const stored = JSON.parse(JSON.stringify(snapshotOf(fresh({ intervalDays: 3 }))));
    const restored = restoreFromSnapshot({
      prevCard: stored,
      prevIntervalDays: null,
      prevEase: null,
      prevDueAt: null,
      prevIntroducedAt: null,
    });

    expect(restored?.dueAt).toBeInstanceOf(Date);
    expect(restored?.intervalDays).toBe(3);
  });
});
