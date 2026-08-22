import type { Prisma } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

/**
 * Reading, glossing, answering and completing a story never touch
 * `UserWord`, `ReviewLog` or any FSRS field — invariant 2,
 * docs/plans/shipped/stories.md §4. This module is the only thing that writes
 * `StoryProgress`, and it writes nothing else.
 */

export class StoryProgressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryProgressError";
  }
}

export type StoredAnswer = {
  answer: string;
  correct: boolean;
  answeredAt: string;
};

export type AnswersMap = Record<string, StoredAnswer>;

export type StoryProgressRecord = {
  answers: AnswersMap;
  correctCount: number;
  completedAt: Date | null;
};

function answersOf(value: Prisma.JsonValue | null | undefined): AnswersMap {
  return (value ?? {}) as AnswersMap;
}

const findKey = (userId: string, storySlug: string) => ({
  userId_storySlug: { userId, storySlug },
});

/**
 * Upsert one answer. A changed answer replaces the previous one — the row
 * is keyed by question id, not appended to — until the story is completed,
 * after which the row is read-only.
 */
export async function saveStoryAnswer(input: {
  userId: string;
  storySlug: string;
  questionId: string;
  answer: string;
  correct: boolean;
  now?: Date;
}): Promise<StoryProgressRecord> {
  const now = input.now ?? new Date();
  const prisma = getPrisma();
  const key = findKey(input.userId, input.storySlug);

  const existing = await prisma.storyProgress.findUnique({ where: key });
  if (existing?.completedAt) {
    throw new StoryProgressError("A completed story's answers are read-only.");
  }

  const answers: AnswersMap = {
    ...answersOf(existing?.answers),
    [input.questionId]: {
      answer: input.answer,
      correct: input.correct,
      answeredAt: now.toISOString(),
    },
  };
  const answersJson = answers as unknown as Prisma.InputJsonValue;

  const row = await prisma.storyProgress.upsert({
    where: key,
    create: {
      userId: input.userId,
      storySlug: input.storySlug,
      answers: answersJson,
      startedAt: now,
    },
    update: { answers: answersJson },
  });

  return { answers, correctCount: row.correctCount, completedAt: row.completedAt };
}

/**
 * Require every question answered, set `completedAt` once, persist
 * `correctCount`. Calling this again on an already-completed row is a
 * no-op that returns the existing record — completing twice is not an
 * error, it just does nothing the second time.
 */
export async function completeStory(input: {
  userId: string;
  storySlug: string;
  questionIds: readonly string[];
  now?: Date;
}): Promise<StoryProgressRecord> {
  const now = input.now ?? new Date();
  const prisma = getPrisma();
  const key = findKey(input.userId, input.storySlug);

  const existing = await prisma.storyProgress.findUnique({ where: key });
  if (!existing) {
    throw new StoryProgressError("No answers recorded yet.");
  }
  if (existing.completedAt) {
    return {
      answers: answersOf(existing.answers),
      correctCount: existing.correctCount,
      completedAt: existing.completedAt,
    };
  }

  const answers = answersOf(existing.answers);
  const allAnswered = input.questionIds.every((id) => id in answers);
  if (!allAnswered) {
    throw new StoryProgressError("Not every question has an answer yet.");
  }

  const correctCount = input.questionIds.filter(
    (id) => answers[id]?.correct === true,
  ).length;

  const row = await prisma.storyProgress.update({
    where: key,
    data: { correctCount, completedAt: now },
  });

  return { answers, correctCount: row.correctCount, completedAt: row.completedAt };
}

/** For the catalog: which of these slugs this learner has completed. */
export async function loadCompletedStorySlugs(
  userId: string,
  slugs: readonly string[],
): Promise<Set<string>> {
  if (slugs.length === 0) return new Set();

  const rows = await getPrisma().storyProgress.findMany({
    where: { userId, storySlug: { in: [...slugs] }, completedAt: { not: null } },
    select: { storySlug: true },
  });

  return new Set(rows.map((row) => row.storySlug));
}

export async function loadStoryProgress(
  userId: string,
  storySlug: string,
): Promise<StoryProgressRecord | null> {
  const row = await getPrisma().storyProgress.findUnique({
    where: findKey(userId, storySlug),
  });
  if (!row) return null;
  return {
    answers: answersOf(row.answers),
    correctCount: row.correctCount,
    completedAt: row.completedAt,
  };
}
