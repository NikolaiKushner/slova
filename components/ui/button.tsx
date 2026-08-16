import * as React from "react"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Sizes come from the table in docs/design-system.md §13, states from §10 and
 * the focus ring from §6. The touch column is not decoration: iPad is the main
 * way this app gets used, so every size carries its `coarse:` height.
 */
const buttonVariants = cva(
  "group/button focus-ring inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /*
         * §10 and §20 both single this out: a disabled primary button used to
         * read as a slightly faded active one, so people kept pressing it. It
         * is grey now — a colour that belongs to no action — for every variant
         * that carries a fill.
         */
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover disabled:bg-disabled disabled:text-disabled-foreground disabled:shadow-none",
        outline:
          "border-border bg-card text-foreground hover:border-ring aria-expanded:bg-muted aria-expanded:text-foreground disabled:border-border disabled:bg-muted disabled:text-disabled-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground disabled:bg-disabled disabled:text-disabled-foreground",
        ghost:
          "text-foreground hover:bg-secondary aria-expanded:bg-secondary disabled:bg-transparent disabled:text-disabled-foreground",
        /* Solid, per tokens.html — a destructive action states itself. */
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)] focus-visible:border-destructive disabled:bg-disabled disabled:text-disabled-foreground disabled:shadow-none",
        link: "text-primary underline-offset-4 hover:underline disabled:text-disabled-foreground",
      },
      size: {
        sm: "h-8 coarse:h-10 gap-1.5 px-3.5 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        default:
          "text-body-sm h-10 coarse:h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        lg: "h-12 coarse:h-13 gap-2 px-6.5 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        /* Not in §13 — kept because base-nova ships it and dense rows use it. */
        xs: "h-6 gap-1 rounded-sm px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        /*
         * §13 gives the icon button 28 on the desktop and 44 on touch: the
         * visible square stays small, the tappable one does not. `icon-sm` is
         * the same measurement under the name fifteen call sites already use.
         */
        icon: "size-7 coarse:size-11",
        "icon-sm": "size-7 coarse:size-11 rounded-sm",
        "icon-xs": "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-9 coarse:size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  /*
   * `render={<Link/>}` renders an <a>, not a <button>, and Base UI defaults to
   * assuming a native button — so every button-shaped link in the app logged a
   * warning about lost button semantics. It is right to warn and wrong about
   * the fix: a control that navigates *should* be a link. So the answer is to
   * tell it what is actually being rendered rather than to force a <button>
   * around a href. Detected here, once, instead of at forty call sites.
   */
  const isNative =
    nativeButton ??
    (!render || (React.isValidElement(render) && render.type === "button"))

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      render={render}
      nativeButton={isNative}
      {...props}
    />
  )
}

export { Button, buttonVariants }
