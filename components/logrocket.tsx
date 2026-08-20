"use client";

import { useEffect } from "react";

import { startLogRocket } from "@/lib/logrocket";

/**
 * Starts session replay for the signed-in user. Renders nothing, and in a
 * development build does nothing at all — `startLogRocket` decides, so this
 * file stays a mount point rather than a second copy of the policy.
 */
export function LogRocketMount({ userId }: { userId: string }) {
  useEffect(() => {
    void startLogRocket(userId);
  }, [userId]);
  return null;
}
