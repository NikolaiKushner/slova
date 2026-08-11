import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { normalizeKey } from "@/lib/lexicon/key";
import { getPrisma } from "@/lib/prisma";

/**
 * Asking the shared base for a batch of words before anyone pays for them.
 *
 * A hit costs a database round trip shared across the whole list; a miss costs
 * a call to a model. So the only number that matters here is the ratio, and
 * the only way to keep it honest is to be strict about what counts as a hit.
 */

/**
 * The generation of translations we trust. Bumping this retires everything
 * produced before it: old rows stop answering, the words get asked again as
 * they come up, and nothing has to be deleted or migrated. That is the whole
 * mechanism for undoing a bad batch.
 */
export const LEXICON_VERSION = 1;

/** Which source wins when a lexeme has more than one global translation. */
const PRECEDENCE: Record<string, number> = {
  curated: 4,
  seed: 3,
  llm: 2,
  import: 1,
};

export type LexiconHit = {
  key: string;
  translation: string;
  lexemeId: string;
  source: string;
};

export type LookupResult = {
  /** By normalised key, so the caller can match its own rows back up. */
  hits: Map<string, LexiconHit>;
  /** The words nobody has answered yet, in the spelling they arrived in. */
  misses: string[];
};

/**
 * Three things disqualify a stored translation, and each one exists for a
 * reason worth keeping in view:
 *
 * - **not global** — someone typed it and nobody has agreed yet, so it is
 *   theirs, not everyone's;
 * - **an older version** — retired by a bump, see above;
 * - **empty** — the model's way of saying it could not translate this. Counted
 *   as an answer it would be permanent, and the word would never be asked
 *   about again.
 */
export async function lookupBatch(
  texts: readonly string[],
): Promise<LookupResult> {
  const keyByText = new Map<string, string>();
  for (const text of texts) {
    const key = normalizeKey(text);
    if (key) keyByText.set(text, key);
  }

  const keys = [...new Set(keyByText.values())];
  if (keys.length === 0) return { hits: new Map(), misses: [] };

  const lexemes = await getPrisma().lexeme.findMany({
    where: { lang: STUDY_SOURCE_LANG, key: { in: keys } },
    select: {
      id: true,
      key: true,
      translations: {
        where: {
          targetLang: STUDY_TARGET_LANG,
          isGlobal: true,
          version: LEXICON_VERSION,
        },
        select: { text: true, source: true, isPrimary: true },
      },
    },
  });

  const hits = new Map<string, LexiconHit>();
  for (const lexeme of lexemes) {
    const best = pickTranslation(lexeme.translations);
    if (!best) continue;
    hits.set(lexeme.key, {
      key: lexeme.key,
      translation: best.text,
      lexemeId: lexeme.id,
      source: best.source,
    });
  }

  const misses: string[] = [];
  for (const [text, key] of keyByText) {
    if (!hits.has(key)) misses.push(text);
  }

  return { hits, misses };
}

type StoredTranslation = { text: string; source: string; isPrimary: boolean };

/**
 * The primary one if it is marked, otherwise the most trusted source. Pure, so
 * the precedence order can be checked without a database.
 */
export function pickTranslation(
  translations: readonly StoredTranslation[],
): StoredTranslation | null {
  const usable = translations.filter((t) => t.text.trim());
  if (usable.length === 0) return null;

  const primary = usable.find((t) => t.isPrimary);
  if (primary) return primary;

  return usable.reduce((best, candidate) =>
    (PRECEDENCE[candidate.source] ?? 0) > (PRECEDENCE[best.source] ?? 0)
      ? candidate
      : best,
  );
}
