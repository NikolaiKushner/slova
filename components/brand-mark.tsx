import { cn } from "@/lib/utils";

/**
 * The Slova logotype: Fraunces, with the S in brand teal.
 *
 * It is a word, not a tile. Headings stay `font-display`; this cut is slightly
 * heavier, tighter, and wonkier so the name does not look like a page title.
 */
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-logo inline-flex items-baseline whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span className="text-[1.08em] text-primary">S</span>
      lova
    </span>
  );
}
