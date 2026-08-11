/**
 * How well a word is known, on a scale of one to five.
 *
 * Derived from the schedule rather than stored beside it. The spacing
 * algorithm already knows everything about how a word is going: `introducedAt`
 * says whether it has ever been studied, and `intervalDays` is how long the
 * algorithm is willing to go without asking again — which is precisely a
 * measure of confidence. A second column holding the same fact would only
 * introduce a way for the two to disagree, and it would disagree silently.
 *
 * It is also monotone in `intervalDays`, so a list sorted by rating is a list
 * sorted by that column — the database can do it, and pagination stays honest.
 */

export const MAX_RATING = 5;

/** Interval in days at which a word counts as learned — the top of the scale. */
export const LEARNED_INTERVAL_DAYS = 21;

export type RatedWord = {
  introducedAt: Date | null;
  intervalDays: number;
};

export type Rating = 1 | 2 | 3 | 4 | 5;

/**
 * The boundaries are the ones the scheduler already works in: a word answered
 * for the first time gets days, a word that has stuck gets weeks. Twenty-one
 * days is the same line the rest of the app calls "learned".
 */
export function ratingOf(word: RatedWord): Rating {
  if (word.introducedAt === null) return 1;
  if (word.intervalDays < 3) return 2;
  if (word.intervalDays < 10) return 3;
  if (word.intervalDays < LEARNED_INTERVAL_DAYS) return 4;
  return 5;
}

/** What the rating means, for a tooltip or a screen reader. */
export function ratingLabel(rating: Rating): string {
  switch (rating) {
    case 1:
      return "Not started";
    case 2:
      return "Just learned";
    case 3:
      return "Coming along";
    case 4:
      return "Nearly there";
    case 5:
      return "Learned";
  }
}
