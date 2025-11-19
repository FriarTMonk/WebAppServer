-- AlterTable SupportTicket: Make resolutionSLAStatus nullable
ALTER TABLE "SupportTicket" ALTER COLUMN "resolutionSLAStatus" DROP NOT NULL;
