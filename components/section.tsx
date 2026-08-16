import { cn } from "@/lib/utils";

type Props = {
  /** Anchor target, for in-page links like the sidebar's "Lists". */
  id?: string;
  title: string;
  /** Small count or status next to the title, e.g. "12 ready". */
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/**
 * One heading treatment for every in-page section: an overline in the eyebrow
 * colour, an optional count, an optional action on the right. Pages do not get
 * to invent a second heading size — see docs/design-system.md §3.
 */
export function Section({
  id,
  title,
  hint,
  action,
  className,
  children,
}: Props) {
  return (
    <section id={id} className={cn("space-y-3", className)}>
      <div className="flex min-h-8 items-center justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-overline text-eyebrow">{title}</h2>
          {hint ? (
            <span className="text-caption text-muted-foreground">{hint}</span>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
