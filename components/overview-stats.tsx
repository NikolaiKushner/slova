import Link from "next/link";

import { Section } from "@/components/section";
import type { Overview } from "@/lib/overview";
import { cn } from "@/lib/utils";

/**
 * How the dictionary is going, in four numbers and one bar.
 *
 * No charts and no tiles — `DESIGN.md` rules both out, and they would be
 * measuring the wrong thing anyway. The bar is the only picture here because
 * three proportions are genuinely easier to see than to read, and because it
 * is the shape of the answer to "am I getting anywhere": the green end grows.
 */
export function OverviewStats({ overview }: { overview: Overview }) {
  if (overview.words === 0) {
    return (
      <Section title="Your words">
        <p className="text-muted-foreground text-sm">
          Nothing yet.{" "}
          <Link href="/dictionary" className="text-primary underline">
            Add a few words
          </Link>{" "}
          and this fills in.
        </p>
      </Section>
    );
  }

  const bands = [
    { label: "Learned", value: overview.learned, className: "bg-primary" },
    { label: "Learning", value: overview.learning, className: "bg-brand-soft" },
    { label: "Not started", value: overview.fresh, className: "bg-border" },
  ].filter((band) => band.value > 0);

  return (
    <Section title="Your words" hint={`${overview.words} in the dictionary`}>
      <div className="space-y-4">
        <div className="bg-border flex h-2 overflow-hidden rounded-full">
          {bands.map((band) => (
            <span
              key={band.label}
              className={cn("h-full", band.className)}
              style={{ width: `${(band.value / overview.words) * 100}%` }}
              title={`${band.label}: ${band.value}`}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {bands.map((band) => (
            <span key={band.label} className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", band.className)} />
              <span className="font-medium">{band.value}</span>
              <span className="text-muted-foreground">{band.label.toLowerCase()}</span>
            </span>
          ))}
          {overview.sets > 0 && (
            <span className="text-muted-foreground">
              in {overview.sets} {overview.sets === 1 ? "set" : "sets"}
            </span>
          )}
        </div>

        {overview.hitRate !== null && (
          <p className="text-muted-foreground text-xs">
            {Math.round(overview.hitRate * 100)}% of translations came from the
            shared dictionary rather than being generated — those were instant
            and cost nothing.
          </p>
        )}
      </div>
    </Section>
  );
}
