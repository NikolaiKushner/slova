-- CreateTable
CREATE TABLE "LexemeTranslationConfirmation" (
    "translationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LexemeTranslationConfirmation_pkey" PRIMARY KEY ("translationId","userId")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "LexemeTranslationConfirmation_userId_idx" ON "LexemeTranslationConfirmation"("userId");

-- AddForeignKey
ALTER TABLE "LexemeTranslationConfirmation" ADD CONSTRAINT "LexemeTranslationConfirmation_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "LexemeTranslation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
