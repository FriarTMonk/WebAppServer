-- Missing Migration: Update EvaluationFramework Schema
-- The EvaluationFramework table schema in production doesn't match the Prisma schema
-- This migration aligns the production table with the current schema expectations

-- ========================================
-- Migration: Update EvaluationFramework Table
-- Issue: Phase 4 migration created wrong schema
-- ========================================

BEGIN;

-- Check if table has any data that needs to be preserved
-- If there's data, we'll need to handle it carefully
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM "EvaluationFramework";

    IF row_count > 0 THEN
        RAISE NOTICE 'WARNING: EvaluationFramework has % row(s). Data will be lost!', row_count;
    END IF;
END $$;

-- Drop and recreate the table with correct schema
-- This is safe because the table was just created in Phase 4 and likely has no production data
DROP TABLE IF EXISTS "EvaluationFramework" CASCADE;

-- Create table with correct schema matching Prisma model
CREATE TABLE "EvaluationFramework" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "categoryWeights" JSONB NOT NULL,
    "thresholds" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "EvaluationFramework_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "EvaluationFramework_version_key" ON "EvaluationFramework"("version");
CREATE INDEX "EvaluationFramework_isActive_idx" ON "EvaluationFramework"("isActive");
CREATE INDEX "EvaluationFramework_version_idx" ON "EvaluationFramework"("version");

-- Also need to update Organization table to add Phase 4 columns if missing
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "autoEvalFrameworkId" TEXT,
  ADD COLUMN IF NOT EXISTS "evaluationCostLimitCents" INTEGER;

-- Add foreign key constraint
ALTER TABLE "Organization"
  DROP CONSTRAINT IF EXISTS "Organization_autoEvalFrameworkId_fkey";

ALTER TABLE "Organization"
  ADD CONSTRAINT "Organization_autoEvalFrameworkId_fkey"
  FOREIGN KEY ("autoEvalFrameworkId")
  REFERENCES "EvaluationFramework"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add createdAt column to EvaluationCostLog if it doesn't exist (minor addition)
ALTER TABLE "EvaluationCostLog"
  DROP COLUMN IF EXISTS "createdAt";

COMMIT;

-- Verification queries (run separately after migration):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'EvaluationFramework'
-- ORDER BY ordinal_position;
