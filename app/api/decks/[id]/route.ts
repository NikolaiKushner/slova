import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deck = await prisma.deck.findFirst({
    where: { id, userId: session.user.id },
    include: {
      cards: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!deck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const dueCount = deck.cards.filter((c) => c.dueAt <= now).length;

  return NextResponse.json({ deck: { ...deck, dueCount } });
}

const updateSchema = z.object({
  title: z.string().min(1).max(120),
});

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  }

  const existing = await prisma.deck.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deck = await prisma.deck.update({
    where: { id },
    data: { title: parsed.data.title.trim() },
  });

  return NextResponse.json({ deck });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.deck.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.deck.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
