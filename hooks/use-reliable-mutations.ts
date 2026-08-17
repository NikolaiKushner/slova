"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MutationHttpError,
  postJsonWithRetry,
} from "@/lib/client-mutation";
import { reportClientEvent } from "@/lib/client-telemetry";

export type ReliableMutationTask<T = unknown> = {
  id: string;
  endpoint: string;
  body: unknown | (() => Promise<unknown>);
  onSuccess?: (payload: T) => void | Promise<void>;
};

export type MutationPhase =
  | "idle"
  | "saving"
  | "retrying"
  | "offline"
  | "failed"
  | "recovered";

export function useReliableMutations() {
  const failedRef = useRef(new Map<string, ReliableMutationTask>());
  const inFlightRef = useRef(new Map<string, Promise<boolean>>());
  const retryingRef = useRef(new Set<string>());
  const recoveredRef = useRef(false);
  const [online, setOnline] = useState(true);
  const [snapshot, setSnapshot] = useState({
    pendingCount: 0,
    failedCount: 0,
    retryingCount: 0,
    recovered: false,
  });

  const syncSnapshot = useCallback(() => {
    setSnapshot({
      pendingCount: inFlightRef.current.size,
      failedCount: failedRef.current.size,
      retryingCount: retryingRef.current.size,
      recovered: recoveredRef.current,
    });
  }, []);

  useEffect(() => {
    function syncOnlineState() {
      setOnline(navigator.onLine);
    }
    syncOnlineState();
    window.addEventListener("online", syncOnlineState);
    window.addEventListener("offline", syncOnlineState);
    return () => {
      window.removeEventListener("online", syncOnlineState);
      window.removeEventListener("offline", syncOnlineState);
    };
  }, []);

  const execute = useCallback(
    <T,>(task: ReliableMutationTask<T>, manualRetry: boolean) => {
      const running = inFlightRef.current.get(task.id);
      if (running) return running;

      recoveredRef.current = false;
      let retried = manualRetry;
      if (manualRetry) retryingRef.current.add(task.id);
      const bodyPromise: Promise<unknown> =
        typeof task.body === "function" ? task.body() : Promise.resolve(task.body);
      const promise = bodyPromise
        .then((body: unknown) =>
          postJsonWithRetry<T>(task.endpoint, body, {
            onRetry(retry) {
              retried = true;
              retryingRef.current.add(task.id);
              reportClientEvent("client_mutation_retry", {
                endpoint: task.endpoint,
                attempt: retry.attempt,
                delayMs: retry.delayMs,
                status: retry.status,
              });
              syncSnapshot();
            },
          }),
        )
        .then(async (payload: T) => {
          await task.onSuccess?.(payload);
          failedRef.current.delete(task.id);
          recoveredRef.current = recoveredRef.current || retried;
          return true;
        })
        .catch((error: unknown) => {
          failedRef.current.set(task.id, task as ReliableMutationTask);
          reportClientEvent("client_mutation_failed", {
            endpoint: task.endpoint,
            status:
              error instanceof MutationHttpError ? error.status : null,
            online:
              typeof navigator === "undefined" ? null : navigator.onLine,
          });
          return false;
        })
        .finally(() => {
          inFlightRef.current.delete(task.id);
          retryingRef.current.delete(task.id);
          syncSnapshot();
        });

      inFlightRef.current.set(task.id, promise);
      syncSnapshot();
      return promise;
    },
    [syncSnapshot],
  );

  const submit = useCallback(
    <T,>(task: ReliableMutationTask<T>) => execute(task, false),
    [execute],
  );

  const flush = useCallback(async () => {
    while (inFlightRef.current.size > 0) {
      await Promise.allSettled([...inFlightRef.current.values()]);
    }
    return { failed: failedRef.current.size };
  }, []);

  const retryFailed = useCallback(async () => {
    const tasks = [...failedRef.current.values()];
    await Promise.all(tasks.map((task) => execute(task, true)));
    return flush();
  }, [execute, flush]);

  const { pendingCount, failedCount, retryingCount, recovered } = snapshot;
  let phase: MutationPhase = "idle";
  if (!online && (pendingCount > 0 || failedCount > 0)) phase = "offline";
  else if (retryingCount > 0) phase = "retrying";
  else if (pendingCount > 0) phase = "saving";
  else if (failedCount > 0) phase = "failed";
  else if (recovered) phase = "recovered";

  return {
    submit,
    flush,
    retryFailed,
    phase,
    online,
    pendingCount,
    failedCount,
  };
}
