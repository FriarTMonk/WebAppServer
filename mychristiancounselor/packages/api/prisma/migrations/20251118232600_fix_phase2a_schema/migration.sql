-- Fix aiDetectedPriority from String to Boolean
ALTER TABLE "SupportTicket" ALTER COLUMN "aiDetectedPriority" DROP DEFAULT;
ALTER TABLE "SupportTicket" ALTER COLUMN "aiDetectedPriority" TYPE BOOLEAN USING (
  CASE
    WHEN "aiDetectedPriority" IS NULL THEN FALSE
    WHEN "aiDetectedPriority" = 'true' OR "aiDetectedPriority" = 'TRUE' THEN TRUE
    ELSE FALSE
  END
);
ALTER TABLE "SupportTicket" ALTER COLUMN "aiDetectedPriority" SET DEFAULT FALSE;
ALTER TABLE "SupportTicket" ALTER COLUMN "aiDetectedPriority" SET NOT NULL;

-- Add missing fields to TicketSimilarity
ALTER TABLE "TicketSimilarity" RENAME COLUMN "targetTicketId" TO "similarTicketId";
ALTER TABLE "TicketSimilarity" RENAME COLUMN "computedAt" TO "analyzedAt";
ALTER TABLE "TicketSimilarity" ADD COLUMN "matchType" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "TicketSimilarity" ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '7 days';

-- Drop old indexes and constraints on TicketSimilarity
DROP INDEX IF EXISTS "TicketSimilarity_sourceTicketId_targetTicketId_key";
DROP INDEX IF EXISTS "TicketSimilarity_sourceTicketId_similarityScore_idx";
DROP INDEX IF EXISTS "TicketSimilarity_targetTicketId_similarityScore_idx";

-- Recreate constraints and indexes with new field names
CREATE UNIQUE INDEX "TicketSimilarity_sourceTicketId_similarTicketId_matchType_key" ON "TicketSimilarity"("sourceTicketId", "similarTicketId", "matchType");
CREATE INDEX "TicketSimilarity_sourceTicketId_matchType_expiresAt_idx" ON "TicketSimilarity"("sourceTicketId", "matchType", "expiresAt");
CREATE INDEX "TicketSimilarity_expiresAt_idx" ON "TicketSimilarity"("expiresAt");

-- Update foreign key constraints for renamed column
ALTER TABLE "TicketSimilarity" DROP CONSTRAINT IF EXISTS "TicketSimilarity_targetTicketId_fkey";
ALTER TABLE "TicketSimilarity" ADD CONSTRAINT "TicketSimilarity_similarTicketId_fkey" FOREIGN KEY ("similarTicketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
