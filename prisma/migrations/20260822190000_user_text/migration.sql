-- CreateTable
CREATE TABLE "UserText" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "glosses" JSONB NOT NULL DEFAULT '{}',
    "wordCount" INTEGER NOT NULL,
    "charCount" INTEGER NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserText_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserText_userId_updatedAt_idx" ON "UserText"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "UserText" ADD CONSTRAINT "UserText_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
