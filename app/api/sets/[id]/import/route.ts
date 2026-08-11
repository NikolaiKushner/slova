import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { parseImportText } from "@/lib/parse-import";
import { addWords } from "@/lib/words/add";

type Params = { params: Promise<{ id: string }> };

const wordSchema = z.object({
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(2000),
});

const schema = z.union([
  z.object({
    text: z.string().min(1),
    source: z.string().max(200).optional(),
  }),
  z.object({
    words: z.array(wordSchema).min(1).max(500),
    source: z.string().max(200).optional(),
  }),
]);

/**
 * Words already in the list keep the row they have — their schedule, their
 * translation, their edits. Importing them again only adds them to this set.
 * That is the difference the join table buys: the same word in three sets is
 * one word learned once, not three cards learned three times.
 */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { id } = await params;
  const set = await getPrisma().wordSet.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!set) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide text or words with front and back" },
      { status: 400 },
    );
  }

  let incoming: { front: string; back: string }[];
  let skipped = 0;

  if ("words" in parsed.data) {
    incoming = parsed.data.words.map((w) => ({
      front: w.front.trim(),
      back: w.back.trim(),
    }));
  } else {
    const result = parseImportText(parsed.data.text);
    incoming = result.cards.filter((c) => c.front && c.back);
    skipped = result.skipped + (result.cards.length - incoming.length);
  }

  const result = await addWords({
    userId,
    words: incoming,
    setId: set.id,
    source: parsed.data.source ?? null,
  });
  skipped += result.skipped;

  if (result.added === 0 && result.alreadyKnown === 0) {
    return NextResponse.json(
      { error: "No complete words. Each word needs a translation." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    imported: result.added,
    alreadyKnown: result.alreadyKnown,
    linked: result.linked,
    skipped,
  });
}
