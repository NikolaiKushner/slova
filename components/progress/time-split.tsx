import { useTranslations } from "next-intl";

import type { StudyTime } from "@/lib/progress";
import {
  TIME_BANDS,
  TIME_BAND_OF_KIND,
  type ActivityKind,
  type TimeBand,
} from "@/lib/progress-config";
import { cn } from "@/lib/utils";

const BAND_CLASS: Record<TimeBand, string> = {
  practice: "bg-data-learned",
  grammar: "bg-data-learning",
  reading: "bg-data-untouched",
};

const BAND_LABEL: Record<
  TimeBand,
  "timeBandPractice" | "timeBandGrammar" | "timeBandReading"
> = {
  practice: "timeBandPractice",
  grammar: "timeBandGrammar",
  reading: "timeBandReading",
};

/** The minutes every sitting has been recording, as practice against grammar. */
export function TimeSplit({ time }: { time: StudyTime }) {
  const t = useTranslations("progress");
  const byBand = groupByBand(time.weekByKind);
  const total = TIME_BANDS.reduce((sum, band) => sum + byBand[band], 0);
  const spent = TIME_BANDS.filter((band) => byBand[band] > 0);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-numeral tabular-nums">
          {span(time.weekMinutes, t)}
        </p>
        <p className="text-muted-foreground mt-1 text-caption">
          {time.todayMinutes > 0
            ? t("timeToday", { minutes: time.todayMinutes })
            : t("timeNothingToday")}
        </p>
      </div>

      <div className="bg-data-track flex h-2 overflow-hidden rounded-full">
        {spent.map((band) => (
          <span
            key={band}
            className={cn("h-full", BAND_CLASS[band])}
            style={{ width: `${(byBand[band] / total) * 100}%` }}
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
        {spent.map((band) => (
          <li key={band} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", BAND_CLASS[band])} />
            <span className="font-medium tabular-nums">
              {span(byBand[band], t)}
            </span>
            <span className="text-muted-foreground">{t(BAND_LABEL[band])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function groupByBand(
  byKind: Record<ActivityKind, number>,
): Record<TimeBand, number> {
  const bands = { practice: 0, grammar: 0, reading: 0 };
  for (const [kind, minutes] of Object.entries(byKind)) {
    bands[TIME_BAND_OF_KIND[kind as ActivityKind]] += minutes;
  }
  return bands;
}

function span(
  minutes: number,
  t: (
    key: "timeHoursMinutes" | "timeMinutes",
    values: { hours?: number; minutes: number },
  ) => string,
): string {
  if (minutes < 60) return t("timeMinutes", { minutes });
  return t("timeHoursMinutes", {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  });
}
