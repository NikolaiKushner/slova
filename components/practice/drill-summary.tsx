"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Eyebrow } from "@/components/slova/eyebrow";
import { Button } from "@/components/ui/button";

/**
 * The end of a training.
 *
 * It used to be the shared empty state with a sentence in it, which was right
 * about the tone and wrong about the content: the interesting part of a
 * finished drill is the shape of it — how many, how many missed, how long it
 * took — and a sentence cannot hold three numbers legibly.
 *
 * Missed words are not a failure to soften. They are the words that come back
 * sooner, and the line under the numbers says exactly that.
 */
export function DrillSummary({
  right,
  total,
  seconds,
  onRestart,
}: {
  right: number;
  total: number;
  seconds: number;
  onRestart: () => void;
}) {
  const t = useTranslations("practice");
  const missed = total - right;

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Eyebrow>{t("doneEyebrow")}</Eyebrow>
      <h2 className="text-h1 mt-2.5">
        {missed === 0
          ? t("allRightTitle", { total })
          : t("scoreTitle", { right, total })}
      </h2>
      <p className="text-muted-foreground mt-3 max-w-sm">
        {missed === 0 ? t("allRight") : t("someMissed")}
      </p>

      <dl className="mt-8 flex items-start justify-center gap-9">
        <Score value={String(right)} label={t("scoreRight")} tone="right" />
        <Score value={String(missed)} label={t("scoreMissed")} tone="missed" />
        <Score value={clock(seconds)} label={t("scoreTime")} />
      </dl>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" size="lg" onClick={onRestart}>
          {t("restart")}
        </Button>
        <Button variant="ghost" size="lg" render={<Link href="/practice" />}>
          {t("backToTrainings")}
        </Button>
      </div>
    </div>
  );
}

function Score({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "right" | "missed";
}) {
  return (
    <div>
      <dd
        className={
          tone === "right"
            ? "font-display text-success text-4xl leading-none tabular-nums"
            : tone === "missed"
              ? "font-display text-destructive text-4xl leading-none tabular-nums"
              : "font-display text-4xl leading-none tabular-nums"
        }
      >
        {value}
      </dd>
      <dt className="text-muted-foreground mt-1.5 text-xs">{label}</dt>
    </div>
  );
}

/** `m:ss`. Minutes only — a training long enough to need hours is a bug. */
function clock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
