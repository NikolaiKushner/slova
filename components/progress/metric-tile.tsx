import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Compact summary tile for `/progress`. Atomic values only — charts and lists
 * stay in wider cards. The left accent is the 2px data mark from the spec;
 * the icon is decorative.
 */
export function MetricTile({
  label,
  value,
  secondary,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  secondary: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "min-h-[132px] justify-between gap-3 border-l-2 border-l-primary py-4",
        className,
      )}
    >
      <CardHeader className="gap-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-body-sm text-foreground">{label}</p>
          {Icon ? (
            <Icon
              className="text-muted-foreground size-4 shrink-0"
              strokeWidth={1.7}
              aria-hidden
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-display text-numeral tabular-nums">{value}</p>
        <p className="text-muted-foreground mt-1 text-caption">{secondary}</p>
      </CardContent>
    </Card>
  );
}
