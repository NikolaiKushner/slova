"use client";

import { cn } from "@/lib/utils";

/**
 * Lesson steps — §14. A row of 26×4 bars: cleared green-400, current
 * green-700, still to come neutral-200.
 *
 * Carries `role="progressbar"` per §18, and its label counts steps rather than
 * naming them — the same rule as StageRail, for the same reason.
 */
export function ProgressSteps({
  total,
  current,
  label,
  className,
}: {
  total: number;
  /** Zero-based index of the step being worked on. */
  current: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(current + 1, total)}
      aria-label={label}
      className={cn("flex items-center gap-1.5", className)}
    >
      {Array.from({ length: total }, (_, step) => (
        <span
          key={step}
          className={cn(
            "h-1 w-[26px] rounded-full transition-colors duration-(--motion-slow) ease-(--ease-emphasized)",
            step < current
              ? "bg-data-learning"
              : step === current
                ? "bg-data-learned"
                : "bg-data-untouched",
          )}
        />
      ))}
    </div>
  );
}
