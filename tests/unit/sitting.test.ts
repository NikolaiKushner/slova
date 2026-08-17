import { describe, expect, it } from "vitest";
import {
  MAX_ELAPSED_MS,
  MIN_ELAPSED_MS,
  STALE_AFTER_MS,
  clampElapsedMs,
  durationSec,
  endSitting,
  isStale,
  ratingOfVerdict,
  startSitting,
  touchSitting,
  undoSittingTouch,
} from "@/lib/sitting";

const T0 = new Date("2026-08-17T10:00:00.000Z");
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000);

function openSitting() {
  return startSitting({
    kind: "practice",
    label: "typing",
    sourceState: "due",
    setIds: ["set-1"],
    dueAtStart: 8,
    newAtStart: 3,
    now: T0,
  });
}

describe("clampElapsedMs", () => {
  it("passes a normal answer through", () => {
    expect(clampElapsedMs(4_200)).toBe(4_200);
  });

  it("floors a blink at one millisecond", () => {
    expect(clampElapsedMs(0)).toBe(MIN_ELAPSED_MS);
    expect(clampElapsedMs(-12)).toBe(MIN_ELAPSED_MS);
  });

  it("caps a long pause at two minutes", () => {
    expect(clampElapsedMs(MAX_ELAPSED_MS + 50_000)).toBe(MAX_ELAPSED_MS);
  });

  it("treats junk as the floor rather than NaN", () => {
    expect(clampElapsedMs(Number.NaN)).toBe(MIN_ELAPSED_MS);
  });
});

describe("durationSec", () => {
  it("is lastAt minus startedAt, in whole seconds", () => {
    expect(durationSec(T0, minutes(2.5))).toBe(150);
  });

  it("does not go negative if lastAt is before start", () => {
    expect(durationSec(minutes(2), T0)).toBe(0);
  });
});

describe("startSitting", () => {
  it("opens with a snapshot of the queue and no reviews yet", () => {
    const sitting = openSitting();
    expect(sitting.dueAtStart).toBe(8);
    expect(sitting.newAtStart).toBe(3);
    expect(sitting.reviews).toBe(0);
    expect(sitting.endedAt).toBeNull();
    expect(sitting.durationSec).toBe(0);
    expect(sitting.lastAt).toEqual(T0);
  });
});

describe("touchSitting", () => {
  it("counts a good, an again, and an introduction separately", () => {
    let sitting = openSitting();
    sitting = touchSitting(sitting, { now: minutes(1), rating: "good" });
    sitting = touchSitting(sitting, { now: minutes(2), rating: "again" });
    sitting = touchSitting(sitting, {
      now: minutes(3),
      rating: "good",
      introduced: true,
    });
    expect(sitting.reviews).toBe(3);
    expect(sitting.goods).toBe(2);
    expect(sitting.agains).toBe(1);
    expect(sitting.introduced).toBe(1);
    expect(sitting.durationSec).toBe(180);
  });

  it("records a graduate without a rating as introduced", () => {
    const sitting = touchSitting(openSitting(), {
      now: minutes(1),
      introduced: true,
    });
    expect(sitting.introduced).toBe(1);
    expect(sitting.reviews).toBe(0);
  });

  it("ignores a touch after the sitting has ended", () => {
    const ended = endSitting(openSitting(), "completed", minutes(1));
    const touched = touchSitting(ended, { now: minutes(2), rating: "good" });
    expect(touched).toEqual(ended);
  });
});

describe("ratingOfVerdict", () => {
  it("keeps almost as good for FSRS and as almost on the log", () => {
    expect(ratingOfVerdict("almost")).toBe("good");
    expect(ratingOfVerdict("correct")).toBe("good");
    expect(ratingOfVerdict("wrong")).toBe("again");
  });
});

describe("endSitting", () => {
  it("does not include the summary screen in duration", () => {
    let sitting = openSitting();
    sitting = touchSitting(sitting, { now: minutes(4), rating: "good" });
    sitting = endSitting(sitting, "completed", minutes(6));
    expect(sitting.endedReason).toBe("completed");
    expect(sitting.endedAt).toEqual(minutes(6));
    expect(sitting.durationSec).toBe(240);
  });

  it("does not count tea after the last answer", () => {
    let sitting = openSitting();
    sitting = touchSitting(sitting, { now: minutes(10), rating: "good" });
    sitting = endSitting(sitting, "abandoned", minutes(50));
    expect(sitting.durationSec).toBe(600);
    expect(sitting.endedReason).toBe("abandoned");
  });

  it("closes a stale sitting at lastAt, not at the closer", () => {
    let sitting = openSitting();
    sitting = touchSitting(sitting, { now: minutes(5), rating: "again" });
    const later = new Date(sitting.lastAt.getTime() + STALE_AFTER_MS);
    sitting = endSitting(sitting, "abandoned", later);
    expect(sitting.endedAt).toEqual(minutes(5));
    expect(sitting.durationSec).toBe(300);
    expect(isStale(minutes(5), later)).toBe(true);
  });

  it("is idempotent once closed", () => {
    const first = endSitting(openSitting(), "completed", minutes(1));
    const second = endSitting(first, "abandoned", minutes(9));
    expect(second).toEqual(first);
  });
});

describe("undo vs sitting counters", () => {
  it("rolls back the exact review counters", () => {
    let sitting = openSitting();
    sitting = touchSitting(sitting, { now: minutes(1), rating: "good" });
    sitting = touchSitting(sitting, { now: minutes(2), rating: "again" });
    sitting = touchSitting(sitting, { now: minutes(3), rating: "good" });
    sitting = undoSittingTouch(sitting, {
      rating: "good",
      introduced: false,
    });
    expect(sitting.reviews).toBe(2);
    expect(sitting.goods).toBe(1);
    expect(sitting.agains).toBe(1);
  });

  it("rolls back an introduction without making counters negative", () => {
    const sitting = undoSittingTouch(openSitting(), {
      rating: "good",
      introduced: true,
      graduation: true,
    });
    expect(sitting.reviews).toBe(0);
    expect(sitting.introduced).toBe(0);
  });
});
