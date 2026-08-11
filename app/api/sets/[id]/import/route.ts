import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { normalizeKey } from "@/lib/lexicon/key";
import { parseImportText } from "@/lib/parse-import";

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

  // One paste often repeats a word. Collapse before touching the database, so
  // "skipped" counts it here rather than the unique index swallowing it later.
  const byKey = new Map<string, { front: string; back: string }>();
  for (const word of incoming) {
    const key = normalizeKey(word.front);
    if (!key) {
      skipped += 1;
      continue;
    }
    if (byKey.has(key)) {
      skipped += 1;
      continue;
    }
    byKey.set(key, word);
  }

  if (byKey.size === 0) {
    return NextResponse.json(
      { error: "No complete words. Each word needs a translation." },
      { status: 400 },
    );
  }

  const now = new Date();
  const prisma = getPrisma();
  const source = parsed.data.source ?? null;

  // Three statements rather than one round trip per word: a 500-word paste
  // would otherwise be 500 sequential queries against a serverless database.
  const created = await prisma.userWord.createMany({
    data: [...byKey].map(([key, word]) => ({
      userId,
      key,
      front: word.front,
      back: word.back,
      source,
      dueAt: now,
    })),
    skipDuplicates: true,
  });

  const words = await prisma.userWord.findMany({
    where: { userId, key: { in: [...byKey.keys()] } },
    select: { id: true },
  });

  await prisma.wordSetItem.createMany({
    data: words.map((word) => ({ wordId: word.id, setId: set.id })),
    skipDuplicates: true,
  });

  await prisma.wordSet.update({
    where: { id: set.id },
    data: { updatedAt: now },
  });

  return NextResponse.json({
    imported: created.count,
    alreadyKnown: words.length - created.count,
    linked: words.length,
    skipped,
  });
}
