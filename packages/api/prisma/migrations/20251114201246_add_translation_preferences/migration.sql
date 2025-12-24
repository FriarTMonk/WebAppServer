-- AlterTable
ALTER TABLE "User" ADD COLUMN     "comparisonTranslations" TEXT[] DEFAULT ARRAY['ESV', 'NASB', 'NIV', 'NKJV']::TEXT[],
ADD COLUMN     "preferredTranslation" TEXT DEFAULT 'KJV';
