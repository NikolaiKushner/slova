import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";
import { scheduleReview, snapshotOf, type ReviewRating } from "@/lib/srs";
import {
  clampElapsedMs,
  isLogKind,
  isReviewVerdict,
} from "@/lib/sitting";
import { persistTouch } from "@/lib/sitting-store";
import type { Prisma } from "@/app/generated/prisma/client";

const schema = z.object({
  wordId: z.string().min(1),
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

  const prisma = getPrisma();
  const word = await prisma.userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
  });
  if (!word) {
    return jsonError("notFound", 404);
  }

  const now = new Date();
  const next = scheduleReview(word, parsed.data.rating as ReviewRating, now);
  const introduced = word.introducedAt == null;
  const kind = isLogKind(parsed.data.kind) ? parsed.data.kind : null;
  const verdict = isReviewVerdict(parsed.data.verdict)
    ? parsed.data.verdict
    : null;
  const elapsedMs =
    parsed.data.elapsedMs === undefined
      ? null
      : clampElapsedMs(parsed.data.elapsedMs);

  let sittingId: string | null = null;
  if (parsed.data.sittingId) {
    const sitting = await prisma.studySitting.findFirst({
      where: { id: parsed.data.sittingId, userId: session.user.id },
      select: { id: true },
    });
    sittingId = sitting?.id ?? null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextWord = await tx.userWord.update({
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
        // First rating spends one of today's new-word slots.
        introducedAt: word.introducedAt ?? now,
      },
    });
    await tx.reviewLog.create({
      data: {
        wordId: word.id,
        userId: word.userId,
        sittingId,
        rating: parsed.data.rating,
        kind,
        verdict,
        elapsedMs,
        nextIntervalDays: next.intervalDays,
        // Snapshot for undo — a misclick should be one tap to take back.
        // The whole scheduler state goes in one column: putting back an
        // interval without the memory behind it would restore the date and
        // quietly lose what the scheduler had learned about the word.
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
        {
          now,
          rating: parsed.data.rating,
          introduced,
          allowEnded: true,
        },
        tx,
      );
    }
    return nextWord;
  });

  return NextResponse.json({ word: updated });
}
