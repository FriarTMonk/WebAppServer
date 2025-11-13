-- AlterTable: Add preferredTranslation to Session
ALTER TABLE "Session" ADD COLUMN "preferredTranslation" TEXT NOT NULL DEFAULT 'NIV';

-- CreateTable: BibleTranslation
CREATE TABLE "BibleTranslation" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BibleTranslation_pkey" PRIMARY KEY ("code")
);

-- CreateTable: BibleVerse
CREATE TABLE "BibleVerse" (
    "id" TEXT NOT NULL,
    "translationCode" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "BibleVerse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BibleTranslation_code_key" ON "BibleTranslation"("code");

-- CreateIndex
CREATE INDEX "BibleTranslation_isActive_idx" ON "BibleTranslation"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BibleVerse_translationCode_book_chapter_verse_key" ON "BibleVerse"("translationCode", "book", "chapter", "verse");

-- CreateIndex
CREATE INDEX "BibleVerse_translationCode_book_chapter_verse_idx" ON "BibleVerse"("translationCode", "book", "chapter", "verse");

-- CreateIndex
CREATE INDEX "BibleVerse_book_idx" ON "BibleVerse"("book");

-- AddForeignKey
ALTER TABLE "BibleVerse" ADD CONSTRAINT "BibleVerse_translationCode_fkey" FOREIGN KEY ("translationCode") REFERENCES "BibleTranslation"("code") ON DELETE CASCADE ON UPDATE CASCADE;
