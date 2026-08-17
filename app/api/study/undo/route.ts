import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";
import { restoreFromSnapshot } from "@/lib/srs";

const schema = z.object({
  wordId: z.string().min(1),
});

/**
 * Take back the most recent rating of a word: restore the state saved on the
 * review log and drop the log, so the mistake leaves no trace in history.
 *
 * v1 does not roll sitting counters back. Undo is a correction, not a study
 * event, and the sitting's goods/agains can disagree with the remaining logs.
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

  const word = await getPrisma().userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
    select: { id: true },
  });
  if (!word) {
    return jsonError("notFound", 404);
  }

  const last = await getPrisma().reviewLog.findFirst({
    where: { wordId: word.id },
    orderBy: { createdAt: "desc" },
  });

  const previous = last ? restoreFromSnapshot(last) : null;
  if (!last || !previous) {
    return jsonError("nothingToUndo", 409);
  }

  const [restored] = await getPrisma().$transaction([
    getPrisma().userWord.update({
      where: { id: word.id },
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
      },
    }),
    getPrisma().reviewLog.delete({ where: { id: last.id } }),
  ]);

  return NextResponse.json({ word: restored });
}
