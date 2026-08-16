"use client";

import { Check, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The answer option — §14, and the only one in the product.
 *
 * Trainings, brainstorm and the practice inside a grammar lesson all ask the
 * same question in the same shape, so they all render this. That is the point
 * of §1.6: two screens that mean the same thing must not look different.
 *
 * Always one column, never two. Options differ in length, and two columns make
 * the eye jump between them looking for the shorter one (§8).
 */
const optionVariants = cva(
  "focus-ring group/option relative flex w-full items-center gap-3.5 rounded-lg border px-4 py-3.5 text-left text-base transition-all select-none coarse:min-h-14 coarse:py-4 disabled:cursor-default",
  {
    variants: {
      state: {
        idle: "border-border bg-card hover:border-ring hover:translate-x-0.5",
        selected: "border-accent-border bg-accent text-accent-foreground",
        correct: "border-success-border bg-success-bg text-success",
        incorrect: "border-destructive-border bg-destructive-bg text-destructive",
        dimmed: "border-border bg-card opacity-40",
      },
    },
    defaultVariants: { state: "idle" },
  },
);

const numberVariants = cva(
  "flex size-[22px] shrink-0 items-center justify-center rounded-xs text-[11.5px] font-medium tabular-nums transition-colors",
  {
    variants: {
      state: {
        idle: "bg-secondary text-muted-foreground group-hover/option:bg-accent group-hover/option:text-accent-foreground",
        selected: "bg-primary text-primary-foreground",
        correct: "bg-success text-primary-foreground",
        incorrect: "bg-destructive text-destructive-foreground",
        dimmed: "bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: { state: "idle" },
  },
);

export type OptionState = NonNullable<
  VariantProps<typeof optionVariants>["state"]
>;

export function OptionButton({
  index,
  state = "idle",
  className,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof optionVariants> & { index: number }) {
  return (
    <button
      type="button"
      data-slot="option-button"
      data-state={state}
      className={cn(optionVariants({ state }), "min-h-12", className)}
      {...props}
    >
      <span aria-hidden className={cn(numberVariants({ state }))}>
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {/*
       * The verdict is never colour alone (§18): right and wrong each carry a
       * mark. The slot holds its 17px whatever happens, so the label does not
       * shift sideways when one appears.
       */}
      <span className="flex size-[17px] shrink-0 items-center justify-center">
        {state === "correct" ? (
          <Check className="size-[17px]" strokeWidth={2.3} />
        ) : state === "incorrect" ? (
          <X className="size-[17px]" strokeWidth={2.3} />
        ) : null}
      </span>
    </button>
  );
}

/** Options are a list, and a screen reader should hear how many there are. */
export function OptionList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul className={cn("flex flex-col gap-2", className)}>{children}</ul>
  );
}
