import { describe, expect, it } from "vitest";

import {
  DEFAULT_SOURCE_STATE,
  HARD_LAPSES,
  keyFilter,
  setFilter,
  sourceQuery,
  stateFilter,
  toSourceState,
} from "@/lib/practice/source";

/**
 * The source is the one promise the trainings page makes: "twelve words fit".
 * These pin the filters that promise is counted with, because the same
 * functions then choose the words — if they ever drift apart, the bar starts
 * lying and nothing else notices.
 */

describe("toSourceState", () => {
  it("keeps the four it knows", () => {
    for (const state of ["due", "new", "hard", "all"] as const) {
      expect(toSourceState(state)).toBe(state);
    }
  });

  it("falls back rather than throwing, because it reads a query string", () => {
    expect(toSourceState("nonsense")).toBe(DEFAULT_SOURCE_STATE);
    expect(toSourceState(undefined)).toBe(DEFAULT_SOURCE_STATE);
    expect(toSourceState(7)).toBe(DEFAULT_SOURCE_STATE);
  });
});

describe("stateFilter", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("counts a word as new only until it has been introduced", () => {
    expect(stateFilter("new", now)).toEqual({ introducedAt: null });
  });

  it("requires a due word to have been introduced first", () => {
    // Without this, every never-seen word is also "due" and the two counts
    // overlap — which is exactly what the panel must not show.
    expect(stateFilter("due", now)).toEqual({
      introducedAt: { not: null },
      dueAt: { lte: now },
    });
  });

  it("calls a word hard on the second lapse, not the first", () => {
    expect(stateFilter("hard", now)).toEqual({ lapses: { gte: HARD_LAPSES } });
    expect(HARD_LAPSES).toBeGreaterThan(1);
  });

  it("filters nothing for the whole dictionary", () => {
    expect(stateFilter("all", now)).toEqual({});
  });
});

describe("setFilter", () => {
  it("means the whole dictionary when nothing is chosen", () => {
    expect(setFilter([])).toEqual({});
    expect(setFilter(["", "  "].map((s) => s.trim()))).toEqual({});
  });

  it("matches a word in any of the chosen sets", () => {
    expect(setFilter(["a", "b"])).toEqual({
      sets: { some: { setId: { in: ["a", "b"] } } },
    });
  });
});

describe("keyFilter", () => {
  it("restricts a session to those keys, including none", () => {
    expect(keyFilter(["go", "be"])).toEqual({ key: { in: ["go", "be"] } });
    expect(keyFilter([])).toEqual({ key: { in: [] } });
  });
});

describe("sourceQuery", () => {
  it("always states the state, so a reload cannot silently change it", () => {
    expect(sourceQuery({ state: "new", setIds: [] })).toBe("state=new");
  });

  it("repeats the set parameter instead of joining ids", () => {
    // A set id is opaque; a separator inside one would be wrong quietly.
    expect(sourceQuery({ state: "due", setIds: ["a", "b"] })).toBe(
      "state=due&set=a&set=b",
    );
  });

  it("carries extras like the brainstorm sitting", () => {
    expect(
      sourceQuery({ state: "new", setIds: [] }, { mode: "brainstorm", size: "10" }),
    ).toBe("state=new&mode=brainstorm&size=10");
  });
});
