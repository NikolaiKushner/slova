-- AlterTable
ALTER TABLE "Card" ADD COLUMN "introducedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "dailyNewLimit" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash") SELECT "createdAt", "email", "id", "name", "passwordHash" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Card_introducedAt_idx" ON "Card"("introducedAt");

-- Backfill: a card that was already rated has been seen, so it must not fall
-- back into the new-word queue. Use its first review as the moment it entered.
UPDATE "Card"
SET "introducedAt" = (
    SELECT MIN("ReviewLog"."createdAt")
    FROM "ReviewLog"
    WHERE "ReviewLog"."cardId" = "Card"."id"
)
WHERE EXISTS (
    SELECT 1 FROM "ReviewLog" WHERE "ReviewLog"."cardId" = "Card"."id"
);
