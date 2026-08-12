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
};

/**
 * Bands, tried in order. Each is a plausibility test: a word of the same
 * length starting with the same letter is genuinely confusable, a word of
 * roughly the same length is somewhat, and anything else is filler.
 */
const BANDS: ((answer: string, other: string) => boolean)[] = [
  (answer, other) =>
    Math.abs(other.length - answer.length) <= 1 && sameStart(answer, other, 2),
  (answer, other) => Math.abs(other.length - answer.length) <= 2,
  (answer, other) => sameStart(answer, other, 1),
  () => true,
];

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
): string[] {
  const answerKey = normalizeKey(answer);
  const seen = new Set<string>([answerKey]);

  const usable = pool.filter((candidate) => {
    const key = normalizeKey(candidate.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const chosen: string[] = [];
  const taken = new Set<string>();

  for (const band of BANDS) {
    if (chosen.length >= count) break;
    const matching = usable.filter(
      (candidate) => !taken.has(candidate.id) && band(answer, candidate.text),
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
