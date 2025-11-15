-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "topics" JSONB NOT NULL DEFAULT '[]';
