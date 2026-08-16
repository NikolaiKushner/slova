import type { LucideIcon } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/**
 * The empty state, once, for the whole app — built on shadcn `Empty`.
 *
 * Before this there were four of them: a bare sentence under the word list, a
 * dashed box on the sets page, and two identical hand-written blocks inside
 * the practice sessions. Four empty states is four voices telling a person the
 * same thing — that they are early, not that they are lost.
 *
 * - `panel` sits in the slot the missing content would fill: a dashed frame,
 *   so the page keeps its shape and the reader can see where things will go.
 * - `screen` is the whole view — the end of a session, a training with no
 *   words. Nothing to outline there, because nothing is missing from a slot.
 *
 * The icon tile is the landing's (`bg-accent`, teal glyph), so a first-run
 * screen and the marketing page are visibly the same product.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "panel",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** A shadcn `Button` — the way out, when there is one. */
  action?: React.ReactNode;
  variant?: "panel" | "screen";
  className?: string;
}) {
  return (
    <Empty
      className={cn(
        variant === "panel"
          ? "rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12"
          : "px-6 py-16",
        className,
      )}
    >
      <EmptyHeader>
        {Icon ? (
          <EmptyMedia
            variant="icon"
            className="size-8 rounded-md bg-accent text-primary"
          >
            <Icon className="size-4" aria-hidden />
          </EmptyMedia>
        ) : null}
        <EmptyTitle
          className={cn(
            "font-display tracking-tight",
            variant === "screen" ? "text-2xl" : "text-lg",
          )}
        >
          {title}
        </EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
