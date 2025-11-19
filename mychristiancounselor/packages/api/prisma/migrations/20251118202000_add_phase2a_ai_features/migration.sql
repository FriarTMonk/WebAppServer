-- AlterTable: Add Phase 2A AI features to SupportTicket
ALTER TABLE "SupportTicket" ADD COLUMN "resolvedById" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "resolution" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN "aiDetectedPriority" TEXT;

-- CreateTable: TicketSimilarity for AI-based ticket similarity scoring
CREATE TABLE "TicketSimilarity" (
    "id" TEXT NOT NULL,
    "sourceTicketId" TEXT NOT NULL,
    "targetTicketId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketSimilarity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketSimilarity_sourceTicketId_targetTicketId_key" ON "TicketSimilarity"("sourceTicketId", "targetTicketId");

-- CreateIndex
CREATE INDEX "TicketSimilarity_sourceTicketId_similarityScore_idx" ON "TicketSimilarity"("sourceTicketId", "similarityScore");

-- CreateIndex
CREATE INDEX "TicketSimilarity_targetTicketId_similarityScore_idx" ON "TicketSimilarity"("targetTicketId", "similarityScore");

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSimilarity" ADD CONSTRAINT "TicketSimilarity_sourceTicketId_fkey" FOREIGN KEY ("sourceTicketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSimilarity" ADD CONSTRAINT "TicketSimilarity_targetTicketId_fkey" FOREIGN KEY ("targetTicketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
