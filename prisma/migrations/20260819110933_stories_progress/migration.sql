-- CreateTable
CREATE TABLE "StoryProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storySlug" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryProgress_userId_completedAt_idx" ON "StoryProgress"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoryProgress_userId_storySlug_key" ON "StoryProgress"("userId", "storySlug");

-- AddForeignKey
ALTER TABLE "StoryProgress" ADD CONSTRAINT "StoryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
