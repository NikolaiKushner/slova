"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * What the word was, letter by letter, after a written answer.
 *
 * The written formats — type it, take dictation, build it from letters — are
 * the only ones where spelling is the whole question, and "Неверно" on its own
 * teaches nothing there: the learner is left to spot the difference between
 * what they wrote and what was right by holding both in their head. So the
 * answer is spelled out with the letters that matched in green and the ones
 * that did not in red and underlined, and what they actually typed is quoted
 * underneath.
 *
 * It replaces the input rather than sitting under it, which is also what keeps
 * the answer zone the same height before and after.
 */
export function AnswerReveal({
  answer,
  given,
  /** IPA when the shared base has it, and the translation for dictation. */
  note,
  correct,
  built,
  className,
}: {
  answer: string;
  /** What was typed or assembled. Omitted when it was right. */
  given?: string;
  note?: string;
  correct: boolean;
  /** Assembled from letters rather than typed — only the wording differs. */
  built?: boolean;
  className?: string;
}) {
  const t = useTranslations("practice");

  return (
    <div className={cn("text-center", className)}>
      <p
        lang="en"
        className="font-display text-[2.75rem] leading-tight font-medium tracking-[0.01em]"
      >
        {[...answer].map((letter, index) => {
          // Compared position by position, which is what the eye does anyway.
          const matched =
            correct || (given?.[index] ?? "").toLowerCase() === letter.toLowerCase();
          return (
            <span
              key={index}
              className={
                matched
                  ? "text-success"
                  : "text-destructive border-destructive-border border-b-2"
              }
            >
              {letter}
            </span>
          );
        })}
      </p>

      {!correct && given ? (
        <p className="text-muted-foreground mt-2.5 text-caption">
          {t.rich(built ? "youBuilt" : "youWrote", {
            given: () => (
              <b
                lang="en"
                className="font-display text-destructive text-base font-medium"
              >
                {given}
              </b>
            ),
          })}
        </p>
      ) : null}

      {note ? (
        <p className="text-disabled-foreground mt-1.5 text-caption">{note}</p>
      ) : null}
    </div>
  );
}
