-- AlterTable Holiday: Make createdById nullable and add onDelete: SetNull
ALTER TABLE "Holiday" ALTER COLUMN "createdById" DROP NOT NULL;
