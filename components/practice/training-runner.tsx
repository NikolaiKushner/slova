"use client";

import { useCallback, useState } from "react";

import { BrainstormSession } from "@/components/practice/brainstorm-session";
import { PracticeSession } from "@/components/practice/practice-session";
import { SetChooser } from "@/components/practice/set-chooser";
import type { Training } from "@/lib/practice/catalog";

/**
 * A training, from "which words" to the last question.
 *
 * The choice of sets comes first and belongs here rather than inside either
 * session: both need it, neither should own it, and a session that has already
 * fetched its words is the wrong place to ask where they should have come
 * from. Once chosen it never changes for that run — a training that swapped
 * its material halfway would be two trainings wearing one name.
 */
export function TrainingRunner({ training }: { training: Training }) {
  const [setIds, setSetIds] = useState<string[] | null>(null);

  const start = useCallback((chosen: string[]) => setSetIds(chosen), []);

  if (setIds === null) {
    return <SetChooser title={training.title} onStart={start} />;
  }

  return training.id === "brainstorm" ? (
    <BrainstormSession setIds={setIds} />
  ) : (
    <PracticeSession kind={training.id} title={training.title} setIds={setIds} />
  );
}
