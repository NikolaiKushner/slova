import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        /*
         * `md:text-sm` used to drop this to 14px on anything wider than a
         * phone, which is the exact bug §9 calls out: below 16px Safari on
         * iPad zooms the page on focus and the layout jumps. It is gone, and
         * it must not come back — the base rule in globals.css only sets a
         * floor, and a utility on the element outranks it.
         */
        "focus-ring h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base transition-colors outline-none coarse:h-11 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
