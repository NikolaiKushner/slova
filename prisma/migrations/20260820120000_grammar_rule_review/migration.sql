-- CreateTable
CREATE TABLE "GrammarRuleMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3),
    "lastMissedAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "clearedAt" TIMESTAMP(3),
    "lastExerciseId" TEXT,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarRuleMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarRuleReviewLog" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sittingId" TEXT,
    "courseSlug" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "elapsedMs" INTEGER,
    "applied" BOOLEAN NOT NULL DEFAULT true,
    "ruleVersion" INTEGER,
    "previousStage" INTEGER,
    "nextStage" INTEGER NOT NULL,
    "previousDueAt" TIMESTAMP(3),
    "nextDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarRuleReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrammarRuleMemory_userId_dueAt_idx" ON "GrammarRuleMemory"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "GrammarRuleMemory_userId_lastMissedAt_idx" ON "GrammarRuleMemory"("userId", "lastMissedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarRuleMemory_userId_courseSlug_ruleId_key" ON "GrammarRuleMemory"("userId", "courseSlug", "ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarRuleReviewLog_operationId_key" ON "GrammarRuleReviewLog"("operationId");

-- CreateIndex
CREATE INDEX "GrammarRuleReviewLog_userId_createdAt_idx" ON "GrammarRuleReviewLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GrammarRuleReviewLog_sittingId_idx" ON "GrammarRuleReviewLog"("sittingId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarRuleReviewLog_memoryId_ruleVersion_key" ON "GrammarRuleReviewLog"("memoryId", "ruleVersion");

-- AddForeignKey
ALTER TABLE "GrammarRuleMemory" ADD CONSTRAINT "GrammarRuleMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarRuleReviewLog" ADD CONSTRAINT "GrammarRuleReviewLog_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "GrammarRuleMemory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarRuleReviewLog" ADD CONSTRAINT "GrammarRuleReviewLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarRuleReviewLog" ADD CONSTRAINT "GrammarRuleReviewLog_sittingId_fkey" FOREIGN KEY ("sittingId") REFERENCES "StudySitting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every rule already missed in a lesson becomes a weak rule, due now.
--
-- Without this, Grammar Review would open empty for a learner who has been
-- missing rules for months, and the mistakes it exists to correct would only
-- be reachable by making them again. Ids are a stable hash rather than
-- cuid(), which Prisma generates in the client and SQL cannot call.
-- Repository content is deliberately not validated here: the queue skips
-- rules a course no longer declares, so an obsolete row is inert, not a bug.
INSERT INTO "GrammarRuleMemory" (
    "id",
    "userId",
    "courseSlug",
    "ruleId",
    "stage",
    "dueAt",
    "lastMissedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    'grm_' || encode(
        sha256(
            (lesson."userId" || ':' || lesson."courseSlug" || ':' || missed."ruleId")::bytea
        ),
        'hex'
    ),
    lesson."userId",
    lesson."courseSlug",
    missed."ruleId",
    0,
    CURRENT_TIMESTAMP,
    MAX(COALESCE(lesson."completedAt", CURRENT_TIMESTAMP)),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "UserLesson" lesson,
    LATERAL unnest(lesson."missedRuleIds") AS missed("ruleId")
GROUP BY lesson."userId", lesson."courseSlug", missed."ruleId"
ON CONFLICT ("userId", "courseSlug", "ruleId") DO NOTHING;
