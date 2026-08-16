import { Info, TriangleAlert } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * A lesson inset — §14. Warning is "where people usually slip"; note is a
 * quieter aside. Built here rather than as an Alert variant: the overline
 * title and the padding are not what Alert is for.
 */
const calloutVariants = cva("rounded-lg border px-5 py-[18px]", {
  variants: {
    variant: {
      warning: "border-warning-border bg-warning-bg text-warning",
      note: "border-border bg-card text-foreground",
    },
  },
  defaultVariants: { variant: "warning" },
});

export function Callout({
  variant = "warning",
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
} & VariantProps<typeof calloutVariants>) {
  const Icon = variant === "warning" ? TriangleAlert : Info;

  return (
    <aside className={cn(calloutVariants({ variant }), className)}>
      <p
        className={cn(
          "text-overline mb-3 flex items-center gap-2.5",
          variant === "warning" ? "text-warning" : "text-eyebrow",
        )}
      >
        <Icon className="size-[15px]" strokeWidth={1.9} aria-hidden />
        {title}
      </p>
      <div
        className={cn(
          "space-y-3.5 text-body leading-relaxed",
          variant === "warning"
            ? "text-warning [&_[data-slot=token]]:bg-warning-border/50"
            : "text-foreground",
        )}
      >
        {children}
      </div>
    </aside>
  );
}
