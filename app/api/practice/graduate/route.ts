import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import {
  AlreadyScheduledError,
  IdempotencyConflictError,
  LearningMutationNotFoundError,
  persistGraduation,
} from "@/lib/learning-mutations";

/**
 * A word leaving Brainstorm and entering the schedule.
 *
 * Not the review endpoint, and the difference matters. A review says "this
 * went well or badly, move the interval accordingly"; this says "this word has
 * just been learned from scratch, and here is how easily".
 *
 * The client sends what it observed — how many times the word was missed —
 * and the scheduler decides what that is worth. It is not allowed to send the
 * schedule itself, or it could hand every word the longest interval going.
 */

const schema = z.object({
  wordId: z.string().min(1),
  operationId: z.string().uuid(),
  /** How many times the word was missed on its way up the ladder. */
  errors: z.number().int().min(0).max(50),
  sittingId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("invalidResult", 400);
  }

  try {
    const result = await persistGraduation({
      userId: session.user.id,
      ...parsed.data,
    });
    return NextResponse.json({
      word: result.word,
      review: {
        id: result.reviewId,
        operationId: result.operationId,
        duplicate: result.duplicate,
      },
    });
  } catch (error) {
    if (error instanceof LearningMutationNotFoundError) {
      return jsonError("notFound", 404);
    }
    if (error instanceof AlreadyScheduledError) {
      return jsonError("alreadyInSchedule", 409);
    }
    if (error instanceof IdempotencyConflictError) {
      return jsonError("invalidResult", 409);
    }
    throw error;
  }
}
