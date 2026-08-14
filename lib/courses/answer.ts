import { acceptedAnswers, type Exercise } from "@/content/courses/schema";

/**
 * Judging a grammar answer.
 *
 * This is not the vocabulary judge. A single letter is often the whole
 * point (*likes* / *like*), so "almost" would mark the miss as knowledge.
 * Variants we do accept — *doesn't* and *does not* — are listed on the
 * exercise, not guessed with an edit distance.
 */

export type GrammarVerdict = "correct" | "wrong";

export function normalizeGrammarAnswer(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

export function gradeExercise(
  exercise: Exercise,
  given: string,
): GrammarVerdict {
  const got = normalizeGrammarAnswer(given);
  if (!got) return "wrong";

  return acceptedAnswers(exercise).some(
    (item) => normalizeGrammarAnswer(item) === got,
  )
    ? "correct"
    : "wrong";
}
