-- DropIndex
DROP INDEX IF EXISTS "OrganizationMember_isActive_idx";

-- AlterTable
ALTER TABLE "OrganizationMember" DROP COLUMN IF EXISTS "isActive",
DROP COLUMN IF EXISTS "archivedAt";
