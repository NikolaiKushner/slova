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
  const set = await getPrisma().wordSet.findFirst({
    where: { id, userId: session.user.id },
    include: {
      items: {
        orderBy: { addedAt: "asc" },
        include: { word: true },
      },
    },
  });

  if (!set) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const words = set.items.map((item) => item.word);

  return NextResponse.json({
    set: {
      id: set.id,
      title: set.title,
      sourceLang: set.sourceLang,
      targetLang: set.targetLang,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
      words,
      dueCount: words.filter((word) => word.dueAt <= now).length,
    },
  });
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
    return NextResponse.json({ error: "Invalid set" }, { status: 400 });
  }

  const existing = await getPrisma().wordSet.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const set = await getPrisma().wordSet.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ set });
}

/**
 * Deleting a set deletes the set, not the words in it. A word can sit in
 * several sets and keeps one schedule, so membership is all that goes.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPrisma().wordSet.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await getPrisma().wordSet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
