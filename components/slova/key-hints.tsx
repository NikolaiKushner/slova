"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils";

export type KeyHint = {
  /** One or more keys, e.g. ["1", "4"] renders as 1–4. */
  keys: string[];
  label: string;
};

/**
 * Keyboard hints — §14. Hidden on touch by `.key-hints` in globals.css: a key
 * that cannot be pressed is not a hint, it is noise.
 *
 * §7 of the principles makes the keyboard a first-class input, and a shortcut
 * nobody is told about does not exist. The dash between two keys is an en
 * dash without spaces, per §17.
 */
export function KeyHints({
  hints,
  className,
}: {
  hints: KeyHint[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "key-hints text-caption text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5",
        className,
      )}
    >
      {hints.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          {hint.keys.map((key, index) => (
            <Fragment key={key}>
              {index > 0 && <span aria-hidden>–</span>}
              <kbd className="bg-card text-foreground border-border rounded-sm border border-b-2 px-1.5 py-px text-[11px] font-normal">
                {key}
              </kbd>
            </Fragment>
          ))}
          <span>{hint.label}</span>
        </span>
      ))}
    </div>
  );
}
