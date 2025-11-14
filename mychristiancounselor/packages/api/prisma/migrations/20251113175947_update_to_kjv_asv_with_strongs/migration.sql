-- AlterTable
ALTER TABLE "BibleVerse" ADD COLUMN     "strongs" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "preferredTranslation" SET DEFAULT 'ASV';
