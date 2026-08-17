import { STUDY_SOURCE_LANG, STUDY_TARGET_LANG } from "@/lib/languages";
import { kindOf } from "@/lib/lexicon/dataset";
import { normalizeKey } from "@/lib/lexicon/key";
import { LEXICON_VERSION } from "@/lib/lexicon/lookup";
import { getPrisma } from "@/lib/prisma";
import { runSerializable } from "@/lib/serializable-transaction";
import { reportServerMetric } from "@/lib/server-metrics";
import { Prisma } from "@/app/generated/prisma/client";

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
  const startedAt = performance.now();
  const byPair = new Map<
    string,
    IncomingTranslation & { key: string; translation: string }
  >();
  for (const item of usable) {
    const key = normalizeKey(item.text);
    const translation = item.translation.trim();
    byPair.set(`${key}\u0000${translation}`, { ...item, key, translation });
  }
  const distinct = [...byPair.values()];

  const result = await runSerializable(prisma, async (transaction) => {
    await transaction.lexeme.createMany({
      data: distinct.map((item) => ({
        lang: STUDY_SOURCE_LANG,
        key: item.key,
        text: item.text.trim(),
        kind: kindOf(item.text.trim()),
        source: item.source,
      })),
      skipDuplicates: true,
    });

    const lexemes = await transaction.lexeme.findMany({
      where: {
        lang: STUDY_SOURCE_LANG,
        key: { in: [...new Set(distinct.map((item) => item.key))] },
      },
      select: { id: true, key: true },
    });
    const lexemeByKey = new Map(lexemes.map((row) => [row.key, row.id]));
    const lexemeIds = lexemes.map((row) => row.id).sort();
    if (lexemeIds.length === 0) return { written: 0, promotionConflicts: 0 };

    // Every writer locks the affected parents in the same order. This makes
    // primary selection deterministic even when two serverless invocations
    // promote different translations for the same lexeme concurrently.
    await transaction.$queryRaw(Prisma.sql`
      SELECT "id"
      FROM "Lexeme"
      WHERE "id" IN (${Prisma.join(lexemeIds)})
      ORDER BY "id"
      FOR UPDATE
    `);

    await transaction.lexemeTranslation.createMany({
      data: distinct.flatMap((item) => {
        const lexemeId = lexemeByKey.get(item.key);
        if (!lexemeId) return [];
        return [{
          lexemeId,
          targetLang: STUDY_TARGET_LANG,
          text: item.translation,
          source: item.source,
          model: item.model ?? null,
          version: LEXICON_VERSION,
        }];
      }),
      skipDuplicates: true,
    });

    const translations = await transaction.lexemeTranslation.findMany({
      where: {
        lexemeId: { in: lexemeIds },
        targetLang: STUDY_TARGET_LANG,
        text: { in: distinct.map((item) => item.translation) },
      },
      select: { id: true, lexemeId: true, text: true, isGlobal: true },
    });
    const translationByPair = new Map(
      translations.map((row) => [
        `${row.lexemeId}\u0000${row.text}`,
        row.id,
      ]),
    );
    const translationIds = distinct.flatMap((item) => {
      const lexemeId = lexemeByKey.get(item.key);
      if (!lexemeId) return [];
      const translationId = translationByPair.get(
        `${lexemeId}\u0000${item.translation}`,
      );
      return translationId ? [translationId] : [];
    });
    if (translationIds.length === 0) {
      return { written: 0, promotionConflicts: 0 };
    }
    const initiallyGlobal = new Set(
      translations.filter((row) => row.isGlobal).map((row) => row.id),
    );
    const promotionCandidateIds = translationIds.filter(
      (translationId) => !initiallyGlobal.has(translationId),
    );

    const trustedTranslationIds = distinct.flatMap((item) => {
      if (!TRUSTED.has(item.source)) return [];
      const lexemeId = lexemeByKey.get(item.key);
      if (!lexemeId) return [];
      const translationId = translationByPair.get(
        `${lexemeId}\u0000${item.translation}`,
      );
      return translationId ? [translationId] : [];
    });

    await transaction.lexemeTranslationConfirmation.createMany({
      data: translationIds.map((translationId) => ({
        translationId,
        userId: options.userId,
      })),
      skipDuplicates: true,
    });

    if (trustedTranslationIds.length > 0) {
      await transaction.lexemeTranslation.updateMany({
        where: { id: { in: trustedTranslationIds } },
        data: { isGlobal: true },
      });
    }

    // Confirmation rows are authoritative. The cached integer is refreshed
    // from them in one statement, so retries and old counter drift cannot
    // publish a translation early or leave its displayed count stale.
    await transaction.$executeRaw(Prisma.sql`
      UPDATE "LexemeTranslation" AS translation
      SET "confirmations" = counts.value,
          "isGlobal" = translation."isGlobal"
            OR translation."source" IN ('curated', 'seed')
            OR counts.value >= ${CONFIRMATIONS_TO_PUBLISH},
          "updatedAt" = CURRENT_TIMESTAMP
      FROM (
        SELECT "translationId", COUNT(*)::integer AS value
        FROM "LexemeTranslationConfirmation"
        WHERE "translationId" IN (${Prisma.join(translationIds)})
        GROUP BY "translationId"
      ) AS counts
      WHERE translation."id" = counts."translationId"
    `);

    // Existing primaries are never displaced here. If a lexeme has none, one
    // deterministic winner is promoted for the whole batch in a single write.
    await transaction.$executeRaw(Prisma.sql`
      WITH ranked AS (
        SELECT translation."id",
               ROW_NUMBER() OVER (
                 PARTITION BY translation."lexemeId", translation."targetLang"
                 ORDER BY CASE translation."source"
                   WHEN 'curated' THEN 4
                   WHEN 'seed' THEN 3
                   WHEN 'llm' THEN 2
                   WHEN 'import' THEN 1
                   ELSE 0
                 END DESC,
                 translation."createdAt" ASC,
                 translation."id" ASC
               ) AS rank
        FROM "LexemeTranslation" AS translation
        WHERE translation."lexemeId" IN (${Prisma.join(lexemeIds)})
          AND translation."targetLang" = ${STUDY_TARGET_LANG}
          AND translation."isGlobal" = TRUE
          AND NOT EXISTS (
            SELECT 1
            FROM "LexemeTranslation" AS primary_translation
            WHERE primary_translation."lexemeId" = translation."lexemeId"
              AND primary_translation."targetLang" = translation."targetLang"
              AND primary_translation."isPrimary" = TRUE
          )
      )
      UPDATE "LexemeTranslation" AS translation
      SET "isPrimary" = TRUE,
          "updatedAt" = CURRENT_TIMESTAMP
      FROM ranked
      WHERE translation."id" = ranked."id" AND ranked.rank = 1
    `);

    const promotionConflicts = promotionCandidateIds.length === 0
      ? 0
      : Number((await transaction.$queryRaw<Array<{ value: bigint }>>(
          Prisma.sql`
            SELECT COUNT(*)::bigint AS value
            FROM "LexemeTranslation" AS candidate
            WHERE candidate."id" IN (${Prisma.join(promotionCandidateIds)})
              AND candidate."isGlobal" = TRUE
              AND candidate."isPrimary" = FALSE
              AND EXISTS (
                SELECT 1
                FROM "LexemeTranslation" AS primary_translation
                WHERE primary_translation."lexemeId" = candidate."lexemeId"
                  AND primary_translation."targetLang" = candidate."targetLang"
                  AND primary_translation."isPrimary" = TRUE
              )
          `,
        ))[0]?.value ?? 0);

    return {
      written: translationIds.length,
      promotionConflicts,
    };
  });

  reportServerMetric("lexicon.write", {
    translations: result.written,
    promotionConflicts: result.promotionConflicts,
    durationMs: Math.round(performance.now() - startedAt),
  });
  return result.written;
}
