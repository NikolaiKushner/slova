import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get("deckId");
  const now = new Date();

  const cards = await prisma.card.findMany({
    where: {
      dueAt: { lte: now },
      deck: {
        userId: session.user.id,
        ...(deckId ? { id: deckId } : {}),
      },
    },
    orderBy: { dueAt: "asc" },
    take: 100,
    select: {
      id: true,
      front: true,
      back: true,
      note: true,
      example: true,
      deckId: true,
    },
  });

  return NextResponse.json({ cards });
}
