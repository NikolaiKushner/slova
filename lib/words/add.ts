import { normalizeKey } from "@/lib/lexicon/key";
import { getPrisma } from "@/lib/prisma";

/**
 * Adding words to someone's dictionary, and optionally into one of their sets.
 *
 * The rule that makes this worth a shared function: **a word already in the
 * list keeps the row it has** — its schedule, its translation, its edits.
 * Adding it again only files it under another set. That is what the join table
 * bought us, and it has to hold whoever is calling: the paste box, the set
 * page, and whatever comes next.
 */

export type IncomingWord = { front: string; back: string };

/** A word has at least one letter or digit in it; a row of dashes does not. */
const HAS_CONTENT = /[\p{L}\p{N}]/u;

export type AddWordsResult = {
  /** Rows that did not exist before. */
  added: number;
  /** Words the user already had; left untouched. */
  alreadyKnown: number;
  /** Words now in the target set, new or not. */
  linked: number;
  /** Entries thrown away: blank, or a repeat within this same batch. */
  skipped: number;
};

/**
 * One paste often repeats a word. Collapsing here rather than letting the
 * unique index swallow it means `skipped` can report it honestly.
 */
export function dedupe(words: readonly IncomingWord[]): {
  byKey: Map<string, IncomingWord>;
  skipped: number;
} {
  const byKey = new Map<string, IncomingWord>();
  let skipped = 0;

  for (const word of words) {
    const front = word.front.trim();
    const back = word.back.trim();
    const key = normalizeKey(front);
    // A separator line pasted along with the list — `———`, `***`, `...` —
    // survives normalising as itself, and would otherwise become a word.
    // Nothing without a letter or a digit in it is one.
    if (!key || !back || !HAS_CONTENT.test(key)) {
      skipped += 1;
      continue;
    }
    if (byKey.has(key)) {
      skipped += 1;
      continue;
    }
    byKey.set(key, { front, back });
  }

  return { byKey, skipped };
}

export async function addWords(options: {
  userId: string;
  words: readonly IncomingWord[];
  /** Which set to file them under, if any. A word needs no set to exist. */
  setId?: string | null;
  /** Where they came from — a pasted lesson's column heading, a catalog set. */
  source?: string | null;
}): Promise<AddWordsResult> {
  const { userId, setId = null, source = null } = options;
  const { byKey, skipped } = dedupe(options.words);

  if (byKey.size === 0) {
    return { added: 0, alreadyKnown: 0, linked: 0, skipped };
  }

  const prisma = getPrisma();
  const now = new Date();

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

  if (setId) {
    await prisma.wordSetItem.createMany({
      data: words.map((word) => ({ wordId: word.id, setId })),
      skipDuplicates: true,
    });
    await prisma.wordSet.update({ where: { id: setId }, data: { updatedAt: now } });
  }

  return {
    added: created.count,
    alreadyKnown: words.length - created.count,
    linked: setId ? words.length : 0,
    skipped,
  };
}
