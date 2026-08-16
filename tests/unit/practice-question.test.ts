import { describe, expect, it } from "vitest";
import { buildOptions, pickDistractors } from "@/lib/practice/distractors";
import { judge, passed } from "@/lib/practice/answer";
import {
  buildQuestion,
  EXERCISE_KINDS,
  isTyped,
  needsAudio,
  type PracticeWord,
} from "@/lib/practice/question";
import { seedFrom, seededRng, shuffle } from "@/lib/practice/random";

const rng = () => seededRng(seedFrom("test"));

const pool: PracticeWord[] = [
  { id: "1", front: "bright", back: "яркий" },
  { id: "2", front: "brave", back: "храбрый" },
  { id: "3", front: "bread", back: "хлеб" },
  { id: "4", front: "window", back: "окно" },
  { id: "5", front: "elephant", back: "слон" },
  { id: "6", front: "cat", back: "кот" },
];

describe("seeded randomness", () => {
  it("shuffles the same way twice, so a re-render does not reshuffle", () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(seedFrom("word", "kind")));
    const b = shuffle([1, 2, 3, 4, 5], seededRng(seedFrom("word", "kind")));
    expect(a).toEqual(b);
  });

  it("shuffles differently for a different word", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], seededRng(seedFrom("one")));
    const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], seededRng(seedFrom("two")));
    expect(a).not.toEqual(b);
  });
});

describe("pickDistractors", () => {
  it("prefers words that could actually be confused with the answer", () => {
    // "brave" and "bread" share a length band and two opening letters with
    // "bright"; "elephant" shares nothing. The near ones must come first, or
    // the answer is guessable from its shape alone.
    const chosen = pickDistractors(
      "bright",
      pool.map((w) => ({ id: w.id, text: w.front })),
      2,
      rng(),
    );
    expect(chosen.sort()).toEqual(["brave", "bread"]);
  });

  it("falls back to anything rather than returning too few", () => {
    const chosen = pickDistractors(
      "bright",
      pool.map((w) => ({ id: w.id, text: w.front })),
      4,
      rng(),
    );
    expect(chosen).toHaveLength(4);
    expect(new Set(chosen).size).toBe(4);
  });

  it("never offers the answer as a wrong option", () => {
    const chosen = pickDistractors(
      "cat",
      [...pool, { id: "7", front: "Cat", back: "кошка" }].map((w) => ({
        id: w.id,
        text: w.front,
      })),
      3,
      rng(),
    );
    // "Cat" reads the same as "cat" — an option that is also right makes the
    // question unanswerable.
    expect(chosen.map((c) => c.toLowerCase())).not.toContain("cat");
  });

  it("never offers the same option twice", () => {
    const duplicated = [
      { id: "a", text: "окно" },
      { id: "b", text: "окно" },
      { id: "c", text: "дверь" },
    ];
    const chosen = pickDistractors("стол", duplicated, 3, rng());
    expect(new Set(chosen).size).toBe(chosen.length);
  });

  it("returns what it can when the pool is nearly empty", () => {
    expect(pickDistractors("cat", [], 3, rng())).toEqual([]);
  });
});

describe("buildOptions", () => {
  it("says where the right answer landed rather than making the caller look", () => {
    const { options, answerIndex } = buildOptions("кот", ["окно", "хлеб"], rng());
    expect(options).toHaveLength(3);
    expect(options[answerIndex]).toBe("кот");
  });
});

describe("buildQuestion", () => {
  const word = pool[0];

  it("builds every format without asking for anything it does not have", () => {
    for (const kind of EXERCISE_KINDS) {
      const question = buildQuestion(kind, word, pool);
      expect(question.wordId).toBe(word.id);
      expect(question.kind).toBe(kind);
    }
  });

  it("asks for the translation when it shows the word", () => {
    const question = buildQuestion("word-to-translation", word, pool);
    if (!("options" in question)) throw new Error("expected a choice question");
    expect(question.prompt).toBe("bright");
    expect(question.options[question.answerIndex]).toBe("яркий");
  });

  it("asks for the word when it shows the translation", () => {
    const question = buildQuestion("translation-to-word", word, pool);
    if (!("options" in question)) throw new Error("expected a choice question");
    expect(question.prompt).toBe("яркий");
    expect(question.options[question.answerIndex]).toBe("bright");
  });

  it("shows nothing at all for the audio formats", () => {
    // Printing the word next to its own pronunciation would remove the task.
    for (const kind of ["audio-choice", "listening"] as const) {
      const question = buildQuestion(kind, word, pool);
      expect(question.prompt).toBe("");
      expect(question.speak).toBe("bright");
    }
  });

  it("propagates both recording variants to questions that speak", () => {
    const recorded = {
      ...word,
      audioUrl: "/audio/bright.mp3",
      audioSlowUrl: "/audio/slow/bright.mp3",
    };

    for (const kind of ["word-to-translation", "audio-choice", "builder", "listening"] as const) {
      const question = buildQuestion(kind, recorded, pool);
      expect(question.audioUrl).toBe(recorded.audioUrl);
      expect(question.audioSlowUrl).toBe(recorded.audioSlowUrl);
    }
  });

  it("gives the builder exactly the letters of the answer", () => {
    const question = buildQuestion("builder", word, pool);
    if (!("letters" in question)) throw new Error("expected a builder question");
    expect([...question.letters].sort()).toEqual([..."bright"].sort());
    // Handing back the answer already assembled would be no exercise at all.
    expect(question.letters.join("")).not.toBe("bright");
  });

  it("keeps a phrase assemblable by treating the space as a tile", () => {
    const phrase = { id: "p", front: "give up", back: "сдаться" };
    const question = buildQuestion("builder", phrase, pool);
    if (!("letters" in question)) throw new Error("expected a builder question");
    expect(question.letters).toContain(" ");
  });

  it("is stable: the same word asked twice looks the same", () => {
    const a = buildQuestion("word-to-translation", word, pool, "session-1");
    const b = buildQuestion("word-to-translation", word, pool, "session-1");
    expect(a).toEqual(b);
  });

  it("varies between sessions", () => {
    const a = buildQuestion("word-to-translation", word, pool, "session-1");
    const b = buildQuestion("word-to-translation", word, pool, "session-2");
    if (!("options" in a) || !("options" in b)) throw new Error("choice expected");
    expect(a.options).not.toEqual(b.options);
  });
});

describe("needsAudio / isTyped", () => {
  it("knows which formats cannot run without a voice", () => {
    expect(EXERCISE_KINDS.filter(needsAudio)).toEqual([
      "audio-choice",
      "listening",
    ]);
  });

  it("knows which formats are typed rather than chosen", () => {
    expect(EXERCISE_KINDS.filter(isTyped)).toEqual(["listening", "typing"]);
  });
});

describe("judge", () => {
  it("accepts the answer as written", () => {
    expect(judge("bright", "bright")).toBe("correct");
  });

  it("does not test typing: case, spaces and punctuation are not knowledge", () => {
    expect(judge("  Bright  ", "bright")).toBe("correct");
    expect(judge("bright.", "bright")).toBe("correct");
  });

  it("ignores an article the learner did or did not type", () => {
    expect(judge("a cat", "cat")).toBe("correct");
    expect(judge("cat", "a cat")).toBe("correct");
    expect(judge("to run", "run")).toBe("correct");
  });

  it("calls one wrong letter almost, not wrong", () => {
    expect(judge("brigth", "bright")).toBe("almost");
    expect(judge("brigh", "bright")).toBe("almost");
    expect(judge("brights", "bright")).toBe("almost");
    expect(passed("almost")).toBe(true);
  });

  it("has no tolerance in a short word, where a letter is a different word", () => {
    expect(judge("cot", "cat")).toBe("wrong");
    expect(judge("bit", "bet")).toBe("wrong");
  });

  it("rejects two mistakes, and rejects nothing at all", () => {
    expect(judge("brigght", "bright")).toBe("almost");
    expect(judge("braght", "bright")).toBe("almost");
    expect(judge("brxght", "bright")).toBe("almost");
    expect(judge("bxxght", "bright")).toBe("wrong");
    expect(judge("   ", "bright")).toBe("wrong");
    expect(passed("wrong")).toBe(false);
  });
});
