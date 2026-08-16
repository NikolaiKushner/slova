import { cn } from "@/lib/utils";

/**
 * Section overline — §14.
 *
 * The uppercase comes from CSS, never from the markup (§3): typed in capitals
 * it breaks copy-paste and a screen reader spells it out letter by letter.
 */
export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p className={cn("text-overline text-eyebrow mb-2.5", className)}>
      {children}
    </p>
  );
}
