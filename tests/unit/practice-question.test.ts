import { describe, expect, it } from "vitest";
import { buildOptions, pickDistractors } from "@/lib/practice/distractors";
import { judge, judgeForms, passed } from "@/lib/practice/answer";
import {
  buildQuestion,
  EXERCISE_KINDS,
  isTyped,
  needsAudio,
  tilesOf,
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

  it("does not give a phrase away by pairing it with single words", () => {
    const mixed = [
      { id: "1", text: "cat" },
      { id: "2", text: "look after" },
      { id: "3", text: "take off" },
      { id: "4", text: "elephant" },
      { id: "5", text: "run out" },
      { id: "6", text: "window" },
    ];
    const chosen = pickDistractors("give up", mixed, 3, rng());
    expect(chosen).toHaveLength(3);
    expect(chosen.every((option) => option.includes(" "))).toBe(true);
  });

  it("keeps the English shape when the options are Russian", () => {
    // «сдаться» is one word; without an explicit shape it would be grouped
    // with «кот» and the phrase would be the long one in a row of shorts.
    const chosen = pickDistractors(
      "сдаться",
      [
        { id: "1", text: "кот", shape: "word" },
        { id: "2", text: "присматривать", shape: "phrase" },
        { id: "3", text: "слон", shape: "word" },
        { id: "4", text: "взлетать", shape: "phrase" },
        { id: "5", text: "кончаться", shape: "phrase" },
        { id: "6", text: "окно", shape: "word" },
      ],
      3,
      rng(),
      { shape: "phrase" },
    );
    expect(chosen.sort()).toEqual(["взлетать", "кончаться", "присматривать"]);
  });

  it("prefers the same part of speech when the pool is mixed", () => {
    const chosen = pickDistractors(
      "run",
      [
        { id: "1", text: "jump", partOfSpeech: "verb" },
        { id: "2", text: "house", partOfSpeech: "noun" },
        { id: "3", text: "walk", partOfSpeech: "verb" },
        { id: "4", text: "table", partOfSpeech: "noun" },
      ],
      2,
      rng(),
      { partOfSpeech: "verb" },
    );
    expect(chosen.sort()).toEqual(["jump", "walk"]);
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
  const word = { ...pool[0], forms: { past: "brighted", participle: "brighted" } };

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

  it("deals a phrase as word tiles, not letters", () => {
    const phrase = { id: "p", front: "give up", back: "сдаться" };
    const question = buildQuestion("builder", phrase, pool);
    if (!("letters" in question)) throw new Error("expected a builder question");
    expect([...question.letters].sort()).toEqual(["give", "up"].sort());
    expect(question.letters).not.toContain(" ");
    expect(question.letters.join(" ")).not.toBe("give up");
  });

  it("splits a word into letters and a phrase into words", () => {
    expect(tilesOf("bright")).toEqual([..."bright"]);
    expect(tilesOf("give up")).toEqual(["give", "up"]);
    expect(tilesOf("look forward to")).toEqual(["look", "forward", "to"]);
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

  it("asks for the two forms, not the triple as a string", () => {
    const go = {
      id: "go",
      front: "go",
      back: "идти",
      forms: { past: "went", participle: "gone" },
    };
    const question = buildQuestion("verb-forms", go, pool);
    if (question.kind !== "verb-forms") throw new Error("expected verb-forms");
    expect(question.prompt).toBe("go");
    expect(question.caption).toBe("идти");
    expect(question.past).toBe("went");
    expect(question.participle).toBe("gone");
  });

  it("prefers the verb-table gloss over a homograph's dictionary translation", () => {
    const light = {
      id: "light",
      front: "light",
      back: "свет",
      forms: { past: "lit", participle: "lit", gloss: "зажигать" },
    };
    const question = buildQuestion("verb-forms", light, pool);
    if (question.kind !== "verb-forms") throw new Error("expected verb-forms");
    expect(question.caption).toBe("зажигать");
  });

  it("carries the extra past that be accepts", () => {
    const be = {
      id: "be",
      front: "be",
      back: "быть",
      forms: { past: "was", participle: "been", acceptPast: ["were"] },
    };
    const question = buildQuestion("verb-forms", be, pool);
    if (question.kind !== "verb-forms") throw new Error("expected verb-forms");
    expect(question.acceptPast).toEqual(["were"]);
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
    expect(EXERCISE_KINDS.filter(isTyped)).toEqual([
      "listening",
      "typing",
      "verb-forms",
    ]);
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

  it("folds articles inside a phrase, not only at the front", () => {
    expect(judge("make decision", "make a decision")).toBe("correct");
    expect(judge("make a decision", "make the decision")).toBe("correct");
    expect(judge("give up", "to give up")).toBe("correct");
    expect(judge("to give up", "give up")).toBe("correct");
  });

  it("does not drop a particle to in the middle of a phrase", () => {
    expect(judge("look forward to", "look forward to")).toBe("correct");
    expect(judge("look forward", "look forward to")).toBe("wrong");
  });

  it("does not apply the phrase fold to a one-word answer", () => {
    expect(judge("the", "the")).toBe("correct");
    expect(judge("another", "another")).toBe("correct");
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

describe("judgeForms", () => {
  const go = { past: "went", participle: "gone" };

  it("needs both fields", () => {
    expect(judgeForms({ past: "went", participle: "gone" }, go)).toBe("correct");
    expect(judgeForms({ past: "went", participle: "" }, go)).toBe("wrong");
    expect(judgeForms({ past: "", participle: "gone" }, go)).toBe("wrong");
  });

  it("keeps the one-edit tolerance, and a miss in either fails the card", () => {
    expect(judgeForms({ past: "wnet", participle: "gone" }, go)).toBe("almost");
    expect(judgeForms({ past: "went", participle: "gon" }, go)).toBe("almost");
    expect(judgeForms({ past: "goed", participle: "gone" }, go)).toBe("wrong");
  });

  it("accepts were next to was", () => {
    const be = { past: "was", participle: "been", acceptPast: ["were"] };
    expect(judgeForms({ past: "was", participle: "been" }, be)).toBe("correct");
    expect(judgeForms({ past: "were", participle: "been" }, be)).toBe("correct");
    expect(judgeForms({ past: "is", participle: "been" }, be)).toBe("wrong");
  });
});
