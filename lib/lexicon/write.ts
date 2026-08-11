import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { kindOf } from "@/lib/lexicon/dataset";
import { normalizeKey } from "@/lib/lexicon/key";
import { LEXICON_VERSION } from "@/lib/lexicon/lookup";
import { getPrisma } from "@/lib/prisma";

/**
 * Putting a translation into the shared base — and deciding whether everyone
 * gets to see it.
 *
 * The asymmetry here is the point. A model's answer is one anonymous opinion
 * produced by the same instructions every time, so it can be trusted alone. A
 * translation somebody typed into their own import table is *their* answer: it
 * may be a shorthand, a mistake, or right only for their lesson. Publishing it
 * to everyone on sight would mean one person's typo becoming the app's answer
 * for that word, permanently, with no moderation to catch it.
 *
 * So a typed translation is stored as a candidate and waits. When a second,
 * independent source produces the same text — another person, or the model —
 * it becomes everyone's.
 */

export type TranslationSource = "curated" | "seed" | "llm" | "import";

/** Sources that stand on their own; the rest must be confirmed. */
const TRUSTED: ReadonlySet<TranslationSource> = new Set([
  "curated",
  "seed",
  "llm",
]);

/** Agreements needed before an untrusted translation goes global. */
export const CONFIRMATIONS_TO_PUBLISH = 2;

export type ExistingTranslation = {
  confirmations: number;
  isGlobal: boolean;
} | null;

export type PromotionDecision = {
  confirmations: number;
  isGlobal: boolean;
};

/**
 * Pure, because this is the rule that decides what strangers see.
 *
 * Known limitation, and it is a deliberate simplification rather than an
 * oversight: "independent" is not verified. Nothing records *who* confirmed a
 * translation, so the same person importing the same word twice counts twice.
 * With one account that is the difference between "my edits stay mine" and
 * "my edits stay mine unless I import twice"; when there are enough users for
 * it to matter, the fix is a column and this function keeps its shape.
 */
export function promote(
  existing: ExistingTranslation,
  source: TranslationSource,
): PromotionDecision {
  const confirmations = (existing?.confirmations ?? 0) + 1;
  return {
    confirmations,
    isGlobal:
      existing?.isGlobal === true ||
      TRUSTED.has(source) ||
      confirmations >= CONFIRMATIONS_TO_PUBLISH,
  };
}

export type IncomingTranslation = {
  text: string;
  translation: string;
  source: TranslationSource;
  /** Which model produced it, when the source is a model. */
  model?: string | null;
};

/**
 * Write a batch into the base. Empty translations are dropped before they get
 * here — an empty answer stored as an answer is permanent, and stops the word
 * from ever being asked about again.
 */
export async function recordTranslations(
  incoming: readonly IncomingTranslation[],
): Promise<number> {
  const usable = incoming.filter(
    (item) => normalizeKey(item.text) && item.translation.trim(),
  );
  if (usable.length === 0) return 0;

  const prisma = getPrisma();
  let written = 0;

  for (const item of usable) {
    const key = normalizeKey(item.text);
    const translation = item.translation.trim();

    const lexeme = await prisma.lexeme.upsert({
      where: { lang_key: { lang: STUDY_SOURCE_LANG, key } },
      create: {
        lang: STUDY_SOURCE_LANG,
        key,
        text: item.text.trim(),
        kind: kindOf(item.text.trim()),
        source: item.source,
      },
      // The lexeme itself is never rewritten: its source records who first
      // knew this word, and a later contributor does not take that over.
      update: {},
      select: { id: true },
    });

    const existing = await prisma.lexemeTranslation.findUnique({
      where: {
        lexemeId_targetLang_text: {
          lexemeId: lexeme.id,
          targetLang: STUDY_TARGET_LANG,
          text: translation,
        },
      },
      select: { confirmations: true, isGlobal: true },
    });

    const decision = promote(existing, item.source);

    // Exactly one translation answers for a word. If something already does,
    // this one joins the base without displacing it — the seeded answer stays
    // the answer until a curated one replaces it deliberately.
    const hasPrimary = await prisma.lexemeTranslation.findFirst({
      where: {
        lexemeId: lexeme.id,
        targetLang: STUDY_TARGET_LANG,
        isPrimary: true,
      },
      select: { id: true },
    });

    await prisma.lexemeTranslation.upsert({
      where: {
        lexemeId_targetLang_text: {
          lexemeId: lexeme.id,
          targetLang: STUDY_TARGET_LANG,
          text: translation,
        },
      },
      create: {
        lexemeId: lexeme.id,
        targetLang: STUDY_TARGET_LANG,
        text: translation,
        source: item.source,
        model: item.model ?? null,
        version: LEXICON_VERSION,
        confirmations: decision.confirmations,
        isGlobal: decision.isGlobal,
        isPrimary: decision.isGlobal && !hasPrimary,
      },
      update: {
        confirmations: decision.confirmations,
        isGlobal: decision.isGlobal,
      },
      select: { id: true },
    });

    written += 1;
  }

  return written;
}
