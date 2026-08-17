"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  abandonSitting,
  openSitting,
  patchSitting,
  type SittingStartBody,
} from "@/lib/sitting-client";

/**
 * Opens a sitting once the session has words, closes it on the summary or
 * on pagehide. React unmount (client navigation) also abandons, because
 * pagehide does not fire on in-app links.
 */
export function useStudySitting(
  input: SittingStartBody & {
    active: boolean;
    /** Bump on restart so a finished sitting is replaced, not reused. */
    resetKey?: string | number;
    /** Current card; elapsed is measured from the last change. */
    cardKey?: string | number | null;
  },
) {
  const idRef = useRef<string | null>(null);
  const openingRef = useRef<Promise<string | null> | null>(null);
  const pendingWritesRef = useRef(new Set<Promise<unknown>>());
  const completedRef = useRef(false);
  const pendingEndRef = useRef<"abandoned" | null>(null);
  const shownAtRef = useRef(0);
  const extraRef = useRef<{ score?: number; missedRuleIds?: string[] }>({});

  const { active, resetKey, cardKey, kind, label, sourceState, setIds } = input;
  const setKey = JSON.stringify(setIds ?? []);

  useEffect(() => {
    shownAtRef.current = Date.now();
  }, [cardKey]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    completedRef.current = false;
    pendingEndRef.current = null;
    pendingWritesRef.current.clear();
    extraRef.current = {};
    idRef.current = null;

    const stableSetIds = JSON.parse(setKey) as string[];
    const opening = openSitting({
      kind,
      label,
      sourceState,
      setIds: stableSetIds,
    }).then((id) => {
      if (!id) return null;
      if (cancelled) {
        abandonSitting(id);
        return null;
      }
      idRef.current = id;
      const pending = pendingEndRef.current;
      if (pending) {
        void patchSitting({
          id,
          endedReason: pending,
          ...extraRef.current,
        });
      }
      return id;
    });
    openingRef.current = opening;

    function abandon() {
      if (completedRef.current) return;
      const id = idRef.current;
      if (id) {
        abandonSitting(id);
        idRef.current = null;
        return;
      }
      pendingEndRef.current = "abandoned";
    }

    window.addEventListener("pagehide", abandon);
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", abandon);
      abandon();
    };
    // setKey, not setIds: the parent often passes a fresh array of the same ids.
  }, [active, resetKey, kind, label, sourceState, setKey]);

  const getIdAsync = useCallback(async () => {
    if (idRef.current) return idRef.current;
    return (await openingRef.current) ?? null;
  }, []);

  const track = useCallback(<T,>(promise: Promise<T>): Promise<T> => {
    pendingWritesRef.current.add(promise);
    void promise
      .finally(() => pendingWritesRef.current.delete(promise))
      .catch(() => {});
    return promise;
  }, []);

  const flush = useCallback(async () => {
    while (pendingWritesRef.current.size > 0) {
      await Promise.allSettled([...pendingWritesRef.current]);
    }
  }, []);

  const elapsedMs = useCallback(() => {
    const now = Date.now();
    const elapsed = now - shownAtRef.current;
    shownAtRef.current = now;
    return elapsed;
  }, []);

  const touch = useCallback(
    (patch?: {
      rating?: "again" | "good";
      introduced?: boolean;
      score?: number;
      missedRuleIds?: string[];
    }) => {
      return track(
        getIdAsync().then((id) =>
          id ? patchSitting({ id, ...patch }) : undefined,
        ),
      );
    },
    [getIdAsync, track],
  );

  const complete = useCallback(
    async (extra?: { score?: number; missedRuleIds?: string[] }) => {
      const endExtra = extra ?? {};
      extraRef.current = endExtra;
      completedRef.current = true;
      const idPromise = idRef.current
        ? Promise.resolve(idRef.current)
        : (openingRef.current ?? Promise.resolve(null));
      const pendingWrites = [...pendingWritesRef.current];
      await Promise.allSettled(pendingWrites);
      const id = await idPromise;
      if (id) {
        await patchSitting({
          id,
          endedReason: "completed",
          ...endExtra,
        });
        return;
      }
    },
    [],
  );

  return { getIdAsync, elapsedMs, touch, track, flush, complete };
}
