import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { ratingOf } from "@/lib/word-rating";
import { recordTranslations } from "@/lib/lexicon/write";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Each word needs a word and a translation." },
      { status: 400 },
    );
  }

  const { words, setId, setTitle, source } = parsed.data;
  if (setId && setTitle) {
    return NextResponse.json(
      { error: "Choose an existing set or name a new one, not both." },
      { status: 400 },
    );
  }

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    targetSetId = set.id;
  } else if (setTitle) {
    const title = setTitle.trim();
    // Typing the name of a set that already exists means that set, not a
    // second one wearing the same name.
    const existing = await prisma.wordSet.findFirst({
      where: { userId, title },
      select: { id: true },
    });
    targetSetId =
      existing?.id ??
      (await prisma.wordSet.create({ data: { userId, title }, select: { id: true } }))
        .id;
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
    ).catch(() => {});
  }

  if (result.added === 0 && result.alreadyKnown === 0) {
    return NextResponse.json(
      { error: "No complete words. Each word needs a translation." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ...result, setId: targetSetId });
}
