import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { normalizeKey } from "@/lib/lexicon/key";
import { toWordUpdateData, wordUpdateSchema } from "@/lib/words";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPrisma().userWord.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = wordUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A word and its translation cannot be empty." },
      { status: 400 },
    );
  }

  const data = toWordUpdateData(parsed.data);
  // Renaming a word moves its identity; the key has to follow or the next
  // import of the new spelling would create a second row for the same word.
  const key = data.front === undefined ? undefined : normalizeKey(data.front);

  if (key !== undefined) {
    const clash = await getPrisma().userWord.findFirst({
      where: { userId: session.user.id, key, id: { not: id } },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: "You already have that word." },
        { status: 409 },
      );
    }
  }

  const word = await getPrisma().userWord.update({
    where: { id },
    data: key === undefined ? data : { ...data, key },
  });

  return NextResponse.json({ word });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getPrisma().userWord.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await getPrisma().userWord.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
