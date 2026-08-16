CREATE TABLE "TtsUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "characters" INTEGER NOT NULL DEFAULT 0,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "syntheses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TtsUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TtsUsage_userId_day_key" ON "TtsUsage"("userId", "day");
CREATE INDEX "TtsUsage_day_idx" ON "TtsUsage"("day");
