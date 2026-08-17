import { kindOf } from "@/lib/lexicon/dataset";
import { normalizeKey } from "@/lib/lexicon/key";
import { shuffle, type Rng } from "@/lib/practice/random";

/**
 * Choosing the wrong answers.
 *
 * This is the part of a multiple-choice trainer that decides whether it
 * teaches anything. If the three wrong options are picked at random, the right
 * one is obvious from its shape alone and the learner practises spotting the
 * odd word out rather than recalling a meaning. That complaint — distractors
 * "picked out of thin air", nothing like the answer in sense or spelling — is
 * the most common one levelled at the app this borrows its formats from.
 *
 * So the choice is graded. Nearest first, random only when nothing else is
 * left, and never so near that two options are both defensible.
 */

export type Candidate = {
  id: string;
  /** The text that would appear as an option. */
  text: string;
  /**
   * Word vs phrase of the English side, not of `text`. A translation-to-word
   * question shows English, but a word-to-translation question shows Russian
   * — and «сдаться» is one word even when it stands for `give up`. Shape is
   * a property of the lexeme, carried here so a phrase is not given away by
   * sitting next to three single words.
   */
  shape?: "word" | "phrase";
  partOfSpeech?: string | null;
};

export type DistractorOptions = {
  shape?: "word" | "phrase";
  partOfSpeech?: string | null;
};

function shapeOf(candidate: Candidate): "word" | "phrase" {
  return candidate.shape ?? kindOf(candidate.text);
}

/** Letters of a word, words of a phrase — the length that actually shows. */
function sizeOf(text: string): number {
  return kindOf(text) === "phrase" ? text.trim().split(/\s+/).length : text.length;
}

/**
 * Bands, tried in order. Each is a plausibility test: a word of the same
 * length starting with the same letter is genuinely confusable, a word of
 * roughly the same length is somewhat, and anything else is filler.
 */
type Band = (answer: string, other: Candidate) => boolean;

function bandsFor(partOfSpeech?: string | null): Band[] {
  const pos = partOfSpeech?.trim() || null;
  const samePos: Band = (_answer, other) =>
    Boolean(pos && other.partOfSpeech && other.partOfSpeech === pos);

  return [
    (answer, other) =>
      samePos(answer, other) &&
      Math.abs(sizeOf(other.text) - sizeOf(answer)) <= 1 &&
      sameStart(answer, other.text, 2),
    (answer, other) =>
      samePos(answer, other) &&
      Math.abs(sizeOf(other.text) - sizeOf(answer)) <= 2,
    (answer, other) =>
      Math.abs(sizeOf(other.text) - sizeOf(answer)) <= 1 &&
      sameStart(answer, other.text, 2),
    (answer, other) => Math.abs(sizeOf(other.text) - sizeOf(answer)) <= 2,
    (answer, other) => sameStart(answer, other.text, 1),
    () => true,
  ];
}

function sameStart(a: string, b: string, chars: number): boolean {
  return a.slice(0, chars).toLowerCase() === b.slice(0, chars).toLowerCase();
}

/**
 * `count` wrong options for `answer`, drawn from `pool`.
 *
 * Anything that reads the same as the answer is excluded, not just the answer
 * itself: two words in someone's dictionary can share a translation, and an
 * option that is also right makes the question unanswerable.
 */
export function pickDistractors(
  answer: string,
  pool: readonly Candidate[],
  count: number,
  rng: Rng,
  options: DistractorOptions = {},
): string[] {
  const answerKey = normalizeKey(answer);
  const seen = new Set<string>([answerKey]);

  const unique = pool.filter((candidate) => {
    const key = normalizeKey(candidate.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const answerShape = options.shape ?? kindOf(answer);
  const sameShape = unique.filter((candidate) => shapeOf(candidate) === answerShape);
  // Same shape is the whole point of this filter — a phrase next to three
  // single words is guessed before it is read. Fall back only when the pool
  // cannot fill the count, rather than returning a thin question.
  const usable = sameShape.length >= count ? sameShape : unique;

  const chosen: string[] = [];
  const taken = new Set<string>();

  for (const band of bandsFor(options.partOfSpeech)) {
    if (chosen.length >= count) break;
    const matching = usable.filter(
      (candidate) => !taken.has(candidate.id) && band(answer, candidate),
    );
    for (const candidate of shuffle(matching, rng)) {
      if (chosen.length >= count) break;
      taken.add(candidate.id);
      chosen.push(candidate.text);
    }
  }

  return chosen;
}

/**
 * The options for a question, in a stable but unguessable order, plus where
 * the right one ended up. Returning the index rather than the text keeps the
 * caller from having to compare strings it may have normalised differently.
 */
export function buildOptions(
  answer: string,
  distractors: readonly string[],
  rng: Rng,
): { options: string[]; answerIndex: number } {
  const options = shuffle([answer, ...distractors], rng);
  return { options, answerIndex: options.indexOf(answer) };
}
