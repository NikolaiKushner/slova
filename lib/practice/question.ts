import { kindOf } from "@/lib/lexicon/dataset";
import type { VerbForms } from "@/lib/lexicon/forms";
import {
  buildOptions,
  pickDistractors,
  type Candidate,
} from "@/lib/practice/distractors";
import { seedFrom, seededRng, shuffle } from "@/lib/practice/random";

/**
 * Turning a word into a question.
 *
 * Seven formats, one function. They differ along two axes and nothing else: what
 * the learner is shown (the English word, its translation, or a sound) and
 * what they have to produce (pick from options, assemble from letters, or type
 * it out). Recognition is easy and cheap, production is hard and worth more —
 * which is why the mastery ladder walks up that scale rather than repeating
 * one format louder.
 */

export const EXERCISE_KINDS = [
  "word-to-translation",
  "translation-to-word",
  "audio-choice",
  "builder",
  "listening",
  "typing",
  "verb-forms",
] as const;

export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export type PracticeWord = {
  id: string;
  /** The English word. */
  front: string;
  /** Its Russian translation. */
  back: string;
  /** A recording of it, when the shared base has one. */
  audioUrl?: string | null;
  /** A purpose-made slower recording, when available. */
  audioSlowUrl?: string | null;
  /** IPA from the shared base, when it has any. Shown with the answer. */
  transcription?: string | null;
  /** Closed vocabulary from the shared base; used to pick distractors. */
  partOfSpeech?: string | null;
  /** Irregular forms, when the shared base has them. */
  forms?: VerbForms | null;
};

export type Question =
  | {
      kind: "word-to-translation" | "translation-to-word" | "audio-choice";
      wordId: string;
      /** What to show. Empty for audio questions — the sound is the prompt. */
      prompt: string;
      /** What to pronounce, when the format has a sound. */
      speak?: string;
      /** A recording of it, preferred over the browser's own voice. */
      audioUrl?: string | null;
      /** A purpose-made slower recording, preferred by the slow control. */
      audioSlowUrl?: string | null;
      /** IPA, revealed with the answer — never before it. */
      transcription?: string | null;
      options: string[];
      answerIndex: number;
    }
  | {
      kind: "builder";
      wordId: string;
      prompt: string;
      speak?: string;
      audioUrl?: string | null;
      audioSlowUrl?: string | null;
      transcription?: string | null;
      /** Shuffled tiles of the answer — letters of a word, words of a phrase. */
      letters: string[];
      answer: string;
    }
  | {
      kind: "listening" | "typing";
      wordId: string;
      prompt: string;
      speak?: string;
      audioUrl?: string | null;
      audioSlowUrl?: string | null;
      transcription?: string | null;
      answer: string;
    }
  | {
      kind: "verb-forms";
      wordId: string;
      /** The infinitive. */
      prompt: string;
      /** The translation, under the infinitive — not the thing being judged. */
      caption?: string;
      speak?: string;
      audioUrl?: string | null;
      audioSlowUrl?: string | null;
      transcription?: string | null;
      past: string;
      participle: string;
      acceptPast?: string[];
    };

/** How many options a choice question offers, the right one included. */
const OPTION_COUNT = 4;

export function buildQuestion(
  kind: ExerciseKind,
  word: PracticeWord,
  pool: readonly PracticeWord[],
  /** Distinguishes one session from another so the same word varies. */
  sessionSeed = "",
): Question {
  const rng = seededRng(seedFrom(sessionSeed, word.id, kind));

  switch (kind) {
    case "word-to-translation":
    case "audio-choice": {
      const { options, answerIndex } = choiceOn(word.back, word, pool, rng);
      return {
        kind,
        wordId: word.id,
        // The audio format deliberately shows nothing: hearing it is the task.
        prompt: kind === "audio-choice" ? "" : word.front,
        speak: word.front,
        audioUrl: word.audioUrl ?? null,
        audioSlowUrl: word.audioSlowUrl ?? null,
        transcription: word.transcription ?? null,
        options,
        answerIndex,
      };
    }

    case "translation-to-word": {
      const { options, answerIndex } = choiceOn(word.front, word, pool, rng, "front");
      return {
        kind,
        wordId: word.id,
        prompt: word.back,
        transcription: word.transcription ?? null,
        options,
        answerIndex,
      };
    }

    case "builder": {
      return {
        kind,
        wordId: word.id,
        prompt: word.back,
        speak: word.front,
        audioUrl: word.audioUrl ?? null,
        audioSlowUrl: word.audioSlowUrl ?? null,
        transcription: word.transcription ?? null,
        letters: scramble(word.front, rng),
        answer: word.front,
      };
    }

    case "listening": {
      return {
        kind,
        wordId: word.id,
        // Nothing on screen — the sound is the whole prompt, and showing the
        // translation would turn this into the typing exercise.
        prompt: "",
        speak: word.front,
        audioUrl: word.audioUrl ?? null,
        audioSlowUrl: word.audioSlowUrl ?? null,
        transcription: word.transcription ?? null,
        answer: word.front,
      };
    }

    case "typing": {
      return {
        kind,
        wordId: word.id,
        prompt: word.back,
        transcription: word.transcription ?? null,
        answer: word.front,
      };
    }

    case "verb-forms": {
      const forms = word.forms;
      return {
        kind,
        wordId: word.id,
        prompt: word.front,
        caption: word.forms?.gloss ?? word.back,
        speak: word.front,
        audioUrl: word.audioUrl ?? null,
        audioSlowUrl: word.audioSlowUrl ?? null,
        transcription: word.transcription ?? null,
        past: forms?.past ?? "",
        participle: forms?.participle ?? "",
        ...(forms?.acceptPast ? { acceptPast: forms.acceptPast } : {}),
      };
    }
  }
}

function choiceOn(
  answer: string,
  word: PracticeWord,
  pool: readonly PracticeWord[],
  rng: ReturnType<typeof seededRng>,
  side: "front" | "back" = "back",
) {
  const candidates: Candidate[] = pool
    .filter((other) => other.id !== word.id)
    .map((other) => ({
      id: other.id,
      text: side === "front" ? other.front : other.back,
      shape: kindOf(other.front),
      partOfSpeech: other.partOfSpeech ?? null,
    }));

  const distractors = pickDistractors(answer, candidates, OPTION_COUNT - 1, rng, {
    shape: kindOf(word.front),
    partOfSpeech: word.partOfSpeech,
  });
  return buildOptions(answer, distractors, rng);
}

/**
 * Tiles the builder deals. A word is letters; a phrase is its words. The old
 * half-measure — one tile per character, spaces included — handed `give up`
 * seven tiles and made assembling it a spelling test of a collocation.
 */
export function tilesOf(answer: string): string[] {
  const text = answer.trim();
  return kindOf(text) === "phrase" ? text.split(/\s+/) : [...answer];
}

function assembled(tiles: readonly string[], answer: string): string {
  return kindOf(answer.trim()) === "phrase" ? tiles.join(" ") : tiles.join("");
}

/**
 * The tiles of the answer, shuffled — and never landing back on the answer,
 * which would make the exercise a no-op.
 */
function scramble(answer: string, rng: ReturnType<typeof seededRng>): string[] {
  const tiles = tilesOf(answer);
  if (tiles.length < 2) return tiles;

  const original = assembled(tiles, answer);
  for (let attempt = 0; attempt < 5; attempt++) {
    const shuffled = shuffle(tiles, rng);
    if (assembled(shuffled, answer) !== original) return shuffled;
  }
  // A word of repeated letters ("aaa") cannot be shuffled into anything else.
  return shuffle(tiles, rng);
}

/** Whether a format needs sound, and therefore a voice to be available. */
export function needsAudio(kind: ExerciseKind): boolean {
  return kind === "audio-choice" || kind === "listening";
}

/** Whether the answer is typed rather than chosen. */
export function isTyped(kind: ExerciseKind): boolean {
  return kind === "listening" || kind === "typing" || kind === "verb-forms";
}
