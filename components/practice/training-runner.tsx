"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
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
  const trainings = useTranslations("trainings");
  const practice = useTranslations("practice");
  const title = trainings(`${training.id}.title`);
  const [setIds, setSetIds] = useState<string[] | null>(null);

  const start = useCallback((chosen: string[]) => setSetIds(chosen), []);

  /*
   * The page header lives here rather than on the page, because it belongs to
   * the first step only. Once the drill starts the question is the page: a
   * title and a paragraph of description above it are two things to read
   * instead of the one thing being asked, and the running session carries its
   * own bar with the way out in it.
   */
  if (setIds === null) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow={practice("eyebrow")}
          title={title}
          description={trainings(`${training.id}.description`)}
        />
        <SetChooser title={title} onStart={start} />
      </PageContainer>
    );
  }

  /*
   * Brainstorm is on FocusShell and owns its own width (§15.2). The other
   * trainings are not there yet — 5.1 rebuilds the question screen and moves
   * them — so they keep a page container until they do.
   */
  return training.id === "brainstorm" ? (
    <BrainstormSession setIds={setIds} />
  ) : (
    <PageContainer>
      <PracticeSession kind={training.id} title={title} setIds={setIds} />
    </PageContainer>
  );
}
