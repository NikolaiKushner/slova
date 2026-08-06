import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const card = await prisma.card.findFirst({
    where: {
      id: parsed.data.cardId,
      deck: { userId: session.user.id },
    },
  });
  if (!card) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const next = scheduleReview(
    { intervalDays: card.intervalDays, ease: card.ease },
    parsed.data.rating as ReviewRating,
  );

  const [updated] = await prisma.$transaction([
    prisma.card.update({
      where: { id: card.id },
      data: {
        intervalDays: next.intervalDays,
        ease: next.ease,
        dueAt: next.dueAt,
      },
    }),
    prisma.reviewLog.create({
      data: {
        cardId: card.id,
        rating: parsed.data.rating,
      },
    }),
    prisma.deck.update({
      where: { id: card.deckId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ card: updated });
}
