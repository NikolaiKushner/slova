import { useTranslations } from "next-intl";

import { type Coverage, readabilityOf } from "@/lib/texts/coverage";
import { cn } from "@/lib/utils";

/** How much of a text the reader already has — docs/plans/shipped/reader.md §6.6. */
export function TextCoverage({
  coverage,
  /** On a list row, where the count of words to look up is not the question. */
  compact = false,
  className,
}: {
  coverage: Coverage;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("texts");

  return (
    <p className={cn("text-caption text-muted-foreground", className)}>
      <span className="text-foreground font-medium tabular-nums">
        {t("coveragePercent", { percent: Math.round(coverage.percent) })}
      </span>
      {" · "}
      {t(readabilityOf(coverage.percent))}
      {compact ? null : (
        <>
          {" · "}
          {t("newWords", { count: coverage.running - coverage.runningKnown })}
        </>
      )}
    </p>
  );
}
