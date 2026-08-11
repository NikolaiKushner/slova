import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children: React.ReactNode;
};

/**
 * Page width lives here, not in the app shell.
 *
 * Reading screens stay narrow — one job per screen, whitespace over chrome
 * (DESIGN.md). The dictionary table is the exception that forced the choice
 * out of `AppShell`: a sortable, filterable list of every word a person knows
 * does not fit in `max-w-2xl` and looks cramped pretending to.
 */
export function Page({ className, children }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-2xl", className)}>{children}</div>
  );
}

/** For table-shaped screens only. Everything else uses `Page`. */
export function PageWide({ className, children }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl", className)}>{children}</div>
  );
}
