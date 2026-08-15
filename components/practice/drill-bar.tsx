"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * The one line of chrome a running training keeps.
 *
 * A drill has no page title — the question is the page. What it does need is
 * the three things somebody mid-session actually looks up: the way out, how
 * far along they are, and how it is going. The counts are split into right and
 * missed rather than shown as a score, because "14 / 20" during a drill reads
 * as a grade to protect; "3 missed" reads as three words that will come back.
 *
 * Not used by Brainstorm. That session drills to mastery and shows words left,
 * never a proportion — see DESIGN.md.
 */
export function DrillBar({
  current,
  total,
  right,
  missed,
}: {
  /** 1-based, so it reads like the question number it is. */
  current: number;
  total: number;
  right: number;
  missed: number;
}) {
  const t = useTranslations("practice");
  const done = Math.min(current - 1, total);

  return (
    <div className="bg-background/80 sticky top-0 z-10 flex items-center gap-4 border-b border-border py-3 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground shrink-0"
        render={<Link href="/practice" />}
      >
        <ChevronLeft className="size-4" />
        {t("title")}
      </Button>

      <div
        className="bg-border mx-auto hidden h-1 w-full max-w-[560px] overflow-hidden rounded-full sm:block"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={t("title")}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>

      <div className="text-muted-foreground flex shrink-0 items-center gap-3.5 text-sm whitespace-nowrap">
        <span>
          <b className="text-foreground font-medium tabular-nums">{current}</b>
          {" / "}
          <span className="tabular-nums">{total}</span>
        </span>
        <span className="text-correct tabular-nums">
          {t("rightCount", { count: right })}
        </span>
        <span className="text-wrong tabular-nums">
          {t("missedCount", { count: missed })}
        </span>
      </div>
    </div>
  );
}
