import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { kindOf } from "@/lib/lexicon/dataset";
import { normalizeKey } from "@/lib/lexicon/key";
import { LEXICON_VERSION } from "@/lib/lexicon/lookup";
import { getPrisma } from "@/lib/prisma";

/**
 * Putting a translation into the shared base — and deciding whether everyone
 * gets to see it.
 *
 * A model's answer is one more opinion, not a moderator. The words in the
 * prompt are whatever the person pasted, so a crafted list can skew what the
 * model writes, and that must not become everyone's answer on sight. A typed
 * translation is even more private: it may be a shorthand or a mistake.
 *
 * Seed and curated rows are the exception — they were reviewed before they
 * landed. Everything else is a candidate until a *different* person produces
 * the same text.
 */

export type TranslationSource = "curated" | "seed" | "llm" | "import";

/** Sources that stand on their own; the rest must be confirmed. */
const TRUSTED: ReadonlySet<TranslationSource> = new Set(["curated", "seed"]);

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
 * `alreadyConfirmedByUser` is the row for this person on this wording. A
 * second save from the same account must not count as a second source.
 */
export function promote(
  existing: ExistingTranslation,
  source: TranslationSource,
  alreadyConfirmedByUser = false,
): PromotionDecision {
  if (alreadyConfirmedByUser) {
    return {
      confirmations: existing?.confirmations ?? 0,
      isGlobal: existing?.isGlobal === true || TRUSTED.has(source),
    };
  }
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
  options: { userId: string },
): Promise<number> {
  const usable = incoming.filter((item) => {
    const key = normalizeKey(item.text);
    const translation = item.translation.trim();
    return (
      key &&
      !key.includes("..") &&
      translation &&
      translation.length <= 200 &&
      !translation.includes("\n") &&
      !translation.includes("\r")
    );
  });
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
      select: { id: true, confirmations: true, isGlobal: true },
    });

    const alreadyConfirmedByUser = existing
      ? Boolean(
          await prisma.lexemeTranslationConfirmation.findUnique({
            where: {
              translationId_userId: {
                translationId: existing.id,
                userId: options.userId,
              },
            },
            select: { translationId: true },
          }),
        )
      : false;

    const decision = promote(existing, item.source, alreadyConfirmedByUser);

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

    const saved = await prisma.lexemeTranslation.upsert({
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

    await prisma.lexemeTranslationConfirmation.createMany({
      data: [{ translationId: saved.id, userId: options.userId }],
      skipDuplicates: true,
    });

    written += 1;
  }

  return written;
}
