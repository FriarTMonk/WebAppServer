-- CreateEnum for SLA status tracking
CREATE TYPE "SLAStatus" AS ENUM ('on_track', 'approaching', 'critical', 'breached');

-- AlterTable Holiday: Make createdById nullable and add onDelete: SetNull
ALTER TABLE "Holiday" ALTER COLUMN "createdById" DROP NOT NULL;

-- AlterTable SupportTicket: Change responseSLAStatus and resolutionSLAStatus to use SLAStatus enum
-- First, convert existing string values to enum
ALTER TABLE "SupportTicket"
  ALTER COLUMN "responseSLAStatus" TYPE "SLAStatus" USING "responseSLAStatus"::"SLAStatus",
  ALTER COLUMN "resolutionSLAStatus" TYPE "SLAStatus" USING "resolutionSLAStatus"::"SLAStatus";
