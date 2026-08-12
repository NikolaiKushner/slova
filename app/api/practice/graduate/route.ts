import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

/**
 * A word leaving Brainstorm and entering the schedule.
 *
 * Not the review endpoint, and the difference matters. A review says "this
 * went well or badly, move the interval accordingly"; this says "this word has
 * just been learned from scratch, and here is how easily". It writes the
 * starting interval and ease outright rather than nudging what was there,
 * because there was nothing there — the word had never been studied.
 *
 * The numbers come from `graduate()` and are re-derived here rather than
 * trusted: a client could otherwise post itself an ease of 3.0 for every word.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const schema = z.object({
  wordId: z.string().min(1),
  intervalDays: z.number().min(0).max(1),
  ease: z.number().min(1.3).max(3.0),
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

  const now = new Date();
  const { intervalDays, ease } = parsed.data;

  await prisma.userWord.update({
    where: { id: word.id },
    data: {
      intervalDays,
      ease,
      dueAt: new Date(now.getTime() + intervalDays * MS_PER_DAY),
      // A word graduates once. Running Brainstorm again later must not reset
      // the date it was first met, which is what the new-word allowance and
      // the learned rating both read.
      introducedAt: word.introducedAt ?? now,
    },
  });

  return NextResponse.json({ ok: true });
}
