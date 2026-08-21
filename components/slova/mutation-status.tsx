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
  /*
   * A save that is going fine says nothing. Answering is the work; narrating
   * the round trip behind it turns every answer into a notification, and
   * §16 keeps toasts for background operations that went wrong — "saving
   * progress" fails the rule that every message names something to do.
   *
   * The panel still appears the moment saving stops going fine: retrying,
   * offline, failed with its Retry, and the one line that closes the loop
   * afterwards.
   */
  if (phase === "idle" || phase === "saving") return null;

  const canRetry = (phase === "failed" || phase === "offline") && failedCount > 0;
  return (
    <div
      role={phase === "failed" ? "alert" : "status"}
      aria-live={phase === "failed" ? "assertive" : "polite"}
      className="bg-card border-border fixed right-4 bottom-4 left-4 z-50 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-xl border px-4 py-3 shadow-lg"
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
