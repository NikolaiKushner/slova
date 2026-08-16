import { MAX_RATING, ratingLabel, type Rating } from "@/lib/word-rating";
import { cn } from "@/lib/utils";

/**
 * How well a word is known, as five dots.
 *
 * Dots rather than a number or a bar: the scale has five steps and no units,
 * and a row of a table is read at a glance. Coloured from the data tokens in
 * §5.3, the same green as a filled progress bar — this is how much of a word
 * is known, and it should look like every other "how much" in the product.
 */
export function WordRating({
  rating,
  /** In the legend the dots are an example, and naming them twice is noise. */
  decorative,
}: {
  rating: Rating;
  decorative?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1"
      {...(decorative
        ? { "aria-hidden": true }
        : {
            title: ratingLabel(rating),
            "aria-label": `${ratingLabel(rating)} — ${rating} of ${MAX_RATING}`,
          })}
    >
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            index < rating
              ? "bg-data-learned"
              : /*
                 * On a selected row the neutral empty dot disappears into the
                 * mint, and a scale you can only half see is worse than none.
                 */
                "bg-data-untouched group-data-[state=selected]:bg-accent-border",
          )}
        />
      ))}
    </span>
  );
}
