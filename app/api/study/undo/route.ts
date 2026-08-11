import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { restoreFromSnapshot } from "@/lib/srs";

const schema = z.object({
  wordId: z.string().min(1),
});

/**
 * Take back the most recent rating of a word: restore the state saved on the
 * review log and drop the log, so the mistake leaves no trace in history.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid undo" }, { status: 400 });
  }

  const word = await getPrisma().userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
    select: { id: true },
  });
  if (!word) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const last = await getPrisma().reviewLog.findFirst({
    where: { wordId: word.id },
    orderBy: { createdAt: "desc" },
  });

  const previous = last ? restoreFromSnapshot(last) : null;
  if (!last || !previous) {
    return NextResponse.json(
      { error: "Nothing to undo for this word." },
      { status: 409 },
    );
  }

  const [restored] = await getPrisma().$transaction([
    getPrisma().userWord.update({
      where: { id: word.id },
      data: previous,
    }),
    getPrisma().reviewLog.delete({ where: { id: last.id } }),
  ]);

  return NextResponse.json({ word: restored });
}
