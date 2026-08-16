"use client";

import { BrainstormSession } from "@/components/practice/brainstorm-session";
import { PracticeSession } from "@/components/practice/practice-session";
import type { Training } from "@/lib/practice/catalog";
import type { Source } from "@/components/slova/source-bar";

/**
 * A training, from its address to the last question.
 *
 * It used to ask which sets to draw on before starting anything. That question
 * moved to the top of the trainings page, where it is asked once for every mode
 * and format instead of once per entry, and arrives here already answered — so
 * this is now only a fork between the two kinds of session.
 */
export function TrainingRunner({
  training,
  source,
}: {
  training: Training;
  source: Source;
}) {
  /*
   * No page container: every session is focus mode now (§15.2) and the shell
   * owns its own width, so the session bar reaches the edges of the content
   * area instead of floating inside a page margin.
   */
  return training.id === "brainstorm" ? (
    <BrainstormSession source={source} />
  ) : (
    <PracticeSession kind={training.id} source={source} />
  );
}
