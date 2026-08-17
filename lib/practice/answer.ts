import { normalizeKey } from "@/lib/lexicon/key";

/**
 * Judging a typed answer.
 *
 * The question is never "do these two strings match" — it is "did this person
 * know the word". Case, a stray space, a trailing full stop and the article
 * someone did or did not type are not knowledge, and marking them wrong
 * teaches typing rather than vocabulary. A single wrong letter is a different
 * matter: it is worth showing the correct spelling, but failing the answer
 * over it turns a learner into a proofreader.
 *
 * So there are three verdicts, not two, and the caller decides what "almost"
 * costs.
 */

export type Verdict = "correct" | "almost" | "wrong";

/** Articles are noise in a vocabulary answer: "a cat" and "cat" are the same. */
const LEADING_ARTICLE = /^(a|an|the|to)\s+/i;

function comparable(text: string): string {
  return normalizeKey(text).replace(LEADING_ARTICLE, "").trim();
}

/**
 * One edit away — insertion, deletion, substitution, or a swap of two
 * neighbours. The swap has to be in here: transposing adjacent letters is the
 * commonest typo there is, and plain Levenshtein scores it as two changes,
 * which would fail exactly the answers a person most obviously knew.
 *
 * Bounded on purpose. We never need the distance, only whether it is 0, 1 or
 * more, and the bounded form is short enough to read.
 */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;

  if (a.length === b.length) {
    const differing: number[] = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) differing.push(i);
      if (differing.length > 2) return false;
    }
    if (differing.length <= 1) return true;

    const [first, second] = differing;
    return (
      second === first + 1 && a[first] === b[second] && a[second] === b[first]
    );
  }

  if (Math.abs(a.length - b.length) !== 1) return false;

  // One is the other with a letter added: walk both, allow a single skip.
  const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  let skipped = false;

  for (let j = 0; j < longer.length; j++) {
    if (shorter[i] === longer[j]) {
      i++;
      continue;
    }
    if (skipped) return false;
    skipped = true;
  }

  return true;
}

export function judge(given: string, expected: string): Verdict {
  const a = comparable(given);
  const b = comparable(expected);

  if (!a) return "wrong";
  if (a === b) return "correct";

  // A typo in a three-letter word is a different word. The tolerance only
  // makes sense once there is enough word left to still recognise.
  if (b.length >= 4 && withinOneEdit(a, b)) return "almost";

  return "wrong";
}

/**
 * Whether an answer counts as passed. "Almost" passes — the learner knew the
 * word — but the caller is expected to show them the spelling they missed.
 */
export function passed(verdict: Verdict): boolean {
  return verdict !== "wrong";
}

/**
 * Two fields, one verdict. A miss in either is a miss — the card is the
 * triple, not one form — and "almost" wins only when neither is wrong, so a
 * typo in `gone` still shows the spelling without failing `went`.
 */
export function judgeForms(
  given: { past: string; participle: string },
  expected: { past: string; participle: string; acceptPast?: readonly string[] },
): Verdict {
  const past = judgeAgainst(given.past, expected.past, expected.acceptPast);
  const participle = judge(given.participle, expected.participle);

  if (past === "wrong" || participle === "wrong") return "wrong";
  if (past === "almost" || participle === "almost") return "almost";
  return "correct";
}

function judgeAgainst(
  given: string,
  expected: string,
  extras: readonly string[] = [],
): Verdict {
  const verdicts = [expected, ...extras].map((form) => judge(given, form));
  if (verdicts.includes("correct")) return "correct";
  if (verdicts.includes("almost")) return "almost";
  return "wrong";
}
