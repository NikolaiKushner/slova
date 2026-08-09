import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Small uppercase label above the title (TODAY color / brand-soft) */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/** Shared page title + description. Eyebrow uses soft sage green. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-wrap items-start justify-between gap-4 pt-2",
        className,
      )}
    >
      <div className="min-w-0 max-w-xl space-y-2">
        {eyebrow ? (
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-soft">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-4xl tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
