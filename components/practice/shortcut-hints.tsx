"use client";

import { cn } from "@/lib/utils";

/**
 * The keys this question answers to, spelled out under it.
 *
 * Every training already worked from the keyboard; nothing said so, and a
 * shortcut nobody is told about is a shortcut nobody uses. They are printed
 * per format rather than as one list, because half of them do not apply to
 * any given question — "1–4" under a typing box is noise.
 *
 * Hidden on small screens: there is no keyboard to hint at, and the row would
 * cost a line of the answer area on the device that has least of it.
 */
export function ShortcutHints({
  items,
  className,
}: {
  /** Keycaps plus what they do. A `null` key is a plain instruction. */
  items: { keys: (string | null)[]; label: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-muted-foreground/70 hidden flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:flex",
        className,
      )}
      aria-hidden
    >
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {item.keys.map((key, index) =>
            key === null ? null : (
              <span key={key} className="inline-flex items-center gap-1">
                {index > 0 ? <span className="px-px">–</span> : null}
                <Kbd>{key}</Kbd>
              </span>
            ),
          )}
          <span className="ml-0.5">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

/** A keycap. Bottom border doubled so it reads as a key, not a code span. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-card text-foreground border-border rounded-[5px] border border-b-2 px-1.5 py-px font-sans text-[11px] leading-4">
      {children}
    </kbd>
  );
}
