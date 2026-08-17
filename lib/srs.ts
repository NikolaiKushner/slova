import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type Grade,
} from "ts-fsrs";

/**
 * When a word comes back.
 *
 * This used to be a fixed multiplier over one ease factor: right answer,
 * interval times ease; wrong answer, back to zero. It worked, and it was the
 * crudest thing in the app — a model of memory with one number in it.
 *
 * FSRS keeps three: how long the memory currently lasts (stability), how hard
 * this particular word is for this particular person (difficulty), and how
 * likely it is to be recalled right now (retrievability, derived from the
 * other two and the time elapsed). Benchmarked over hundreds of millions of
 * real reviews it needs 20–30% fewer of them for the same retention.
 *
 * Worth knowing about the numbers: its parameters are meant to be fitted to a
 * person's own review history, and that needs on the order of a thousand
 * reviews. Until then it runs on defaults — which is still a memory model
 * rather than a multiplier, and the fitting can happen later without anything
 * here changing shape, because the history is already being recorded.
 */

const scheduler = fsrs();

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** What the app shows: two buttons, not four. */
export type ReviewRating = "again" | "good";

/** The scheduler state as this app stores it, in its own words. */
export type SrsCardState = {
  dueAt: Date;
  intervalDays: number;
  stability: number | null;
  difficulty: number | null;
  srsState: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReviewAt: Date | null;
};

/** Everything the scheduler needs to read off a word. */
export type ScheduledWord = {
  dueAt: Date;
  intervalDays: number;
  stability: number | null;
  difficulty: number | null;
  srsState: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReviewAt: Date | null;
};

function toCard(word: ScheduledWord): Card {
  // A word with no stability has never been reviewed under this scheduler —
  // including every word that predates it. Starting such a word fresh loses
  // nothing: the old ease factor was not a memory model and cannot be
  // translated into one, and its due date is kept until the next answer.
  if (word.stability === null || word.difficulty === null) {
    return createEmptyCard(word.lastReviewAt ?? undefined);
  }

  return {
    due: word.dueAt,
    stability: word.stability,
    difficulty: word.difficulty,
    elapsed_days: 0,
    scheduled_days: word.intervalDays,
    learning_steps: word.learningSteps,
    reps: word.reps,
    lapses: word.lapses,
    state: word.srsState as State,
    last_review: word.lastReviewAt ?? undefined,
  };
}

function fromCard(card: Card): SrsCardState {
  return {
    dueAt: card.due,
    // Days, from the two dates rather than `scheduled_days` — inside the
    // learning steps that field is zero while the card is genuinely due in
    // minutes, and the list would read every such word as brand new.
    intervalDays: Math.max(
      0,
      (card.due.getTime() - (card.last_review?.getTime() ?? card.due.getTime())) /
        MS_PER_DAY,
    ),
    stability: card.stability,
    difficulty: card.difficulty,
    srsState: card.state,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReviewAt: card.last_review ?? null,
  };
}

/** Two buttons onto four grades. Hard and Easy are for Brainstorm, below. */
function gradeOf(rating: ReviewRating): Grade {
  return rating === "again" ? Rating.Again : Rating.Good;
}

export function scheduleReview(
  word: ScheduledWord,
  rating: ReviewRating,
  now: Date = new Date(),
): SrsCardState {
  const { card } = scheduler.next(toCard(word), now, gradeOf(rating));
  return fromCard(card);
}

/**
 * Probability of recall right now, 0–1. Null until the word has a memory —
 * stability is what FSRS needs, and a word nobody has reviewed has none.
 */
export function retrievabilityOf(
  word: ScheduledWord,
  now: Date = new Date(),
): number | null {
  if (word.stability === null || word.difficulty === null) return null;
  return scheduler.get_retrievability(toCard(word), now, false);
}

export function meanRetrievability(
  words: ScheduledWord[],
  now: Date = new Date(),
): number | null {
  let sum = 0;
  let count = 0;
  for (const word of words) {
    const r = retrievabilityOf(word, now);
    if (r === null) continue;
    sum += r;
    count += 1;
  }
  return count === 0 ? null : sum / count;
}

/**
 * A word leaving Brainstorm, where the whole ladder was watched rather than a
 * single answer — so all four grades are available and worth using. A clean
 * run really is an easier word than one that took six goes, and this is the
 * only moment we will ever know that with any confidence.
 */
export function scheduleGraduation(
  errors: number,
  now: Date = new Date(),
): SrsCardState {
  const grade: Grade =
    errors === 0
      ? Rating.Easy
      : errors === 1
        ? Rating.Good
        : errors <= 3
          ? Rating.Hard
          : Rating.Again;

  const { card } = scheduler.next(createEmptyCard(now), now, grade);
  return fromCard(card);
}

/** The state to write onto a review log so the rating can be taken back. */
export function snapshotOf(word: ScheduledWord): SrsCardState {
  return {
    dueAt: word.dueAt,
    intervalDays: word.intervalDays,
    stability: word.stability,
    difficulty: word.difficulty,
    srsState: word.srsState,
    learningSteps: word.learningSteps,
    reps: word.reps,
    lapses: word.lapses,
    lastReviewAt: word.lastReviewAt,
  };
}

export type ReviewSnapshot = {
  prevCard?: unknown;
  prevIntervalDays: number | null;
  prevEase: number | null;
  prevDueAt: Date | null;
  prevIntroducedAt: Date | null;
};

export type RestoredCardState = SrsCardState & {
  introducedAt: Date | null;
};

/**
 * The state to put back when undoing a rating.
 *
 * Two shapes, because rows written before FSRS have only an interval and an
 * ease. Those restore what they can: the date and the interval are real, and
 * the memory model starts again from nothing, which is where it would have
 * been anyway. Returns null when there is no snapshot at all — the oldest
 * rows, from before undo existed.
 */
export function restoreFromSnapshot(
  log: ReviewSnapshot,
): RestoredCardState | null {
  if (isCardState(log.prevCard)) {
    return {
      ...log.prevCard,
      dueAt: new Date(log.prevCard.dueAt),
      lastReviewAt: log.prevCard.lastReviewAt
        ? new Date(log.prevCard.lastReviewAt)
        : null,
      introducedAt: log.prevIntroducedAt,
    };
  }

  if (
    log.prevIntervalDays === null ||
    log.prevEase === null ||
    log.prevDueAt === null
  ) {
    return null;
  }

  return {
    dueAt: log.prevDueAt,
    intervalDays: log.prevIntervalDays,
    stability: null,
    difficulty: null,
    srsState: State.New,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    lastReviewAt: null,
    introducedAt: log.prevIntroducedAt,
  };
}

type StoredCard = Omit<SrsCardState, "dueAt" | "lastReviewAt"> & {
  dueAt: string | Date;
  lastReviewAt: string | Date | null;
};

function isCardState(value: unknown): value is StoredCard {
  if (typeof value !== "object" || value === null) return false;
  const card = value as Record<string, unknown>;
  return "dueAt" in card && "srsState" in card && "reps" in card;
}
