import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * The names of the type scale from docs/design-system.md §3.
 *
 * tailwind-merge has to be told about them, and the reason is worth writing
 * down because the failure is completely silent. `text-*` covers two different
 * things in Tailwind — a font size and a text colour — and tailwind-merge
 * decides which by recognising the value. It has never heard of `body-sm`, so
 * it filed `text-body-sm` under colour and dropped whatever colour came before
 * it in the same call.
 *
 * That is how the primary button ended up with near-black text on dark green:
 * the size variant carried `text-body-sm`, which quietly deleted
 * `text-primary-foreground` from the variant before it. Every
 * `text-muted-foreground … text-caption` pair in the app was losing its colour
 * the same way, which is why so much of the interface had drifted to one
 * shade. Nothing warns about this; the class simply is not on the element.
 */
const TYPE_SCALE = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "lead",
  "body",
  "body-sm",
  "caption",
  "overline",
  "token",
  "numeral",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TYPE_SCALE] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
