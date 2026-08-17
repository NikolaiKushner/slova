import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import {
  IdempotencyConflictError,
  LearningMutationNotFoundError,
  persistReview,
} from "@/lib/learning-mutations";
import {
  clampElapsedMs,
  isLogKind,
  isReviewVerdict,
} from "@/lib/sitting";

const schema = z.object({
  wordId: z.string().min(1),
  operationId: z.string().uuid(),
  rating: z.enum(["again", "good"]),
  sittingId: z.string().min(1).optional(),
  kind: z.string().min(1).max(40).optional(),
  verdict: z.enum(["correct", "almost", "wrong"]).optional(),
  elapsedMs: z.number().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalidReview", 400);
  }

  const now = new Date();
  const kind = isLogKind(parsed.data.kind) ? parsed.data.kind : null;
  const verdict = isReviewVerdict(parsed.data.verdict)
    ? parsed.data.verdict
    : null;
  const elapsedMs =
    parsed.data.elapsedMs === undefined
      ? null
      : clampElapsedMs(parsed.data.elapsedMs);

  try {
    const result = await persistReview({
      userId: session.user.id,
      ...parsed.data,
      kind,
      verdict,
      elapsedMs,
      now,
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
    if (error instanceof IdempotencyConflictError) {
      return jsonError("invalidReview", 409);
    }
    throw error;
  }
}
