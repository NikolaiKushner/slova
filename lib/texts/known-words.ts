import { readFileSync } from "node:fs";

import { normalizeKey } from "@/lib/lexicon/key";

/**
 * The words a coverage figure may assume without being told. A dictionary
 * never holds `the` or `and`, so counted against it alone an A2 narrative
 * scores 12% and the thresholds mean nothing — docs/plans/reader.md §10.
 */

export const ASSUMED_KNOWN_WORDS = 500;

const FREQUENCY_LIST = "content/lexicon/en-frequency.txt";

/** The source list has no single-letter entries, so the two real ones are lost. */
const SINGLE_LETTER_WORDS = ["a", "i"];

let assumed: Set<string> | null = null;

export function assumedKnown(): ReadonlySet<string> {
  if (assumed) return assumed;

  assumed = new Set([
    ...SINGLE_LETTER_WORDS,
    ...readFileSync(FREQUENCY_LIST, "utf8")
      .split("\n")
      .slice(0, ASSUMED_KNOWN_WORDS)
      .map((line) => normalizeKey(line))
      .filter(Boolean),
  ]);
  return assumed;
}

export function knownKeys(
  dictionary: readonly { key: string }[],
): ReadonlySet<string> {
  const keys = new Set(assumedKnown());
  for (const word of dictionary) keys.add(word.key);
  return keys;
}
