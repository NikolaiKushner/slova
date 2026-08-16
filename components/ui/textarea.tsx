import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        /*
         * `field-sizing-content` is the auto-grow §13 asks for; `max-h-[220px]`
         * is the ceiling it names, after which the box scrolls instead of
         * pushing the page down. `md:text-sm` removed for the reason in
         * input.tsx — 16px is a floor, not a preference.
         */
        "focus-ring flex field-sizing-content max-h-[220px] min-h-16 w-full rounded-md border border-input bg-card px-3 py-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
