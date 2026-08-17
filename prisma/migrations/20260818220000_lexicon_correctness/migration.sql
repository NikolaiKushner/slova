-- Confirmation rows become authoritative. Preserve legacy counts by giving
-- historical confirmations stable synthetic identities where necessary.
INSERT INTO "LexemeTranslationConfirmation" (
    "translationId",
    "userId",
    "createdAt"
)
SELECT translation."id",
       '__legacy_lexicon_confirmation_' || missing.sequence,
       translation."createdAt"
FROM "LexemeTranslation" AS translation
CROSS JOIN LATERAL generate_series(
    1,
    GREATEST(
        translation."confirmations" - (
            SELECT COUNT(*)::integer
            FROM "LexemeTranslationConfirmation" AS confirmation
            WHERE confirmation."translationId" = translation."id"
        ),
        0
    )
) AS missing(sequence)
ON CONFLICT DO NOTHING;

UPDATE "LexemeTranslation" AS translation
SET "confirmations" = confirmations.value,
    "updatedAt" = CURRENT_TIMESTAMP
FROM (
    SELECT translation."id",
           COUNT(confirmation."translationId")::integer AS value
    FROM "LexemeTranslation" AS translation
    LEFT JOIN "LexemeTranslationConfirmation" AS confirmation
      ON confirmation."translationId" = translation."id"
    GROUP BY translation."id"
) AS confirmations
WHERE translation."id" = confirmations."id"
  AND translation."confirmations" <> confirmations.value;

-- Repair any historical duplicate primary flags deterministically before the
-- database starts enforcing the invariant.
WITH ranked AS (
    SELECT "id",
           ROW_NUMBER() OVER (
               PARTITION BY "lexemeId", "targetLang"
               ORDER BY CASE "source"
                   WHEN 'curated' THEN 4
                   WHEN 'seed' THEN 3
                   WHEN 'llm' THEN 2
                   WHEN 'import' THEN 1
                   ELSE 0
               END DESC,
               "createdAt" ASC,
               "id" ASC
           ) AS rank
    FROM "LexemeTranslation"
    WHERE "isPrimary" = TRUE
)
UPDATE "LexemeTranslation" AS translation
SET "isPrimary" = FALSE,
    "updatedAt" = CURRENT_TIMESTAMP
FROM ranked
WHERE translation."id" = ranked."id" AND ranked.rank > 1;

CREATE UNIQUE INDEX "LexemeTranslation_one_primary_per_language_key"
ON "LexemeTranslation"("lexemeId", "targetLang")
WHERE "isPrimary" = TRUE;
