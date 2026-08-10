import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { scheduleReview, type ReviewRating } from "@/lib/srs";

const schema = z.object({
  cardId: z.string().min(1),
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

  const card = await getPrisma().card.findFirst({
    where: {
      id: parsed.data.cardId,
      deck: { userId: session.user.id },
    },
  });
  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const next = scheduleReview(
    { intervalDays: card.intervalDays, ease: card.ease },
    parsed.data.rating as ReviewRating,
    now,
  );

  const [updated] = await getPrisma().$transaction([
    getPrisma().card.update({
      where: { id: card.id },
      data: {
        intervalDays: next.intervalDays,
        ease: next.ease,
        dueAt: next.dueAt,
        // First rating spends one of today's new-word slots.
        introducedAt: card.introducedAt ?? now,
      },
    }),
    getPrisma().reviewLog.create({
      data: {
        cardId: card.id,
        rating: parsed.data.rating,
        // Snapshot for undo — a misclick should be one tap to take back.
        prevIntervalDays: card.intervalDays,
        prevEase: card.ease,
        prevDueAt: card.dueAt,
        prevIntroducedAt: card.introducedAt,
      },
    }),
    getPrisma().deck.update({
      where: { id: card.deckId },
      data: { updatedAt: now },
    }),
  ]);

  return NextResponse.json({ card: updated });
}
