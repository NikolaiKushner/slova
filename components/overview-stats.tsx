import { useTranslations } from "next-intl";

import type { Overview } from "@/lib/overview";
import { cn } from "@/lib/utils";

/**
 * Learned / learning / new as a segmented bar. The progress page wraps this
 * in a compact card; hit rate stays off — that is an operational metric.
 */
export function OverviewStats({ overview }: { overview: Overview }) {
  const t = useTranslations("overview");

  const bands = [
    { key: "learned" as const, value: overview.learned, className: "bg-data-learned" },
    { key: "learning" as const, value: overview.learning, className: "bg-data-learning" },
    { key: "notStarted" as const, value: overview.fresh, className: "bg-data-untouched" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-data-track flex h-2 overflow-hidden rounded-full">
        {bands
          .filter((band) => band.value > 0)
          .map((band) => (
            <span
              key={band.key}
              className={cn("h-full", band.className)}
              style={{ width: `${(band.value / overview.entries) * 100}%` }}
            />
          ))}
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
        {bands.map((band) => (
          <li key={band.key} className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", band.className)} />
            <span className="font-medium tabular-nums">{band.value}</span>
            <span className="text-muted-foreground">{t(band.key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
