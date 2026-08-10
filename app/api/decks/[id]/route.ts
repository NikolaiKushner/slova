import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { langCodeSchema } from "@/lib/languages";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deck = await getPrisma().deck.findFirst({
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

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    sourceLang: langCodeSchema.optional(),
    targetLang: langCodeSchema.optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), {
    message: "Nothing to update",
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
    return NextResponse.json({ error: "Invalid list" }, { status: 400 });
  }

  const existing = await getPrisma().deck.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deck = await getPrisma().deck.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ deck });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPrisma().deck.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await getPrisma().deck.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
