-- CreateTable (Holiday model for SLA business hours calculation)
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- AlterTable (Add SLA fields to SupportTicket)
ALTER TABLE "SupportTicket" ADD COLUMN "responseSLADeadline" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN "resolutionSLADeadline" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN "responseSLAStatus" TEXT NOT NULL DEFAULT 'on_track';
ALTER TABLE "SupportTicket" ADD COLUMN "resolutionSLAStatus" TEXT NOT NULL DEFAULT 'on_track';
ALTER TABLE "SupportTicket" ADD COLUMN "slaPausedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN "slaPausedReason" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "actualResponseTime" INTEGER;
ALTER TABLE "SupportTicket" ADD COLUMN "actualResolutionTime" INTEGER;
ALTER TABLE "SupportTicket" ADD COLUMN "responseSLAMet" BOOLEAN;
ALTER TABLE "SupportTicket" ADD COLUMN "resolutionSLAMet" BOOLEAN;

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "SupportTicket_responseSLADeadline_idx" ON "SupportTicket"("responseSLADeadline");

-- CreateIndex
CREATE INDEX "SupportTicket_resolutionSLADeadline_idx" ON "SupportTicket"("resolutionSLADeadline");

-- CreateIndex
CREATE INDEX "SupportTicket_responseSLAStatus_idx" ON "SupportTicket"("responseSLAStatus");

-- CreateIndex
CREATE INDEX "SupportTicket_resolutionSLAStatus_idx" ON "SupportTicket"("resolutionSLAStatus");

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
