import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import {
  LearningMutationNotFoundError,
  NothingToUndoError,
  undoReview,
  UndoOrderConflictError,
} from "@/lib/learning-mutations";

const schema = z.object({
  operationId: z.string().uuid(),
});

/**
 * Take back one exact operation. It must still be the latest active review for
 * its word; the word state, log, and sitting counters change atomically.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("invalidUndo", 400);
  }

  try {
    const result = await undoReview({
      userId: session.user.id,
      operationId: parsed.data.operationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LearningMutationNotFoundError) {
      return jsonError("notFound", 404);
    }
    if (
      error instanceof NothingToUndoError ||
      error instanceof UndoOrderConflictError
    ) {
      return jsonError("nothingToUndo", 409);
    }
    throw error;
  }
}
