"use client";

import { SpeakButton } from "@/components/slova/speak-button";
import { cn } from "@/lib/utils";

/**
 * An example sentence in a grammar lesson — §14.
 *
 * Left mint rule, English in Literata, Russian underneath. `en` is marked
 * `lang="en"` so a screen reader does not pronounce it as Russian (§18).
 */
export function RuleExample({
  en,
  ru,
  speakText,
  normalUrl,
  slowUrl,
  className,
}: {
  en: React.ReactNode;
  ru: React.ReactNode;
  speakText: string;
  normalUrl?: string | null;
  slowUrl?: string | null;
  className?: string;
}) {
  return (
    <figure className={cn("border-accent border-l-2 py-0.5 pl-4", className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p lang="en" className="text-h4 leading-snug">
            {en}
          </p>
          <p className="text-muted-foreground text-caption mt-0.5">{ru}</p>
        </div>
        <SpeakButton
          text={speakText}
          normalUrl={normalUrl}
          slowUrl={slowUrl}
        />
      </div>
    </figure>
  );
}
