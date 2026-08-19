import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { normalizeKey } from "@/lib/lexicon/key";
import { lookupBatch } from "@/lib/lexicon/lookup";
import { getPrisma } from "@/lib/prisma";
import { allowFixedWindowAttempt } from "@/lib/rate-limit";
import { loadStory } from "@/lib/stories/load";
import { StoryContentError } from "@/lib/stories/validate";
import { addWords } from "@/lib/words/add";

/**
 * Add one glossed word from a story to the dictionary — docs/plans/stories.md
 * §3.4/§5.5. Translation resolution order: the shared base first, the
 * contextual gloss only as fallback — a contextual gloss is deliberately
 * narrow ("running late" in this sentence) and must never become the
 * `LexemeTranslation`, so it only ever lands in this user's own
 * `UserWord.back`, tagged `source: "story:<slug>"`.
 *
 * Idempotent: `addWords` leaves an existing row and its schedule untouched,
 * so tapping "Добавить" twice, or on a word already in the dictionary from
 * elsewhere, does nothing destructive.
 */

type Params = { params: Promise<{ slug: string }> };

const schema = z.object({ annotationId: z.string().min(1) });

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;

  const { slug } = await params;
  let story;
  try {
    story = loadStory(slug);
  } catch (error) {
    if (error instanceof StoryContentError) {
      return jsonError("notFound", 404);
    }
    throw error;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("invalidAnnotation", 400);
  }

  const annotation = story.annotations.find(
    (item) => item.id === parsed.data.annotationId,
  );
  if (!annotation) {
    return jsonError("invalidAnnotation", 400);
  }

  if (!(await allowFixedWindowAttempt(`stories-words:${userId}`, 40, 60 * 60 * 1000))) {
    return jsonError("tooManyWrites", 429);
  }

  const key = normalizeKey(annotation.lemma);
  const { hits } = await lookupBatch([annotation.lemma]);
  const back = hits.get(key)?.translation ?? annotation.glossRu;

  await addWords({
    userId,
    words: [{ front: annotation.lemma, back }],
    source: `story:${slug}`,
  });

  const word = await getPrisma().userWord.findFirst({
    where: { userId, key },
    select: { introducedAt: true, intervalDays: true },
  });

  return NextResponse.json({ word });
}
