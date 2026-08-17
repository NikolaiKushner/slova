"use client";

import { useTranslations } from "next-intl";

import { Progress } from "@/components/ui/progress";
import { MEMORY_MIN_WORDS } from "@/lib/progress-config";

export function MemoryLine({
  memory,
  memoryWords,
  retentionMature,
}: {
  memory: number | null;
  memoryWords: number;
  retentionMature: number | null;
}) {
  const t = useTranslations("progress");
  const showForecast =
    memory !== null && memoryWords >= MEMORY_MIN_WORDS;
  if (!showForecast && retentionMature === null) return null;

  const percent = showForecast ? Math.round(memory * 100) : null;
  const retention =
    retentionMature === null ? null : Math.round(retentionMature * 100);

  return (
    <div className="space-y-3">
      {percent !== null ? (
        <>
          <p className="font-display text-numeral tabular-nums">
            {t("memoryPercent", { percent })}
          </p>
          <Progress value={percent} />
          <p className="text-muted-foreground text-caption">
            {t("memoryCaption")}
          </p>
        </>
      ) : null}
      {retention !== null ? (
        <p className="text-muted-foreground text-caption">
          {t("retention", { percent: retention })}
        </p>
      ) : null}
    </div>
  );
}
