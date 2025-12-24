-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "OrganizationMember_isActive_idx" ON "OrganizationMember"("isActive");
