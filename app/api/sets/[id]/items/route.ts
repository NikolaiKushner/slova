import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ wordId: z.string().min(1) });

/**
 * Membership of a word in a set — putting it in, and taking it out.
 *
 * Taking it out is the whole reason this exists. Until now the only action on
 * a set page deleted the word from the dictionary, schedule and all, which is
 * a different and much larger thing than "this doesn't belong in this list".
 * Separating them is what `WordSetItem` was introduced for: the word belongs
 * to the person, and a set is a tag on it.
 */
async function ownedSet(setId: string, userId: string) {
  return getPrisma().wordSet.findFirst({
    where: { id: setId, userId },
    select: { id: true },
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const { id } = await params;
  const set = await ownedSet(id, session.user.id);
  if (!set) return jsonError("notFound", 404);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("whichWord", 400);
  }

  const prisma = getPrisma();
  // Someone else's word must read as missing rather than as forbidden.
  const word = await prisma.userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
    select: { id: true },
  });
  if (!word) return jsonError("notFound", 404);

  await prisma.wordSetItem.createMany({
    data: [{ wordId: word.id, setId: set.id }],
    skipDuplicates: true,
  });
  await prisma.wordSet.update({
    where: { id: set.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

/**
 * Removes the word from this set and nothing else. The word keeps its row, its
 * translation and its schedule, and stays in every other set it belongs to.
 */
export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const { id } = await params;
  const set = await ownedSet(id, session.user.id);
  if (!set) return jsonError("notFound", 404);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("whichWord", 400);
  }

  const prisma = getPrisma();
  // Scoped by userId as well as by set: deleting a membership row must not be
  // reachable by guessing a word id.
  const word = await prisma.userWord.findFirst({
    where: { id: parsed.data.wordId, userId: session.user.id },
    select: { id: true },
  });
  if (!word) return jsonError("notFound", 404);

  await prisma.wordSetItem.deleteMany({
    where: { wordId: word.id, setId: set.id },
  });
  await prisma.wordSet.update({
    where: { id: set.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
