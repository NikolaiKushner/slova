-- AlterTable
ALTER TABLE "ReviewLog" ADD COLUMN "prevDueAt" DATETIME;
ALTER TABLE "ReviewLog" ADD COLUMN "prevEase" REAL;
ALTER TABLE "ReviewLog" ADD COLUMN "prevIntervalDays" REAL;
ALTER TABLE "ReviewLog" ADD COLUMN "prevIntroducedAt" DATETIME;

-- CreateIndex
CREATE INDEX "ReviewLog_cardId_createdAt_idx" ON "ReviewLog"("cardId", "createdAt");
