import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseImportText } from "@/lib/parse-import";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  text: z.string().min(1),
  source: z.string().max(200).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deck = await prisma.deck.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!deck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const { cards, skipped } = parseImportText(parsed.data.text);
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "No cards found. Use lines like: word — translation" },
      { status: 400 },
    );
  }

  const now = new Date();
  await prisma.card.createMany({
    data: cards.map((card) => ({
      deckId: deck.id,
      front: card.front,
      back: card.back,
      source: parsed.data.source ?? null,
      dueAt: now,
    })),
  });

  await prisma.deck.update({
    where: { id: deck.id },
    data: { updatedAt: now },
  });

  return NextResponse.json({
    imported: cards.length,
    skipped,
  });
}
