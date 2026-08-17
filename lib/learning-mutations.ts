import type {
  Prisma,
  PrismaClient,
  ReviewLog,
  UserWord,
} from "@/app/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  RetryableTransactionConflict,
  runSerializable,
} from "@/lib/serializable-transaction";
import { persistReviewUndo, persistTouch } from "@/lib/sitting-store";
import {
  restoreFromSnapshot,
  scheduleGraduation,
  scheduleReview,
  snapshotOf,
  type ReviewRating,
} from "@/lib/srs";

export class LearningMutationNotFoundError extends Error {}
export class IdempotencyConflictError extends Error {}
export class AlreadyScheduledError extends Error {}
export class NothingToUndoError extends Error {}
export class UndoOrderConflictError extends Error {}

export type LearningMutationResult = {
  word: UserWord;
  reviewId: string;
  operationId: string;
  duplicate: boolean;
};

type ReviewInput = {
  userId: string;
  wordId: string;
  operationId: string;
  rating: ReviewRating;
  sittingId?: string;
  kind: string | null;
  verdict: string | null;
  elapsedMs: number | null;
  now?: Date;
};

type GraduationInput = {
  userId: string;
  wordId: string;
  operationId: string;
  errors: number;
  sittingId?: string;
  now?: Date;
};

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

async function duplicateResult(
  transaction: Prisma.TransactionClient,
  existing: ReviewLog,
  userId: string,
): Promise<LearningMutationResult> {
  const word = await transaction.userWord.findFirst({
    where: { id: existing.wordId, userId },
  });
  if (!word || !existing.operationId) {
    throw new LearningMutationNotFoundError();
  }
  return {
    word,
    reviewId: existing.id,
    operationId: existing.operationId,
    duplicate: true,
  };
}

function sameReviewOperation(existing: ReviewLog, input: ReviewInput): boolean {
  return (
    existing.userId === input.userId &&
    existing.wordId === input.wordId &&
    existing.rating === input.rating &&
    existing.kind === input.kind &&
    existing.verdict === input.verdict &&
    existing.elapsedMs === input.elapsedMs
  );
}

function sameGraduationOperation(
  existing: ReviewLog,
  input: GraduationInput,
): boolean {
  return (
    existing.userId === input.userId &&
    existing.wordId === input.wordId &&
    existing.kind === "graduate" &&
    existing.errors === input.errors
  );
}

function scheduledWordData(
  next: ReturnType<typeof scheduleReview>,
  introducedAt: Date,
) {
  return {
    dueAt: next.dueAt,
    intervalDays: next.intervalDays,
    stability: next.stability,
    difficulty: next.difficulty,
    srsState: next.srsState,
    learningSteps: next.learningSteps,
    reps: next.reps,
    lapses: next.lapses,
    lastReviewAt: next.lastReviewAt,
    introducedAt,
    version: { increment: 1 },
  };
}

export async function persistReview(
  input: ReviewInput,
  prisma: PrismaClient = getPrisma(),
): Promise<LearningMutationResult> {
  const now = input.now ?? new Date();

  return runSerializable(prisma, async (transaction) => {
    const existing = await transaction.reviewLog.findUnique({
      where: { operationId: input.operationId },
    });
    if (existing) {
      if (!sameReviewOperation(existing, input)) {
        throw new IdempotencyConflictError();
      }
      return duplicateResult(transaction, existing, input.userId);
    }

    const word = await transaction.userWord.findFirst({
      where: { id: input.wordId, userId: input.userId },
    });
    if (!word) throw new LearningMutationNotFoundError();

    const next = scheduleReview(word, input.rating, now);
    const introduced = word.introducedAt === null;
    const wordVersion = word.version + 1;
    const applied = await transaction.userWord.updateMany({
      where: {
        id: word.id,
        userId: input.userId,
        version: word.version,
      },
      data: scheduledWordData(next, word.introducedAt ?? now),
    });
    if (applied.count !== 1) throw new RetryableTransactionConflict();

    const sittingId = await ownedSittingId(
      transaction,
      input.userId,
      input.sittingId,
    );
    const review = await transaction.reviewLog.create({
      data: {
        operationId: input.operationId,
        wordVersion,
        wordId: word.id,
        userId: word.userId,
        sittingId,
        rating: input.rating,
        kind: input.kind,
        verdict: input.verdict,
        elapsedMs: input.elapsedMs,
        nextIntervalDays: next.intervalDays,
        prevCard: snapshotOf(word) as unknown as Prisma.InputJsonValue,
        prevIntervalDays: word.intervalDays,
        prevEase: word.ease,
        prevDueAt: word.dueAt,
        prevIntroducedAt: word.introducedAt,
      },
    });
    if (sittingId) {
      await persistTouch(
        input.userId,
        sittingId,
        {
          now,
          rating: input.rating,
          introduced,
          allowEnded: true,
        },
        transaction,
      );
    }

    const updated = await transaction.userWord.findUniqueOrThrow({
      where: { id: word.id },
    });
    return {
      word: updated,
      reviewId: review.id,
      operationId: input.operationId,
      duplicate: false,
    };
  });
}

export async function persistGraduation(
  input: GraduationInput,
  prisma: PrismaClient = getPrisma(),
): Promise<LearningMutationResult> {
  const now = input.now ?? new Date();

  return runSerializable(prisma, async (transaction) => {
    const existing = await transaction.reviewLog.findUnique({
      where: { operationId: input.operationId },
    });
    if (existing) {
      if (!sameGraduationOperation(existing, input)) {
        throw new IdempotencyConflictError();
      }
      return duplicateResult(transaction, existing, input.userId);
    }

    const word = await transaction.userWord.findFirst({
      where: { id: input.wordId, userId: input.userId },
    });
    if (!word) throw new LearningMutationNotFoundError();
    if (word.introducedAt) throw new AlreadyScheduledError();

    const next = scheduleGraduation(input.errors, now);
    const wordVersion = word.version + 1;
    const applied = await transaction.userWord.updateMany({
      where: {
        id: word.id,
        userId: input.userId,
        version: word.version,
        introducedAt: null,
      },
      data: scheduledWordData(next, now),
    });
    if (applied.count !== 1) throw new RetryableTransactionConflict();

    const sittingId = await ownedSittingId(
      transaction,
      input.userId,
      input.sittingId,
    );
    const review = await transaction.reviewLog.create({
      data: {
        operationId: input.operationId,
        wordVersion,
        wordId: word.id,
        userId: word.userId,
        sittingId,
        rating: "good",
        kind: "graduate",
        errors: input.errors,
        nextIntervalDays: next.intervalDays,
        prevCard: snapshotOf(word) as unknown as Prisma.InputJsonValue,
        prevIntervalDays: word.intervalDays,
        prevEase: word.ease,
        prevDueAt: word.dueAt,
        prevIntroducedAt: word.introducedAt,
      },
    });
    if (sittingId) {
      await persistTouch(
        input.userId,
        sittingId,
        { now, introduced: true, allowEnded: true },
        transaction,
      );
    }

    const updated = await transaction.userWord.findUniqueOrThrow({
      where: { id: word.id },
    });
    return {
      word: updated,
      reviewId: review.id,
      operationId: input.operationId,
      duplicate: false,
    };
  });
}

export async function undoReview(
  input: { userId: string; operationId: string },
  prisma: PrismaClient = getPrisma(),
): Promise<{ word: UserWord; operationId: string }> {
  return runSerializable(prisma, async (transaction) => {
    const review = await transaction.reviewLog.findUnique({
      where: { operationId: input.operationId },
    });
    if (!review || review.userId !== input.userId) {
      throw new NothingToUndoError();
    }

    const word = await transaction.userWord.findFirst({
      where: { id: review.wordId, userId: input.userId },
    });
    if (!word) throw new LearningMutationNotFoundError();
    if (review.undoneAt) {
      return { word, operationId: input.operationId };
    }

    const latest = await transaction.reviewLog.findFirst({
      where: {
        wordId: word.id,
        wordVersion: { not: null },
        undoneAt: null,
      },
      orderBy: { wordVersion: "desc" },
      select: { id: true },
    });
    if (latest?.id !== review.id) throw new UndoOrderConflictError();

    const previous = restoreFromSnapshot(review);
    if (!previous) throw new NothingToUndoError();

    const applied = await transaction.userWord.updateMany({
      where: {
        id: word.id,
        userId: input.userId,
        version: word.version,
      },
      data: {
        dueAt: previous.dueAt,
        intervalDays: previous.intervalDays,
        stability: previous.stability,
        difficulty: previous.difficulty,
        srsState: previous.srsState,
        learningSteps: previous.learningSteps,
        reps: previous.reps,
        lapses: previous.lapses,
        lastReviewAt: previous.lastReviewAt,
        introducedAt: previous.introducedAt,
        version: { increment: 1 },
      },
    });
    if (applied.count !== 1) throw new RetryableTransactionConflict();

    if (review.sittingId) {
      await persistReviewUndo(
        input.userId,
        review.sittingId,
        {
          rating: review.rating === "again" ? "again" : "good",
          introduced: review.prevIntroducedAt === null,
          graduation: review.kind === "graduate",
        },
        transaction,
      );
    }
    await transaction.reviewLog.update({
      where: { id: review.id },
      data: { undoneAt: new Date() },
    });

    const updated = await transaction.userWord.findUniqueOrThrow({
      where: { id: word.id },
    });
    return { word: updated, operationId: input.operationId };
  });
}
