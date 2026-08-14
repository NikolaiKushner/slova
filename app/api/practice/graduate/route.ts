import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { scheduleGraduation } from "@/lib/srs";

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
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  const prisma = getPrisma();
  const word = await prisma.userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
    select: { id: true, introducedAt: true },
  });
  if (!word) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (word.introducedAt) {
    return NextResponse.json(
      { error: "That word is already in the schedule." },
      { status: 409 },
    );
  }

  const now = new Date();
  const next = scheduleGraduation(parsed.data.errors, now);

  await prisma.userWord.update({
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

  return NextResponse.json({ ok: true });
}
