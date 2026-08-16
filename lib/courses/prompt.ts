import { acceptedAnswers, type Exercise } from "@/content/courses/schema";

/**
 * How a grammar prompt is drawn: a sentence with a gap, or a whole line.
 *
 * Choice and gap items are written `She ___ here. (live)` — the underscores
 * are the blank, and a trailing `(hint)` is the dictionary form, not part of
 * the sentence. Practice fills the blank after an answer; the hint never
 * belongs on screen as the answer (§1.6 / §20).
 */

const GAP = /_{2,}/;
const TRAILING_HINT = /\s*\(([^)]+)\)\s*$/;

export type GapPrompt = {
  before: string;
  after: string;
  hint: string | null;
  hasGap: boolean;
};

export function splitGapPrompt(prompt: string): GapPrompt {
  const hintMatch = TRAILING_HINT.exec(prompt);
  const hint = hintMatch?.[1]?.trim() || null;
  const stripped = hintMatch ? prompt.slice(0, hintMatch.index) : prompt;
  const gapMatch = GAP.exec(stripped);

  if (!gapMatch || gapMatch.index === undefined) {
    return { before: stripped, after: "", hint, hasGap: false };
  }

  return {
    before: stripped.slice(0, gapMatch.index),
    after: stripped.slice(gapMatch.index + gapMatch[0].length),
    hint,
    hasGap: true,
  };
}

/**
 * The letters that the right form adds on top of a neighbour (speak → speaks).
 * Returns null when there is no shared stem — then the whole word is shown.
 */
export function endingAgainst(answer: string, others: readonly string[]): {
  stem: string;
  ending: string;
} | null {
  let best = 0;
  for (const other of others) {
    if (other === answer) continue;
    const n = sharedPrefixLength(answer, other);
    if (n > best) best = n;
  }
  if (best <= 0 || best >= answer.length) return null;
  if (best < 2 || answer.length - best > 4) return null;
  return { stem: answer.slice(0, best), ending: answer.slice(best) };
}

/**
 * Dictionary-form cue for a typed gap. Null when there is no hint, or when
 * the hint is the answer itself — that would print the key in the box.
 */
export function typedPlaceholderHint(
  exercise: Extract<Exercise, { kind: "gap" }>,
): string | null {
  const { hint } = splitGapPrompt(exercise.prompt);
  if (!hint) return null;
  const leaked = acceptedAnswers(exercise).some(
    (item) => item.trim().toLowerCase() === hint.trim().toLowerCase(),
  );
  return leaked ? null : hint;
}

function sharedPrefixLength(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let i = 0;
  while (i < limit && a[i] === b[i]) i += 1;
  return i;
}
