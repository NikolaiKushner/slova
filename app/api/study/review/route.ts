import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { scheduleReview, type ReviewRating } from "@/lib/srs";

const schema = z.object({
  wordId: z.string().min(1),
  rating: z.enum(["again", "good"]),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  }

  const word = await getPrisma().userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
  });
  if (!word) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const next = scheduleReview(
    { intervalDays: word.intervalDays, ease: word.ease },
    parsed.data.rating as ReviewRating,
    now,
  );

  const [updated] = await getPrisma().$transaction([
    getPrisma().userWord.update({
      where: { id: word.id },
      data: {
        intervalDays: next.intervalDays,
        ease: next.ease,
        dueAt: next.dueAt,
        // First rating spends one of today's new-word slots.
        introducedAt: word.introducedAt ?? now,
      },
    }),
    getPrisma().reviewLog.create({
      data: {
        wordId: word.id,
        rating: parsed.data.rating,
        // Snapshot for undo — a misclick should be one tap to take back.
        prevIntervalDays: word.intervalDays,
        prevEase: word.ease,
        prevDueAt: word.dueAt,
        prevIntroducedAt: word.introducedAt,
      },
    }),
  ]);

  return NextResponse.json({ word: updated });
}
