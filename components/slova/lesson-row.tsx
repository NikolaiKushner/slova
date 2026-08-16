import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * One lesson in a course list — §14.
 *
 * Marker, English title, Russian gloss, sitting time, chevron. The next
 * lesson is the only row that carries a left inset and a badge; everything
 * else is a quiet line in the same card.
 */
const rowVariants = cva(
  "focus-ring coarse:min-h-13 flex w-full items-center gap-4 px-4.5 py-3.5 text-left transition-colors duration-(--motion-instant) hover:bg-muted",
  {
    variants: {
      kind: {
        done: "bg-card",
        next: "bg-sidebar shadow-[inset_2px_0_0_var(--primary)] hover:bg-muted",
        todo: "bg-card",
      },
    },
    defaultVariants: { kind: "todo" },
  },
);

const markVariants = cva(
  "flex size-6.5 shrink-0 items-center justify-center rounded-full border text-caption tabular-nums",
  {
    variants: {
      kind: {
        done: "border-primary bg-primary text-primary-foreground",
        next: "border-primary bg-card font-semibold text-primary",
        todo: "border-border bg-card text-muted-foreground",
      },
    },
    defaultVariants: { kind: "todo" },
  },
);

export type LessonRowKind = NonNullable<
  VariantProps<typeof rowVariants>["kind"]
>;

export function LessonRow({
  index,
  title,
  titleRu,
  href,
  minutesLabel,
  kind = "todo",
  badgeLabel,
  statusLabel,
  className,
}: {
  index: number;
  title: string;
  titleRu: string;
  href: string;
  minutesLabel: string;
  kind?: LessonRowKind;
  badgeLabel?: string | null;
  statusLabel?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-current={kind === "next" ? "step" : undefined}
      className={cn(rowVariants({ kind }), className)}
    >
      <span className={markVariants({ kind })} aria-hidden>
        {kind === "done" ? (
          <Check className="size-3.5" strokeWidth={2.3} />
        ) : (
          index
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-h4 block leading-snug" lang="en">
          {title}
        </span>
        <span className="text-muted-foreground text-caption block leading-snug">
          {titleRu}
        </span>
      </span>
      {statusLabel ? <span className="sr-only">{statusLabel}</span> : null}
      {badgeLabel ? (
        <Badge
          variant="secondary"
          className="rounded-sm px-2.5 py-0.5 font-semibold tracking-[0.06em]"
        >
          {badgeLabel}
        </Badge>
      ) : null}
      <span className="text-muted-foreground text-caption shrink-0 whitespace-nowrap">
        {minutesLabel}
      </span>
      <ChevronRight className="text-border size-4 shrink-0" aria-hidden />
    </Link>
  );
}
