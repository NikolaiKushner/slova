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
 * One heading treatment for every in-page section: soft sage micro-label,
 * optional count, optional action on the right. Pages should not invent a
 * second heading size — see DESIGN.md.
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
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {title}
          </h2>
          {hint ? (
            <span className="text-sm text-muted-foreground">{hint}</span>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
