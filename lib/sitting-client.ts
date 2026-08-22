/**
 * Browser writes for a sitting. Keepalive/pagehide has to be POST: sendBeacon
 * and fetch-keepalive are unreliable as PATCH, especially on iOS.
 */

import { reportClientEvent } from "@/lib/client-telemetry";

export type SittingStartBody = {
  kind: "practice" | "brainstorm" | "study" | "grammar" | "reading";
  label: string;
  sourceState: "due" | "new" | "hard" | "all";
  setIds?: string[];
};

export async function openSitting(
  body: SittingStartBody,
): Promise<string | null> {
  try {
    const response = await fetch("/api/study/sitting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      reportClientEvent("sitting_start_failed", { status: response.status });
      return null;
    }
    const payload = (await response.json()) as { id?: string };
    return payload.id ?? null;
  } catch {
    reportClientEvent("sitting_start_failed", { status: null });
    return null;
  }
}

export async function patchSitting(body: {
  id: string;
  rating?: "again" | "good";
  introduced?: boolean;
  endedReason?: "completed" | "abandoned";
  score?: number;
  missedRuleIds?: string[];
}): Promise<void> {
  try {
    const response = await fetch("/api/study/sitting", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      reportClientEvent("sitting_update_failed", {
        status: response.status,
        ended: body.endedReason !== undefined,
      });
    }
  } catch {
    reportClientEvent("sitting_update_failed", {
      status: null,
      ended: body.endedReason !== undefined,
    });
  }
}

export function abandonSitting(id: string): void {
  const body = JSON.stringify({ id, endedReason: "abandoned" });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/study/sitting", blob)) return;
    }
  } catch {
    // Fall through to keepalive fetch.
  }
  void fetch("/api/study/sitting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
