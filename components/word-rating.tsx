import { MAX_RATING, ratingLabel, type Rating } from "@/lib/word-rating";
import { cn } from "@/lib/utils";

/**
 * How well a word is known, as five dots.
 *
 * Dots rather than a number or a bar: the scale has five steps and no units,
 * and a row of a table is read at a glance. Soft sage, because this is
 * orientation rather than an action — the same rule the eyebrows follow.
 */
export function WordRating({ rating }: { rating: Rating }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      title={ratingLabel(rating)}
      aria-label={`${ratingLabel(rating)} — ${rating} of ${MAX_RATING}`}
    >
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            index < rating ? "bg-brand-soft" : "bg-border",
          )}
        />
      ))}
    </span>
  );
}
