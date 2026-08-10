import { cn } from "@/lib/utils";

/**
 * Shared column grid for both word tables — the saved words on a deck page and
 * the editable import rows. Keeping one grid is what makes an English word and
 * its Russian sit in the same two columns everywhere.
 */
export const WORD_GRID =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem] items-center gap-3";

export function WordTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-white/80",
        className,
      )}
    >
      <div
        className={cn(
          WORD_GRID,
          "border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground",
        )}
      >
        <span>English</span>
        <span>Russian</span>
        <span />
      </div>
      {children}
    </div>
  );
}
