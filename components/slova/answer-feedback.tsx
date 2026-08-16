"use client";

import { Check, TriangleAlert, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type Verdict = "correct" | "almost" | "incorrect";

/**
 * The line under the answer — §14.
 *
 * The container is 44px whether or not there is anything in it. A reaction
 * that appears and pushes the options up the screen is the single most
 * jarring thing a drill can do, and §1.4 rules it out.
 *
 * `almost` is not in the specification because the specification describes two
 * verdicts. The product has three: a typed answer one letter out is neither
 * right nor wrong, and calling it wrong teaches the wrong lesson. It gets the
 * warning colours from §4.3, which is exactly the slot they exist for.
 */
export function AnswerFeedback({
  verdict,
  answer,
  note,
  className,
}: {
  verdict: Verdict | null;
  /** The right answer, shown when the learner did not produce it. */
  answer?: string;
  /** Session bookkeeping, e.g. "ступень 2 → 3". Never the answer itself. */
  note?: string;
  className?: string;
}) {
  const t = useTranslations("common");

  return (
    <div
      aria-live="polite"
      className={cn("flex h-11 items-center gap-3", className)}
    >
      {verdict ? (
        <>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-2 text-sm font-medium",
              verdict === "correct" && "text-success",
              verdict === "almost" && "text-warning",
              verdict === "incorrect" && "text-destructive",
            )}
          >
            {verdict === "correct" ? (
              <Check className="size-4" strokeWidth={2.3} />
            ) : verdict === "almost" ? (
              <TriangleAlert className="size-4" strokeWidth={2} />
            ) : (
              <X className="size-4" strokeWidth={2.3} />
            )}
            {verdict === "correct"
              ? t("correct")
              : verdict === "almost"
                ? t("almost")
                : t("incorrect")}
          </span>

          {verdict !== "correct" && answer ? (
            <span className="text-muted-foreground min-w-0 truncate text-sm">
              —{" "}
              <b lang="en" className="font-display text-foreground text-[17px] font-medium">
                {answer}
              </b>
            </span>
          ) : null}

          {note ? (
            <span className="text-muted-foreground ml-auto shrink-0 text-caption">
              {note}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
