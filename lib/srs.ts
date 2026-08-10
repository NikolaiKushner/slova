export type ReviewRating = "again" | "good";

export type SrsCardState = {
  intervalDays: number;
  ease: number;
  dueAt: Date;
};

/** Card state stored on a review log so the rating can be taken back. */
export type ReviewSnapshot = {
  prevIntervalDays: number | null;
  prevEase: number | null;
  prevDueAt: Date | null;
  prevIntroducedAt: Date | null;
};

export type RestoredCardState = {
  intervalDays: number;
  ease: number;
  dueAt: Date;
  introducedAt: Date | null;
};

/**
 * Card state to write back when undoing a rating, or null when the log has no
 * snapshot — rows written before undo existed cannot be restored.
 */
export function restoreFromSnapshot(
  log: ReviewSnapshot,
): RestoredCardState | null {
  if (
    log.prevIntervalDays === null ||
    log.prevEase === null ||
    log.prevDueAt === null
  ) {
    return null;
  }

  return {
    intervalDays: log.prevIntervalDays,
    ease: log.prevEase,
    dueAt: log.prevDueAt,
    introducedAt: log.prevIntroducedAt,
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Simple spaced repetition: again → due now; good → 1 day, then grow by ease. */
export function scheduleReview(
  card: Pick<SrsCardState, "intervalDays" | "ease">,
  rating: ReviewRating,
  now: Date = new Date(),
): SrsCardState {
  if (rating === "again") {
    return {
      intervalDays: 0,
      ease: Math.max(1.3, card.ease - 0.2),
      dueAt: now,
    };
  }

  const nextInterval =
    card.intervalDays <= 0 ? 1 : Math.max(1, card.intervalDays * card.ease);
  const ease = Math.min(3.0, card.ease + 0.05);

  return {
    intervalDays: nextInterval,
    ease,
    dueAt: new Date(now.getTime() + nextInterval * MS_PER_DAY),
  };
}
