-- AlterEnum
-- This migration removes the 'custom' value and adds 'custom_assessment' and 'custom_questionnaire'
ALTER TYPE "AssessmentType" ADD VALUE 'custom_assessment';
ALTER TYPE "AssessmentType" ADD VALUE 'custom_questionnaire';

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "Assessment_organizationId_idx" ON "Assessment"("organizationId");

-- CreateIndex
CREATE INDEX "Assessment_type_organizationId_idx" ON "Assessment"("type", "organizationId");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
