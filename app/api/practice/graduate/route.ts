import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";
import { scheduleGraduation, snapshotOf } from "@/lib/srs";
import { persistTouch } from "@/lib/sitting-store";
import type { Prisma } from "@/app/generated/prisma/client";

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

  const prisma = getPrisma();
  const word = await prisma.userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
  });
  if (!word) return jsonError("notFound", 404);
  if (word.introducedAt) {
    return jsonError("alreadyInSchedule", 409);
  }

  const now = new Date();
  const next = scheduleGraduation(parsed.data.errors, now);

  let sittingId: string | null = null;
  if (parsed.data.sittingId) {
    const sitting = await prisma.studySitting.findFirst({
      where: { id: parsed.data.sittingId, userId: session.user.id },
      select: { id: true },
    });
    sittingId = sitting?.id ?? null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.userWord.update({
      where: { id: word.id },
      data: {
        dueAt: next.dueAt,
        intervalDays: next.intervalDays,
        stability: next.stability,
        difficulty: next.difficulty,
        srsState: next.srsState,
        learningSteps: next.learningSteps,
        reps: next.reps,
        lapses: next.lapses,
        lastReviewAt: next.lastReviewAt,
        // A word graduates once. Running Brainstorm again later must not reset
        // the date it was first met, which is what the new-word allowance and
        // the learned rating both read.
        introducedAt: word.introducedAt ?? now,
      },
    });
    await tx.reviewLog.create({
      data: {
        wordId: word.id,
        userId: word.userId,
        sittingId,
        rating: "good",
        kind: "graduate",
        errors: parsed.data.errors,
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
        session.user.id,
        sittingId,
        { now, introduced: true, allowEnded: true },
        tx,
      );
    }
  });

  return NextResponse.json({ ok: true });
}
