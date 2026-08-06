import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const decks = await prisma.deck.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { cards: true } },
      cards: {
        where: { dueAt: { lte: now } },
        select: { id: true },
      },
    },
  });

  return NextResponse.json({
    decks: decks.map((deck) => ({
      id: deck.id,
      title: deck.title,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      cardCount: deck._count.cards,
      dueCount: deck.cards.length,
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const deck = await prisma.deck.create({
    data: {
      title: parsed.data.title.trim(),
      userId: session.user.id,
    },
  });

  return NextResponse.json({ deck }, { status: 201 });
}
