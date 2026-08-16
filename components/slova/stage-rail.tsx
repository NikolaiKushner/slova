"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type StageRailWord = {
  id: string;
  /** Rungs cleared so far. */
  stage: number;
  /** Rungs on this word's ladder. */
  total: number;
};

/**
 * The brainstorm ladder — §14.
 *
 * ────────────────────────────────────────────────────────────
 * NOTHING HERE MAY NAME A WORD. Not the caption, not `title`, not
 * `aria-label`, not a tooltip.
 *
 * The right answer is always one of the words in the session. A rail captioned
 * with them is the answer key, printed above the question — worst of all in
 * "собрать из букв" and "перевод → слово", where it reads out literally. So a
 * column is labelled with its ordinal, and a finished one with a tick. The
 * `aria-label` says "Слово 3: 2 из 5 ступеней" and stops there.
 *
 * The session's contents are revealed exactly twice: on the start screen,
 * before anything is asked, and on the summary, after everything is.
 * ────────────────────────────────────────────────────────────
 */
export function StageRail({
  words,
  currentId,
  className,
}: {
  words: StageRailWord[];
  currentId?: string | null;
  className?: string;
}) {
  const t = useTranslations("practice");

  return (
    <div className={cn("flex items-start justify-center gap-2.5", className)}>
      {words.map((word, index) => {
        const done = word.stage >= word.total;
        const current = !done && word.id === currentId;

        return (
          <div
            key={word.id}
            className="w-[38px] shrink-0 lg:w-[54px]"
            aria-label={t("railWord", {
              index: index + 1,
              stage: Math.min(word.stage, word.total),
              total: word.total,
            })}
          >
            <div className="flex gap-0.5">
              {Array.from({ length: word.total }, (_, rung) => (
                <i
                  key={rung}
                  className={cn(
                    "block h-[5px] flex-1 rounded-[2px] transition-colors duration-(--motion-slow) ease-(--ease-emphasized)",
                    done
                      ? "bg-data-learned"
                      : rung < word.stage
                        ? "bg-data-learning"
                        : "bg-data-untouched",
                    /*
                     * The current column is marked by an inset outline on its
                     * segments rather than by the colour of its caption, so it
                     * still reads for someone who cannot separate the greens.
                     */
                    current && "ring-1 ring-ring/45 ring-inset",
                  )}
                />
              ))}
            </div>
            <div
              aria-hidden
              className={cn(
                "mt-[5px] text-center text-[11px] leading-none tabular-nums",
                done
                  ? "text-data-learning"
                  : current
                    ? "text-foreground font-semibold"
                    : "text-disabled-foreground",
              )}
            >
              {done ? (
                <Check className="mx-auto size-3" strokeWidth={2.6} />
              ) : (
                index + 1
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
