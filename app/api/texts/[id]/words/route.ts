import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { lookupBatch } from "@/lib/lexicon/lookup";
import { getPrisma } from "@/lib/prisma";
import { allowFixedWindowAttempt } from "@/lib/rate-limit";
import { glossFor } from "@/lib/texts/gloss-cache";
import { lemmatize } from "@/lib/texts/lemma";
import { parseText } from "@/lib/texts/tokenize";
import { addWords } from "@/lib/words/add";

/**
 * Add one word from a text to the dictionary — docs/plans/reader.md §5.2,
 * mirroring app/api/stories/[slug]/words/route.ts, contextual-gloss fallback
 * and all. The client names a token, never a word.
 */

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ tokenId: z.string().min(1).max(20) });

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;

  const { id } = await params;
  const prisma = getPrisma();
  const text = await prisma.userText.findFirst({
    where: { id, userId },
    select: { body: true, glosses: true },
  });
  if (!text) {
    return jsonError("notFound", 404);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("invalidToken", 400);
  }

  const token = parseText(text.body, lemmatize)
    .paragraphs.flatMap((paragraph) => paragraph.tokens)
    .find((candidate) => candidate.id === parsed.data.tokenId);
  if (!token) {
    return jsonError("invalidToken", 400);
  }

  if (!(await allowFixedWindowAttempt(`texts-words:${userId}`, 40, 60 * 60 * 1000))) {
    return jsonError("tooManyWrites", 429);
  }

  const { hits } = await lookupBatch([token.lemma, token.key]);
  const back =
    hits.get(token.lemma)?.translation ??
    hits.get(token.key)?.translation ??
    glossFor(text.glosses, token.id);
  if (!back) {
    return jsonError("noTranslationYet", 400);
  }

  await addWords({
    userId,
    words: [{ front: token.lemma, back }],
    source: `text:${id}`,
  });

  const word = await prisma.userWord.findFirst({
    where: { userId, key: token.lemma },
    select: { introducedAt: true, intervalDays: true },
  });

  return NextResponse.json({ word });
}
