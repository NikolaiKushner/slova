import Link from "next/link";
import { useTranslations } from "next-intl";

import { Section } from "@/components/section";
import type { Overview } from "@/lib/overview";
import { cn } from "@/lib/utils";

/**
 * How the dictionary is going, in four numbers and one bar.
 *
 * No charts and no tiles — the design system rules both out, and they would
 * be measuring the wrong thing anyway. The bar is the only picture here
 * because three proportions are genuinely easier to see than to read, and
 * because it is the shape of the answer to "am I getting anywhere": the
 * green end grows. Colours are the data tokens from §5.3.
 */
export function OverviewStats({
  overview,
  showHitRate = false,
}: {
  overview: Overview;
  showHitRate?: boolean;
}) {
  const t = useTranslations("overview");

  if (overview.words === 0) {
    return (
      <Section title={t("yourWords")}>
        <p className="text-muted-foreground text-sm">
          {t.rich("nothingYet", {
            link: (chunks) => (
              <Link href="/dictionary" className="text-primary underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </Section>
    );
  }

  const bands = [
    { key: "learned" as const, value: overview.learned, className: "bg-data-learned" },
    { key: "learning" as const, value: overview.learning, className: "bg-data-learning" },
    { key: "notStarted" as const, value: overview.fresh, className: "bg-data-untouched" },
  ].filter((band) => band.value > 0);

  return (
    <Section title={t("yourWords")} hint={t("inDictionary", { count: overview.words })}>
      <div className="space-y-4">
        <div className="bg-border flex h-2 overflow-hidden rounded-full">
          {bands.map((band) => (
            <span
              key={band.key}
              className={cn("h-full", band.className)}
              style={{ width: `${(band.value / overview.words) * 100}%` }}
              title={`${t(band.key)}: ${band.value}`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {bands.map((band) => (
            <span key={band.key} className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", band.className)} />
              <span className="font-medium">{band.value}</span>
              <span className="text-muted-foreground">{t(band.key).toLowerCase()}</span>
            </span>
          ))}
          {overview.sets > 0 && (
            <span className="text-muted-foreground">
              {t("inSets", { count: overview.sets })}
            </span>
          )}
        </div>

        {showHitRate && overview.hitRate !== null && (
          <p className="text-muted-foreground text-xs">
            {t("hitRate", { percent: Math.round(overview.hitRate * 100) })}
          </p>
        )}
      </div>
    </Section>
  );
}
