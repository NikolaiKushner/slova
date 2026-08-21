"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { MutationPhase } from "@/hooks/use-reliable-mutations";

export function MutationStatus({
  phase,
  failedCount,
  online,
  onRetry,
}: {
  phase: MutationPhase;
  failedCount: number;
  online: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("mutations");
  if (phase === "idle") return null;

  const canRetry = (phase === "failed" || phase === "offline") && failedCount > 0;
  return (
    <div
      role={phase === "failed" ? "alert" : "status"}
      aria-live={phase === "failed" ? "assertive" : "polite"}
      /* `fixed` is anchored to the layout viewport, which iOS does not shrink
         for the keyboard — pinned to `bottom-4` this sits underneath it.
         `--kb-inset` is 0 whenever there is no keyboard. */
      className="bg-card border-border fixed right-4 bottom-[calc(1rem+var(--kb-inset))] left-4 z-50 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-xl border px-4 py-3 shadow-lg"
    >
      <p className="text-body-sm">{t(phase)}</p>
      {canRetry ? (
        <Button type="button" size="sm" onClick={onRetry} disabled={!online}>
          {t("retry")}
        </Button>
      ) : null}
    </div>
  );
}
