-- Reissuing a verification or reset token must replace the previous token,
-- not leave two valid links after concurrent requests. Preserve the latest
-- expiry when cleaning any historical duplicates.
WITH ranked AS (
    SELECT "identifier",
           "token",
           ROW_NUMBER() OVER (
               PARTITION BY "identifier"
               ORDER BY "expires" DESC, "token" DESC
           ) AS rank
    FROM "VerificationToken"
)
DELETE FROM "VerificationToken" AS token
USING ranked
WHERE token."identifier" = ranked."identifier"
  AND token."token" = ranked."token"
  AND ranked.rank > 1;

CREATE UNIQUE INDEX "VerificationToken_identifier_key"
ON "VerificationToken"("identifier");

CREATE INDEX "VerificationToken_expires_idx"
ON "VerificationToken"("expires");

-- Existing rows did not retain their window size. Twenty-four hours is a
-- conservative one-time expiry; every new attempt writes the exact boundary.
ALTER TABLE "RateLimit"
ADD COLUMN "expiresAt" TIMESTAMP(3)
DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');

UPDATE "RateLimit"
SET "expiresAt" = "windowStart" + INTERVAL '24 hours';

ALTER TABLE "RateLimit"
ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "RateLimit_expiresAt_idx"
ON "RateLimit"("expiresAt");
