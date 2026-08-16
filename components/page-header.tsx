import { Eyebrow } from "@/components/slova/eyebrow";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  /** Overline above the title. Uppercase comes from `Eyebrow`, not the string. */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Shared page title — §14: Eyebrow + h1 + lead, 40px to the content below.
 */
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
        "mb-10 flex flex-wrap items-start justify-between gap-4 pt-2",
        className,
      )}
    >
      <div className="min-w-0 max-w-xl">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="text-h1">{title}</h1>
        {description ? (
          <p className="text-lead mt-2.5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
