import { cn } from "@/lib/utils";

/**
 * The Slova logotype: Fraunces, with the S in brand teal.
 *
 * It is a word, not a tile. Headings stay `font-display`; this cut is slightly
 * heavier, tighter, and wonkier so the name does not look like a page title.
 */
export function BrandWordmark({
  className,
  tone = "brand",
}: {
  className?: string;
  /** `light` drops the teal S — on a forest band the two greens fight. */
  tone?: "brand" | "light";
}) {
  return (
    <span
      className={cn(
        "font-logo inline-flex items-baseline whitespace-nowrap text-foreground",
        className,
      )}
    >
      <span className={cn("text-[1.08em]", tone === "brand" && "text-primary")}>
        S
      </span>
      lova
    </span>
  );
}
