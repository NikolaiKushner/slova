import { readFileSync } from "node:fs";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/i18n/api-error";
import { verbTableAsWords } from "@/lib/lexicon/forms";
import { allowFixedWindowAttempt } from "@/lib/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { addWords } from "@/lib/words/add";

const TABLE = "content/lexicon/en-irregular-verbs.jsonl";

/**
 * Put the irregular-verb table into this person's dictionary.
 *
 * The triples already live on the shared lexemes; the training can only deal
 * a word that is also a `UserWord`. Ready-made sets are still ComingSoon, so
 * this is the door: one write, one set, then the existing session.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError("unauthorized", 401);
  }
  const userId = session.user.id;
  if (!(await allowFixedWindowAttempt(`words:${userId}`, 40, 60 * 60 * 1000))) {
    return jsonError("tooManyWrites", 429);
  }

  const words = verbTableAsWords(readFileSync(TABLE, "utf8"));
  if (words.length === 0) {
    return jsonError("noCompleteWords", 400);
  }

  const t = await getTranslations("practice");
  const setId = await findOrCreateSet(userId, t("irregularVerbsSet"));
  const result = await addWords({
    userId,
    words,
    setId,
    source: "irregular-verbs",
  });

  return NextResponse.json({ ...result, setId });
}

async function findOrCreateSet(userId: string, title: string) {
  const prisma = getPrisma();
  const existing = await prisma.wordSet.findFirst({
    where: { userId, title },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.wordSet.create({
    data: { userId, title },
    select: { id: true },
  });
  return created.id;
}
