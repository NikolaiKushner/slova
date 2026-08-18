-- Review state uses optimistic versions in addition to serializable
-- transactions. Existing rows begin at version zero and advance on their next
-- learning mutation.
ALTER TABLE "UserWord"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

-- Existing review history predates client operation ids, so the column stays
-- nullable. PostgreSQL permits multiple NULL values in a unique index while
-- still rejecting duplicate ids on every new write.
ALTER TABLE "ReviewLog"
ADD COLUMN "operationId" TEXT,
ADD COLUMN "wordVersion" INTEGER;

CREATE UNIQUE INDEX "ReviewLog_operationId_key"
ON "ReviewLog"("operationId");

CREATE UNIQUE INDEX "ReviewLog_wordId_wordVersion_key"
ON "ReviewLog"("wordId", "wordVersion");

-- Lesson aggregates alone cannot distinguish a retry from a new attempt.
CREATE TABLE "LessonAttempt" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseSlug" TEXT NOT NULL,
    "lessonSlug" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "missedRuleIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonAttempt_operationId_key"
ON "LessonAttempt"("operationId");

CREATE INDEX "LessonAttempt_userId_courseSlug_lessonSlug_idx"
ON "LessonAttempt"("userId", "courseSlug", "lessonSlug");

ALTER TABLE "LessonAttempt"
ADD CONSTRAINT "LessonAttempt_userId_courseSlug_lessonSlug_fkey"
FOREIGN KEY ("userId", "courseSlug", "lessonSlug")
REFERENCES "UserLesson"("userId", "courseSlug", "lessonSlug")
ON DELETE CASCADE ON UPDATE CASCADE;
