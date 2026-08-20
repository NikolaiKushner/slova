import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import {
  GrammarReviewConflictError,
  GrammarReviewNotFoundError,
  persistGrammarReview,
} from "@/lib/courses/review-store";
import { requestTimeZone } from "@/lib/request-timezone";
import { clampElapsedMs } from "@/lib/sitting";

/**
 * One answered Grammar Review prompt.
 *
 * A Route Handler rather than a Server Action: every learning answer goes
 * through `useReliableMutations`, which retries and shows what has not been
 * saved, and that surface takes HTTP endpoints.
 *
 * There is no GET twin — the review page is a Server Component and reads its
 * own queue.
 */
const schema = z.object({
  memoryId: z.string().min(1).max(80),
  courseSlug: z.string().min(1).max(80),
  ruleId: z.string().min(1).max(80),
  exerciseId: z.string().min(1).max(80),
  operationId: z.string().uuid(),
  correct: z.boolean(),
  elapsedMs: z.number().optional(),
  sittingId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalidGrammarReview", 400);
  }

  // The zone decides when the rule comes back, so it is read here, beside the
  // session, and never taken from the body.
  const timeZone = await requestTimeZone();
  const elapsedMs =
    parsed.data.elapsedMs === undefined
      ? null
      : clampElapsedMs(parsed.data.elapsedMs);

  try {
    const result = await persistGrammarReview({
      userId: session.user.id,
      ...parsed.data,
      elapsedMs,
      timeZone,
      now: new Date(),
    });
    return NextResponse.json({
      review: {
        operationId: result.operationId,
        duplicate: result.duplicate,
        stale: result.stale,
        stage: result.stage,
        dueAt: result.dueAt?.toISOString() ?? null,
        cleared: result.cleared,
      },
    });
  } catch (error) {
    if (error instanceof GrammarReviewNotFoundError) {
      return jsonError("notFound", 404);
    }
    if (error instanceof GrammarReviewConflictError) {
      return jsonError("invalidGrammarReview", 409);
    }
    throw error;
  }
}
