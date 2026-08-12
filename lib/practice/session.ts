import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { normalizeKey } from "@/lib/lexicon/key";
import { LEXICON_VERSION } from "@/lib/lexicon/lookup";
import { SESSION_SIZE } from "@/lib/practice/brainstorm";
import type { PracticeWord } from "@/lib/practice/question";
import { getPrisma } from "@/lib/prisma";

/**
 * Choosing what to practise, and what to put beside it as wrong answers.
 *
 * Two different jobs in one query pass, because they need each other. The
 * words are the point; the pool is what makes a question hard enough to be
 * worth answering. A dictionary of twelve words can only produce three
 * plausible wrong options, which is why the pool is topped up from the shared
 * base — the learner has never seen those words, but a distractor does not
 * need to be familiar, only confusable.
 */

/** Words in one run of a single-format training. Long enough to be practice. */
export const TRAINING_SIZE = 20;

/** Distractors are drawn from here; more is better, past a point it is noise. */
const POOL_SIZE = 80;

export type PracticeSession = {
  words: PracticeWord[];
  pool: PracticeWord[];
};

export async function buildPracticeSession(
  userId: string,
  options: { setId?: string; brainstorm?: boolean } = {},
): Promise<PracticeSession> {
  const prisma = getPrisma();
  const where = {
    userId,
    ...(options.setId ? { sets: { some: { setId: options.setId } } } : {}),
  };

  const limit = options.brainstorm ? SESSION_SIZE : TRAINING_SIZE;

  // Brainstorm exists for words that have never been studied; every other
  // training is practice, so it takes what is due first and then whatever is
  // least settled.
  const words = options.brainstorm
    ? await prisma.userWord.findMany({
        where: { ...where, introducedAt: null },
        orderBy: { createdAt: "asc" },
        take: limit,
        select: { id: true, front: true, back: true },
      })
    : await prisma.userWord.findMany({
        where,
        orderBy: [{ dueAt: "asc" }, { intervalDays: "asc" }],
        take: limit,
        select: { id: true, front: true, back: true },
      });

  const pool = await buildPool(userId);
  return { words: await withAudio(words), pool };
}

/**
 * Attaches the shared recording to each word.
 *
 * Joined by normalised key rather than by `lexemeId`, because that link is
 * soft and may be null on words added before the lexicon existed. The key is
 * the thing both sides agree on — it is what the whole shared base is indexed
 * by.
 */
async function withAudio(words: PracticeWord[]): Promise<PracticeWord[]> {
  if (words.length === 0) return words;

  const keys = words.map((word) => normalizeKey(word.front)).filter(Boolean);
  if (keys.length === 0) return words;

  const lexemes = await getPrisma().lexeme.findMany({
    where: { lang: STUDY_SOURCE_LANG, key: { in: keys }, audioUrl: { not: null } },
    select: { key: true, audioUrl: true },
  });
  const byKey = new Map(lexemes.map((lexeme) => [lexeme.key, lexeme.audioUrl]));

  return words.map((word) => ({
    ...word,
    audioUrl: byKey.get(normalizeKey(word.front)) ?? null,
  }));
}

/**
 * The user's own words first — a distractor they have met is a harder and
 * fairer test than one they have not — then the shared base to make up the
 * numbers.
 */
async function buildPool(userId: string): Promise<PracticeWord[]> {
  const prisma = getPrisma();

  const own = await prisma.userWord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: POOL_SIZE,
    select: { id: true, front: true, back: true },
  });

  const pool = [...own];
  const seen = new Set(own.map((word) => word.front.toLowerCase()));

  if (pool.length >= POOL_SIZE) return pool;

  const lexemes = await prisma.lexeme.findMany({
    where: {
      lang: STUDY_SOURCE_LANG,
      translations: {
        some: {
          targetLang: STUDY_TARGET_LANG,
          isGlobal: true,
          version: LEXICON_VERSION,
        },
      },
    },
    take: POOL_SIZE,
    select: {
      id: true,
      text: true,
      translations: {
        where: {
          targetLang: STUDY_TARGET_LANG,
          isGlobal: true,
          version: LEXICON_VERSION,
        },
        orderBy: { isPrimary: "desc" },
        take: 1,
        select: { text: true },
      },
    },
  });

  for (const lexeme of lexemes) {
    if (pool.length >= POOL_SIZE) break;
    const translation = lexeme.translations[0]?.text;
    if (!translation || seen.has(lexeme.text.toLowerCase())) continue;
    seen.add(lexeme.text.toLowerCase());
    // Prefixed so an id from the shared base can never be mistaken for one of
    // the user's words if it ever reaches a write path.
    pool.push({ id: `lex:${lexeme.id}`, front: lexeme.text, back: translation });
  }

  return pool;
}
