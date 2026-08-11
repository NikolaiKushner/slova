import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  STUDY_SOURCE_LANG,
  STUDY_TARGET_LANG,
  langCodeSchema,
} from "@/lib/languages";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sets = await getPrisma().wordSet.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
      items: {
        where: { word: { dueAt: { lte: now } } },
        select: { wordId: true },
      },
    },
  });

  return NextResponse.json({
    sets: sets.map((set) => ({
      id: set.id,
      title: set.title,
      sourceLang: set.sourceLang,
      targetLang: set.targetLang,
      createdAt: set.createdAt,
      updatedAt: set.updatedAt,
      wordCount: set._count.items,
      dueCount: set.items.length,
    })),
  });
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
  sourceLang: langCodeSchema.optional(),
  targetLang: langCodeSchema.optional(),
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

  const set = await getPrisma().wordSet.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      sourceLang: parsed.data.sourceLang ?? STUDY_SOURCE_LANG,
      targetLang: parsed.data.targetLang ?? STUDY_TARGET_LANG,
    },
  });

  return NextResponse.json({ set }, { status: 201 });
}
