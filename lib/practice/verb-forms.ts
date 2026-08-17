/**
 * How many new triples the first-look table holds. Small enough to glance,
 * close to Brainstorm's 6 and a course lesson's 10.
 */
export const VERB_FORMS_INTRO_SIZE = 8;

/**
 * Review sittings. Kept here rather than imported from session.ts so this
 * module stays free of Prisma — same number as TRAINING_SIZE.
 */
export const VERB_FORMS_REVIEW_SIZE = 20;

export type VerbFormsSitting = "review" | "intro" | "caught-up" | "empty";

export type VerbFormsCandidate = {
  introducedAt: Date | null;
  dueAt: Date | null;
  /** Position in the curated table; missing ranks sort last. */
  rank: number;
};

/**
 * One sitting of the self-contained verb-forms training.
 *
 * Ignores the source bar on purpose: this corpus is the 95 triples, not
 * "whatever the dictionary filter currently says". Due reviews first, else
 * unseen verbs in table order, else caught up — never mixed, never the add
 * stub if any of the 95 are already in the dictionary.
 */
export function pickVerbFormsSitting<T extends VerbFormsCandidate>(
  candidates: readonly T[],
  now: Date,
): { words: T[]; sitting: VerbFormsSitting } {
  if (candidates.length === 0) return { words: [], sitting: "empty" };

  const due = candidates
    .filter(
      (word) =>
        word.introducedAt !== null &&
        word.dueAt !== null &&
        word.dueAt.getTime() <= now.getTime(),
    )
    .sort(
      (left, right) =>
        (left.dueAt?.getTime() ?? 0) - (right.dueAt?.getTime() ?? 0),
    );
  if (due.length > 0) {
    return { words: due.slice(0, VERB_FORMS_REVIEW_SIZE), sitting: "review" };
  }

  const fresh = [...candidates]
    .filter((word) => word.introducedAt === null)
    .sort((left, right) => left.rank - right.rank);
  if (fresh.length > 0) {
    return { words: fresh.slice(0, VERB_FORMS_INTRO_SIZE), sitting: "intro" };
  }

  return { words: [], sitting: "caught-up" };
}

/** Earliest future due among already-introduced verbs, for the caught-up copy. */
export function nextVerbFormsDue<T extends VerbFormsCandidate>(
  candidates: readonly T[],
  now: Date,
): Date | null {
  const upcoming = candidates
    .map((word) => word.dueAt)
    .filter((due): due is Date => due !== null && due.getTime() > now.getTime())
    .sort((left, right) => left.getTime() - right.getTime());
  return upcoming[0] ?? null;
}
