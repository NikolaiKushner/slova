import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ decks: [], cards: [] });
  }

  const [decks, cards] = await Promise.all([
    prisma.deck.findMany({
      where: {
        userId: session.user.id,
        title: { contains: q },
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        _count: { select: { cards: true } },
      },
    }),
    prisma.card.findMany({
      where: {
        deck: { userId: session.user.id },
        OR: [{ front: { contains: q } }, { back: { contains: q } }],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        front: true,
        back: true,
        deckId: true,
        deck: { select: { title: true } },
      },
    }),
  ]);

  return NextResponse.json({
    decks: decks.map((d) => ({
      id: d.id,
      title: d.title,
      cardCount: d._count.cards,
    })),
    cards: cards.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      deckId: c.deckId,
      deckTitle: c.deck.title,
    })),
  });
}
