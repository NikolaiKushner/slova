/**
 * Grammar Review, where it touches Postgres.
 *
 * The schedule itself is in `review.ts` and stays testable without a
 * database. This file reads the due queue, activates a rule after a lesson
 * miss, and persists one answered prompt — the last of those following the
 * vocabulary `persistReview` pattern exactly, because the client retries
 * every learning answer and two tabs are a normal thing to have open.
 *
 * Nothing here touches UserWord, ReviewLog or FSRS state.
 */

import type { Prisma, PrismaClient } from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { CourseContentError, loadCourse } from "@/lib/courses/load";
import { grammarCatalog } from "@/lib/courses/catalog";
import type { LoadedCourse } from "@/lib/courses/load";
import {
  buildGrammarReviewQueue,
  GRAMMAR_REVIEW_BATCH_LIMIT,
  GRAMMAR_REVIEW_CLEAR_STAGE,
  scheduleGrammarReview,
  scheduleLessonMiss,
  type GrammarReviewItem,
} from "@/lib/courses/review";
import {
  RetryableTransactionConflict,
  runSerializable,
} from "@/lib/serializable-transaction";
import { persistTouch } from "@/lib/sitting-store";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";

/**
 * More rows than a sitting can show. Rules whose course or bank has since
 * left the repository must not eat the ten visible places; with twenty-five
 * live rules there is nothing here worth paginating.
 */
const QUEUE_OVERFETCH = 50;

export class GrammarReviewNotFoundError extends Error {}
export class GrammarReviewConflictError extends Error {}

/** Courses that currently exist, resolved once per request. */
function availableCourseResolver(): (slug: string) => LoadedCourse | null {
  const available = new Set(
    grammarCatalog().available.map((course) => course.slug),
  );
  const cache = new Map<string, LoadedCourse | null>();
  return (slug) => {
    if (cache.has(slug)) return cache.get(slug) ?? null;
    let loaded: LoadedCourse | null = null;
    if (available.has(slug)) {
      try {
        loaded = loadCourse(slug);
      } catch (error) {
        if (!(error instanceof CourseContentError)) throw error;
        loaded = null;
      }
    }
    cache.set(slug, loaded);
    return loaded;
  };
}

/** The rules due now, one fresh bank prompt each. */
export async function loadGrammarReviewQueue(
  userId: string,
  now: Date,
  prisma: PrismaClient = getPrisma(),
): Promise<GrammarReviewItem[]> {
  const rows = await prisma.grammarRuleMemory.findMany({
    where: { userId, dueAt: { not: null, lte: now } },
    orderBy: [
      { dueAt: "asc" },
      { lastMissedAt: "asc" },
      { courseSlug: "asc" },
      { ruleId: "asc" },
    ],
    take: QUEUE_OVERFETCH,
    select: {
      id: true,
      courseSlug: true,
      ruleId: true,
      lastExerciseId: true,
    },
  });

  return buildGrammarReviewQueue(
    rows.map((row) => ({
      memoryId: row.id,
      courseSlug: row.courseSlug,
      ruleId: row.ruleId,
      lastExerciseId: row.lastExerciseId,
    })),
    availableCourseResolver(),
    { rng: Math.random, limit: GRAMMAR_REVIEW_BATCH_LIMIT },
  );
}

export type GrammarReviewSummary = {
  activeCount: number;
  dueCount: number;
  dueCourseTitles: string[];
  nextDueAt: Date | null;
};

/**
 * What the Grammar catalog needs to decide whether to offer a review, and
 * what the direct route says when nothing is due.
 *
 * Rows whose course, rule or bank has left the repository are counted
 * nowhere: a card promising a review the queue would then skip is worse than
 * no card.
 */
export async function loadGrammarReviewSummary(
  userId: string,
  now: Date,
  prisma: PrismaClient = getPrisma(),
): Promise<GrammarReviewSummary> {
  const rows = await prisma.grammarRuleMemory.findMany({
    where: { userId, dueAt: { not: null } },
    orderBy: [{ dueAt: "asc" }],
    select: { courseSlug: true, ruleId: true, dueAt: true },
  });

  const resolve = availableCourseResolver();
  const catalogOrder = grammarCatalog().available.map((course) => course.slug);
  const dueSlugs = new Set<string>();
  let activeCount = 0;
  let dueCount = 0;
  let nextDueAt: Date | null = null;

  for (const row of rows) {
    const loaded = resolve(row.courseSlug);
    if (!loaded) continue;
    if (!loaded.rules.some((rule) => rule.id === row.ruleId)) continue;
    if (!loaded.bank.some((item) => item.ruleId === row.ruleId)) continue;

    activeCount += 1;
    const dueAt = row.dueAt;
    if (dueAt === null) continue;
    if (dueAt <= now) {
      dueCount += 1;
      dueSlugs.add(row.courseSlug);
      continue;
    }
    if (nextDueAt === null || dueAt < nextDueAt) nextDueAt = dueAt;
  }

  const dueCourseTitles = catalogOrder
    .filter((slug) => dueSlugs.has(slug))
    .map((slug) => resolve(slug)?.course.title ?? slug);

  return { activeCount, dueCount, dueCourseTitles, nextDueAt };
}

/**
 * A rule missed in a lesson becomes weak, or weak again.
 *
 * Runs inside the caller's transaction — the lesson attempt and the rules it
 * activates commit or roll back together. The optimistic guard turns a
 * concurrent write into a retry of the whole serializable transaction rather
 * than a lost reset.
 */
export async function recordGrammarLessonMiss(
  transaction: Prisma.TransactionClient,
  input: {
    userId: string;
    courseSlug: string;
    ruleId: string;
    now: Date;
    timeZone?: string;
  },
): Promise<void> {
  const timeZone = input.timeZone ?? DEFAULT_TIMEZONE;
  const existing = await transaction.grammarRuleMemory.findUnique({
    where: {
      userId_courseSlug_ruleId: {
        userId: input.userId,
        courseSlug: input.courseSlug,
        ruleId: input.ruleId,
      },
    },
    select: { id: true, dueAt: true, version: true },
  });

  const next = scheduleLessonMiss(existing, input.now, timeZone);

  if (!existing) {
    await transaction.grammarRuleMemory.create({
      data: {
        userId: input.userId,
        courseSlug: input.courseSlug,
        ruleId: input.ruleId,
        stage: next.stage,
        dueAt: next.dueAt,
        lastMissedAt: input.now,
        version: 1,
      },
    });
    return;
  }

  const applied = await transaction.grammarRuleMemory.updateMany({
    where: { id: existing.id, userId: input.userId, version: existing.version },
    data: {
      stage: next.stage,
      dueAt: next.dueAt,
      clearedAt: null,
      lastMissedAt: input.now,
      version: { increment: 1 },
    },
  });
  if (applied.count !== 1) throw new RetryableTransactionConflict();
}

export type GrammarReviewInput = {
  userId: string;
  memoryId: string;
  courseSlug: string;
  ruleId: string;
  exerciseId: string;
  operationId: string;
  correct: boolean;
  elapsedMs: number | null;
  sittingId?: string;
  now?: Date;
  timeZone?: string;
};

export type GrammarReviewResult = {
  operationId: string;
  duplicate: boolean;
  stale: boolean;
  stage: number;
  dueAt: Date | null;
  cleared: boolean;
};

function sameOperation(
  existing: {
    userId: string;
    memoryId: string;
    courseSlug: string;
    ruleId: string;
    exerciseId: string;
    correct: boolean;
  },
  input: GrammarReviewInput,
): boolean {
  return (
    existing.userId === input.userId &&
    existing.memoryId === input.memoryId &&
    existing.courseSlug === input.courseSlug &&
    existing.ruleId === input.ruleId &&
    existing.exerciseId === input.exerciseId &&
    existing.correct === input.correct
  );
}

async function ownedSittingId(
  transaction: Prisma.TransactionClient,
  userId: string,
  sittingId?: string,
): Promise<string | null> {
  if (!sittingId) return null;
  const sitting = await transaction.studySitting.findFirst({
    where: { id: sittingId, userId },
    select: { id: true },
  });
  return sitting?.id ?? null;
}

/**
 * One answered Grammar Review prompt.
 *
 * The stale path is the multi-tab guard: if another request has already moved
 * this rule out of the due queue, the answer is recorded as an `applied =
 * false` log carrying the state that was observed, and the stage does not
 * advance twice. Storing that observation rather than reading the row again
 * later is what makes a duplicate of a stale operation return the same answer
 * every time.
 */
export async function persistGrammarReview(
  input: GrammarReviewInput,
  prisma: PrismaClient = getPrisma(),
): Promise<GrammarReviewResult> {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? DEFAULT_TIMEZONE;

  // Content validation is outside the transaction on purpose: it reads JSON
  // bundled with the deployment, never the database.
  assertReviewContent(input);

  return runSerializable(prisma, async (transaction) => {
    const existing = await transaction.grammarRuleReviewLog.findUnique({
      where: { operationId: input.operationId },
    });
    if (existing) {
      if (!sameOperation(existing, input)) {
        throw new GrammarReviewConflictError();
      }
      return {
        operationId: input.operationId,
        duplicate: true,
        stale: !existing.applied,
        stage: existing.nextStage,
        dueAt: existing.nextDueAt,
        cleared: existing.applied && existing.nextDueAt === null,
      };
    }

    const memory = await transaction.grammarRuleMemory.findFirst({
      where: {
        id: input.memoryId,
        userId: input.userId,
        courseSlug: input.courseSlug,
        ruleId: input.ruleId,
      },
    });
    if (!memory) throw new GrammarReviewNotFoundError();

    const sittingId = await ownedSittingId(
      transaction,
      input.userId,
      input.sittingId,
    );

    if (memory.dueAt === null || memory.dueAt > now) {
      await transaction.grammarRuleReviewLog.create({
        data: {
          operationId: input.operationId,
          memoryId: memory.id,
          userId: input.userId,
          sittingId,
          courseSlug: input.courseSlug,
          ruleId: input.ruleId,
          exerciseId: input.exerciseId,
          correct: input.correct,
          elapsedMs: input.elapsedMs,
          applied: false,
          previousStage: memory.stage,
          nextStage: memory.stage,
          previousDueAt: memory.dueAt,
          nextDueAt: memory.dueAt,
        },
      });
      return {
        operationId: input.operationId,
        duplicate: false,
        stale: true,
        stage: memory.stage,
        dueAt: memory.dueAt,
        cleared: false,
      };
    }

    const next = scheduleGrammarReview(
      normalizeStage(memory.stage),
      input.correct,
      now,
      timeZone,
    );
    const ruleVersion = memory.version + 1;
    const applied = await transaction.grammarRuleMemory.updateMany({
      where: { id: memory.id, userId: input.userId, version: memory.version },
      data: {
        stage: next.stage,
        dueAt: next.dueAt,
        clearedAt: next.cleared ? now : null,
        lastReviewedAt: now,
        ...(input.correct ? {} : { lastMissedAt: now }),
        lastExerciseId: input.exerciseId,
        reps: { increment: 1 },
        ...(input.correct ? {} : { lapses: { increment: 1 } }),
        version: { increment: 1 },
      },
    });
    if (applied.count !== 1) throw new RetryableTransactionConflict();

    await transaction.grammarRuleReviewLog.create({
      data: {
        operationId: input.operationId,
        memoryId: memory.id,
        userId: input.userId,
        sittingId,
        courseSlug: input.courseSlug,
        ruleId: input.ruleId,
        exerciseId: input.exerciseId,
        correct: input.correct,
        elapsedMs: input.elapsedMs,
        applied: true,
        ruleVersion,
        previousStage: memory.stage,
        nextStage: next.stage,
        previousDueAt: memory.dueAt,
        nextDueAt: next.dueAt,
      },
    });

    if (sittingId) {
      await persistTouch(
        input.userId,
        sittingId,
        {
          now,
          rating: input.correct ? "good" : "again",
          allowEnded: true,
        },
        transaction,
      );
    }

    return {
      operationId: input.operationId,
      duplicate: false,
      stale: false,
      stage: next.stage,
      dueAt: next.dueAt,
      cleared: next.cleared,
    };
  });
}

/**
 * The prompt must be a review-bank exercise of this course, and it must be
 * for the rule being reviewed. The client grades its own answers — grammar
 * lessons already do — but it does not get to name the content.
 */
function assertReviewContent(input: GrammarReviewInput): void {
  const resolve = availableCourseResolver();
  const loaded = resolve(input.courseSlug);
  if (!loaded) throw new GrammarReviewNotFoundError();
  if (!loaded.rules.some((rule) => rule.id === input.ruleId)) {
    throw new GrammarReviewNotFoundError();
  }
  const exercise = loaded.bank.find((item) => item.id === input.exerciseId);
  if (!exercise || exercise.ruleId !== input.ruleId) {
    throw new GrammarReviewNotFoundError();
  }
}

/**
 * A stage the schedule cannot produce is a repaired or corrupted row, not a
 * reason to 500. Normalizing happens here, at the persistence boundary; the
 * pure scheduler still refuses the value outright.
 */
function normalizeStage(stage: number): number {
  if (!Number.isInteger(stage) || stage < 0) return 0;
  return Math.min(stage, GRAMMAR_REVIEW_CLEAR_STAGE);
}
