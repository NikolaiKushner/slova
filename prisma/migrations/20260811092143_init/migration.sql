-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "dailyNewLimit" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "note" TEXT,
    "example" TEXT,
    "source" TEXT,
    "lexemeId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "introducedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL DEFAULT 'en',
    "targetLang" TEXT NOT NULL DEFAULT 'ru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WordSetItem" (
    "wordId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WordSetItem_pkey" PRIMARY KEY ("wordId","setId")
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prevIntervalDays" DOUBLE PRECISION,
    "prevEase" DOUBLE PRECISION,
    "prevDueAt" TIMESTAMP(3),
    "prevIntroducedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lexeme" (
    "id" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'word',
    "source" TEXT NOT NULL,
    "transcription" TEXT,
    "partOfSpeech" TEXT,
    "imageUrl" TEXT,
    "imageSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lexeme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LexemeTranslation" (
    "id" TEXT NOT NULL,
    "lexemeId" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LexemeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "UserWord_userId_dueAt_idx" ON "UserWord"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "UserWord_userId_introducedAt_idx" ON "UserWord"("userId", "introducedAt");

-- CreateIndex
CREATE INDEX "UserWord_lexemeId_idx" ON "UserWord"("lexemeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserWord_userId_key_key" ON "UserWord"("userId", "key");

-- CreateIndex
CREATE INDEX "WordSet_userId_idx" ON "WordSet"("userId");

-- CreateIndex
CREATE INDEX "WordSetItem_setId_idx" ON "WordSetItem"("setId");

-- CreateIndex
CREATE INDEX "ReviewLog_wordId_idx" ON "ReviewLog"("wordId");

-- CreateIndex
CREATE INDEX "ReviewLog_wordId_createdAt_idx" ON "ReviewLog"("wordId", "createdAt");

-- CreateIndex
CREATE INDEX "Lexeme_source_idx" ON "Lexeme"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Lexeme_lang_key_key" ON "Lexeme"("lang", "key");

-- CreateIndex
CREATE INDEX "LexemeTranslation_lexemeId_targetLang_isGlobal_isPrimary_idx" ON "LexemeTranslation"("lexemeId", "targetLang", "isGlobal", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "LexemeTranslation_lexemeId_targetLang_text_key" ON "LexemeTranslation"("lexemeId", "targetLang", "text");

-- AddForeignKey
ALTER TABLE "UserWord" ADD CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordSet" ADD CONSTRAINT "WordSet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordSetItem" ADD CONSTRAINT "WordSetItem_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "UserWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WordSetItem" ADD CONSTRAINT "WordSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "WordSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "UserWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LexemeTranslation" ADD CONSTRAINT "LexemeTranslation_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
