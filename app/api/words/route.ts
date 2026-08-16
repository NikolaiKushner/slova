import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { getPrisma } from "@/lib/prisma";
import { normalizeRow } from "@/lib/normalize";
import { ratingOf } from "@/lib/word-rating";
import { recordTranslations } from "@/lib/lexicon/write";
import { allowAttemptDurable } from "@/lib/rate-limit";
import { bulkIdsSchema, filingSchema } from "@/lib/words";
import { addWords } from "@/lib/words/add";
import {
  pageCount,
  parseWordsQuery,
  wordsOrderBy,
  wordsSkip,
  wordsWhere,
} from "@/lib/words-query";

/**
 * The dictionary: every word this user has, one row each, however many sets it
 * belongs to.
 *
 * Paged in the database rather than in memory. A list of five thousand words
 * is not large, but fetching all of it to show twenty-five of them is the kind
 * of thing that works fine until the day it does not.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const query = parseWordsQuery(new URL(request.url).searchParams);
  const where = wordsWhere(session.user.id, query);
  const prisma = getPrisma();

  const [total, rows] = await Promise.all([
    prisma.userWord.count({ where }),
    prisma.userWord.findMany({
      where,
      orderBy: wordsOrderBy(query),
      skip: wordsSkip(query),
      take: query.pageSize,
      select: {
        id: true,
        front: true,
        back: true,
        introducedAt: true,
        intervalDays: true,
        dueAt: true,
        createdAt: true,
        sets: { select: { set: { select: { id: true, title: true } } } },
      },
    }),
  ]);

  return NextResponse.json({
    words: rows.map((word) => ({
      id: word.id,
      front: word.front,
      back: word.back,
      sets: word.sets.map((item) => item.set),
      rating: ratingOf(word),
      dueAt: word.dueAt,
      createdAt: word.createdAt,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    pages: pageCount(total, query.pageSize),
  });
}

const wordSchema = z.object({
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(2000),
  /**
   * True when a person typed this translation rather than the model filling it
   * in. Those are offered to the shared base as candidates: one person's
   * shorthand must not become everyone's answer on sight.
   */
  typed: z.boolean().optional(),
});

const schema = z.object({
  words: z.array(wordSchema).min(1).max(500),
  /** An existing set to file these under. */
  setId: z.string().min(1).optional(),
  /** Or the name of one to create. Both is a contradiction, and is refused. */
  setTitle: z.string().min(1).max(120).optional(),
  source: z.string().max(200).optional(),
});

/**
 * Add words, optionally into a set — an existing one or a new one named here.
 * A word with no set is a perfectly good word: sets are tags, not folders, and
 * the dictionary is the thing that owns the word.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;
  if (!(await allowAttemptDurable(`words:${userId}`, 40, 60 * 60 * 1000))) {
    return jsonError("tooManyWrites", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("eachNeedsPair", 400);
  }

  const { setId, setTitle, source } = parsed.data;
  if (setId && setTitle) {
    return jsonError("chooseSetOrName", 400);
  }

  /*
   * Case is folded here, at the boundary, because both things that follow have
   * to agree on it: the row in this person's dictionary and the entry offered
   * to the shared base. A word capitalised only because it began a pasted line
   * or because a phone capitalised it is not spelled that way, and the spelling
   * on the screen is the one that gets memorised. Acronyms and phrases holding
   * a name keep their capitals — see lib/normalize.
   */
  const words = parsed.data.words.map((word) => ({
    ...word,
    ...normalizeRow(word.front, word.back),
  }));

  const prisma = getPrisma();
  let targetSetId: string | null = null;

  if (setId) {
    // Checked here rather than trusted: a set id arrives from the client, and
    // someone else's set must read as missing, not as forbidden.
    const set = await prisma.wordSet.findFirst({
      where: { id: setId, userId },
      select: { id: true },
    });
    if (!set) {
      return jsonError("notFound", 404);
    }
    targetSetId = set.id;
  } else if (setTitle) {
    targetSetId = await findOrCreateSet(userId, setTitle);
  }

  const result = await addWords({
    userId,
    words,
    setId: targetSetId,
    source: source ?? null,
  });

  // Words the model translated are already in the shared base — the batch
  // route wrote them as it answered. What is left is what a person typed, and
  // that goes in as a candidate: private until a second, independent source
  // produces the same text. Failing here must not fail the add; the words are
  // saved either way, and the base is a cache.
  const typed = words.filter((word) => word.typed);
  if (typed.length > 0) {
    await recordTranslations(
      typed.map((word) => ({
        text: word.front,
        translation: word.back,
        source: "import" as const,
      })),
      { userId },
    ).catch(() => {});
  }

  if (result.added === 0 && result.alreadyKnown === 0) {
    return jsonError("noCompleteWords", 400);
  }

  return NextResponse.json({ ...result, setId: targetSetId });
}

/**
 * Delete several words at once.
 *
 * Scoped by user in the same statement rather than checked first: a list of
 * ids from a browser is a request, not a fact, and the only safe way to honour
 * it is to make ownership part of the delete itself.
 */
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }

  const parsed = bulkIdsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("whichWords", 400);
  }

  const { count } = await getPrisma().userWord.deleteMany({
    where: { id: { in: parsed.data.ids }, userId: session.user.id },
  });

  return NextResponse.json({ deleted: count });
}

/**
 * File several words into a set — an existing one, or a new one named here —
 * or take them out of one. Words that arrived with no set get one later this
 * way, rather than having to be added again.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;

  const parsed = filingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("whichWordsWhere", 400);
  }

  const prisma = getPrisma();
  const words = await prisma.userWord.findMany({
    where: { id: { in: parsed.data.ids }, userId },
    select: { id: true },
  });
  if (words.length === 0) {
    return jsonError("notFound", 404);
  }

  let targetSetId: string;
  if (parsed.data.setId) {
    const set = await prisma.wordSet.findFirst({
      where: { id: parsed.data.setId, userId },
      select: { id: true },
    });
    if (!set) return jsonError("notFound", 404);
    targetSetId = set.id;
  } else {
    targetSetId = await findOrCreateSet(userId, parsed.data.setTitle!);
  }

  const ids = words.map((word) => word.id);

  if (parsed.data.mode === "remove") {
    await prisma.wordSetItem.deleteMany({
      where: { wordId: { in: ids }, setId: targetSetId },
    });
  } else {
    if (parsed.data.mode === "move") {
      // Moving means this set and no other; adding leaves the rest alone.
      await prisma.wordSetItem.deleteMany({ where: { wordId: { in: ids } } });
    }
    await prisma.wordSetItem.createMany({
      data: ids.map((wordId) => ({ wordId, setId: targetSetId })),
      skipDuplicates: true,
    });
  }
  await prisma.wordSet.update({
    where: { id: targetSetId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ filed: ids.length, setId: targetSetId });
}

/**
 * Typing the name of a set that already exists means that set, not a second
 * one wearing the same name.
 */
async function findOrCreateSet(userId: string, title: string) {
  const prisma = getPrisma();
  const trimmed = title.trim();
  const existing = await prisma.wordSet.findFirst({
    where: { userId, title: trimmed },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.wordSet.create({
    data: { userId, title: trimmed },
    select: { id: true },
  });
  return created.id;
}
