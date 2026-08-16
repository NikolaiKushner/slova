"use client";

import { Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The round sound button — §14.
 *
 * The two rings while a word is speaking are not decoration. Sound is the one
 * thing on screen with no shape, and a listening exercise that looks identical
 * silent and speaking is unanswerable: there is no way to tell "wait" from "it
 * did not play". The animation is in globals.css as `.sound-ring`, driven by
 * `data-speaking`, so no node is added or removed per state.
 */
export function PlayButton({
  size = "lg",
  playing = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  size?: "sm" | "lg";
  playing?: boolean;
}) {
  return (
    <button
      type="button"
      data-slot="play-button"
      data-speaking={playing}
      className={cn(
        "sound-ring focus-ring text-primary bg-card border-border shadow-lifted relative flex items-center justify-center rounded-full border transition-transform duration-(--motion-fast) hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
        size === "lg" ? "size-24" : "size-19",
        className,
      )}
      {...props}
    >
      <Volume2
        className={size === "lg" ? "size-8" : "size-[26px]"}
        strokeWidth={1.6}
      />
    </button>
  );
}
