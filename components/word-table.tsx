"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Shared column grid for both word tables — the saved words on a deck page and
 * the editable import rows. Keeping one grid is what makes an English word and
 * its Russian sit in the same two columns everywhere.
 */
export const WORD_GRID =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem] items-center gap-3";

/** Shared by the add-words pair and both word tables, so the hats match. */
export const COLUMN_LABEL =
  "text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground";

/** Quiet icon actions on a word row — same size and weight in both tables. */
export const ROW_ICON =
  "cursor-pointer text-muted-foreground hover:text-foreground";
export const ROW_ICON_DESTROY =
  "cursor-pointer text-muted-foreground hover:bg-destructive-bg hover:text-destructive";

export const COLUMN_HEADER = cn(
  "border-b border-border bg-muted/50 px-3 py-2",
  COLUMN_LABEL,
);

export function WordTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const common = useTranslations("common");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card/80",
        className,
      )}
    >
      <div className={cn(WORD_GRID, COLUMN_HEADER)}>
        <span>{common("english")}</span>
        <span>{common("russian")}</span>
        <span />
      </div>
      {children}
    </div>
  );
}
