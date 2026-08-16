"use client";

import { BrainstormSession } from "@/components/practice/brainstorm-session";
import { PracticeSession } from "@/components/practice/practice-session";
import { PageContainer } from "@/components/layout/app-shell";
import type { Training } from "@/lib/practice/catalog";
import type { Source } from "@/components/slova/source-bar";
import { useTranslations } from "next-intl";

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
  const trainings = useTranslations("trainings");
  const title = trainings(`${training.id}.title`);

  /*
   * Brainstorm is on FocusShell and owns its own width (§15.2). The other
   * trainings are not there yet — 5.1 rebuilds the question screen and moves
   * them — so they keep a page container until they do.
   */
  return training.id === "brainstorm" ? (
    <BrainstormSession source={source} />
  ) : (
    <PageContainer>
      <PracticeSession kind={training.id} title={title} source={source} />
    </PageContainer>
  );
}
