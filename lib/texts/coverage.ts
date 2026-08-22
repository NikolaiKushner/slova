import type { ParsedText, TextToken } from "@/lib/texts/tokenize";

/**
 * The share of a text's running words the reader already has — docs/plans/shipped/reader.md
 * §1. Comprehension tracks this number, so it is counted over every running
 * word, not only over the ones the shared base happens to know.
 */

/** Hu & Nation: 98% reads unassisted, 95% reads with help. §1. */
export const READABLE_PERCENT = 98;
export const WITH_HELP_PERCENT = 95;

export type Readability = "readable" | "withHelp" | "hard";

export function readabilityOf(percent: number): Readability {
  if (percent >= READABLE_PERCENT) return "readable";
  if (percent >= WITH_HELP_PERCENT) return "withHelp";
  return "hard";
}

export type Coverage = {
  running: number;
  runningKnown: number;
  unique: number;
  uniqueKnown: number;
  /** `runningKnown / running`, 0–100. Zero for a text with no words. */
  percent: number;
};

export function isKnown(
  token: TextToken,
  known: ReadonlySet<string>,
): boolean {
  return known.has(token.key) || known.has(token.lemma);
}

export function coverageOf(
  parsed: ParsedText,
  known: ReadonlySet<string>,
): Coverage {
  const uniqueKeys = new Map<string, boolean>();
  let running = 0;
  let runningKnown = 0;

  for (const paragraph of parsed.paragraphs) {
    for (const token of paragraph.tokens) {
      const hit = isKnown(token, known);
      running += 1;
      if (hit) runningKnown += 1;
      uniqueKeys.set(token.lemma, hit);
    }
  }

  let uniqueKnown = 0;
  for (const hit of uniqueKeys.values()) if (hit) uniqueKnown += 1;

  return {
    running,
    runningKnown,
    unique: uniqueKeys.size,
    uniqueKnown,
    percent: running === 0 ? 0 : (runningKnown / running) * 100,
  };
}
