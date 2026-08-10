import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cardUpdateSchema, toCardUpdateData } from "@/lib/cards";

type Params = { params: Promise<{ id: string }> };

async function findOwnedCard(cardId: string, userId: string) {
  return prisma.card.findFirst({
    where: { id: cardId, deck: { userId } },
    select: { id: true, deckId: true },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await findOwnedCard(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = cardUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A word and its translation cannot be empty." },
      { status: 400 },
    );
  }

  const card = await prisma.card.update({
    where: { id },
    data: toCardUpdateData(parsed.data),
  });

  await prisma.deck.update({
    where: { id: existing.deckId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ card });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await findOwnedCard(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.card.delete({ where: { id } });

  await prisma.deck.update({
    where: { id: existing.deckId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
