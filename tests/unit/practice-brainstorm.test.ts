import { describe, expect, it } from "vitest";
import {
  answerBrainstorm,
  currentTask,
  DEFAULT_LADDER,
  isFinished,
  SESSION_SIZE,
  startBrainstorm,
  STRUGGLE_LIMIT,
  type BrainstormState,
} from "@/lib/practice/brainstorm";

const words = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `w${i}`,
    front: `word${i}`,
    back: `слово${i}`,
  }));

/** Answer whatever is in front of us until the session ends or we give up. */
function run(
  state: BrainstormState,
  answer: (wordId: string, step: string, turn: number) => boolean,
  limit = 500,
): { state: BrainstormState; turns: number } {
  let current = state;
  let turns = 0;

  while (!isFinished(current) && turns < limit) {
    const task = currentTask(current);
    if (!task) break;
    current = answerBrainstorm(current, answer(task.wordId, task.step, turns));
    turns++;
  }

  return { state: current, turns };
}

describe("startBrainstorm", () => {
  it("asks every word once before any of them comes round again", () => {
    let state = startBrainstorm(words(3));
    const opening: string[] = [];

    for (let i = 0; i < 3; i++) {
      const task = currentTask(state);
      opening.push(task!.wordId);
      state = answerBrainstorm(state, true);
    }

    // The introduction is the table shown before the session; in here the
    // opening pass is one turn each, in order.
    expect(opening).toEqual(["w0", "w1", "w2"]);
  });

  it("takes a sitting's worth and no more", () => {
    const state = startBrainstorm(words(40));
    expect(state.words).toHaveLength(SESSION_SIZE);
  });
});

describe("answerBrainstorm", () => {
  it("climbs a rung on a right answer", () => {
    let state = startBrainstorm(words(1));
    expect(currentTask(state)!.step).toBe(DEFAULT_LADDER[0]);
    state = answerBrainstorm(state, true);
    expect(currentTask(state)!.step).toBe(DEFAULT_LADDER[1]);
  });

  it("drops a rung on a wrong one", () => {
    let state = startBrainstorm(words(1));
    state = answerBrainstorm(state, true);
    state = answerBrainstorm(state, true);
    expect(currentTask(state)!.step).toBe(DEFAULT_LADDER[2]);

    state = answerBrainstorm(state, false);
    expect(currentTask(state)!.step).toBe(DEFAULT_LADDER[1]);
  });

  it("never drops off the bottom of the ladder", () => {
    let state = startBrainstorm(words(1));
    state = answerBrainstorm(state, false);
    expect(currentTask(state)!.step).toBe(DEFAULT_LADDER[0]);
  });

  it("does not let a word leave until the whole ladder is clean", () => {
    const { state, turns } = run(startBrainstorm(words(1)), () => true);
    expect(state.mastered).toEqual(["w0"]);
    expect(turns).toBe(DEFAULT_LADDER.length);
  });

  it("brings a word back later the better it is going", () => {
    // Two words, both answered correctly throughout: the gaps widen, so the
    // session is longer than simply asking each word once per rung.
    const { turns } = run(startBrainstorm(words(2)), () => true);
    expect(turns).toBe(2 * DEFAULT_LADDER.length);
  });

  it("finishes eventually even when every answer is wrong", () => {
    const { state, turns } = run(startBrainstorm(words(2)), () => false);
    expect(state.struggling.sort()).toEqual(["w0", "w1"]);
    expect(state.mastered).toEqual([]);
    // Bounded by the struggle limit rather than running forever.
    expect(turns).toBeLessThanOrEqual(2 * STRUGGLE_LIMIT + 2);
    expect(isFinished(state)).toBe(true);
  });

  it("stops fighting a word after the struggle limit", () => {
    let state = startBrainstorm(words(1));
    state = answerBrainstorm(state, true); // up one rung first
    for (let i = 0; i < STRUGGLE_LIMIT; i++) {
      state = answerBrainstorm(state, false);
    }
    expect(state.struggling).toEqual(["w0"]);
    expect(isFinished(state)).toBe(true);
  });

  it("counts every mistake, including ones recovered from", () => {
    let state = startBrainstorm(words(1));
    state = answerBrainstorm(state, true);
    state = answerBrainstorm(state, false);
    const { state: done } = run(state, () => true);
    expect(done.words[0].errors).toBe(1);
    expect(done.mastered).toEqual(["w0"]);
  });

  it("is a pure function — the state handed in is never touched", () => {
    const before = startBrainstorm(words(2));
    const snapshot = JSON.stringify(before);
    answerBrainstorm(before, true);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it("answers nothing when the session is over", () => {
    const { state } = run(startBrainstorm(words(1)), () => true);
    expect(currentTask(state)).toBeNull();
    expect(answerBrainstorm(state, true)).toBe(state);
  });
});
