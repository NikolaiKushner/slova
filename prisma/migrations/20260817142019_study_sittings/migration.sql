-- CreateTable
CREATE TABLE "StudySitting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sourceState" TEXT NOT NULL,
    "setIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dueAtStart" INTEGER NOT NULL DEFAULT 0,
    "newAtStart" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "endedReason" TEXT,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "goods" INTEGER NOT NULL DEFAULT 0,
    "agains" INTEGER NOT NULL DEFAULT 0,
    "introduced" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "missedRuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "StudySitting_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ReviewLog" ADD COLUMN     "elapsedMs" INTEGER,
ADD COLUMN     "errors" INTEGER,
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "nextIntervalDays" DOUBLE PRECISION,
ADD COLUMN     "sittingId" TEXT,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "verdict" TEXT;

-- Backfill ReviewLog.userId from the word. Orphans cannot contribute to
-- progress; the word FK should have prevented them, but left-join anyway.
UPDATE "ReviewLog" AS r
SET "userId" = w."userId"
FROM "UserWord" AS w
WHERE r."wordId" = w."id";

DELETE FROM "ReviewLog" WHERE "userId" IS NULL;

ALTER TABLE "ReviewLog" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "StudySitting_userId_startedAt_idx" ON "StudySitting"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ReviewLog_userId_createdAt_idx" ON "ReviewLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewLog_sittingId_idx" ON "ReviewLog"("sittingId");

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_sittingId_fkey" FOREIGN KEY ("sittingId") REFERENCES "StudySitting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudySitting" ADD CONSTRAINT "StudySitting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
