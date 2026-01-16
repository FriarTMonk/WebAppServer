-- Missing Migration: Update EvaluationCostLog Schema
-- The EvaluationCostLog table schema in production doesn't match the Prisma schema
-- This migration aligns the production table with the current schema expectations

-- ========================================
-- Migration: Update EvaluationCostLog Table
-- Commit: 8aa01f3 (EvaluationCostLog model changes)
-- ========================================

BEGIN;

-- Step 1: Add new columns with temporary names to avoid conflicts
ALTER TABLE "EvaluationCostLog"
  ADD COLUMN IF NOT EXISTS "frameworkVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "inputTokens" INTEGER,
  ADD COLUMN IF NOT EXISTS "outputTokens" INTEGER,
  ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "evaluatedAt" TIMESTAMP(3);

-- Step 2: Migrate data from old columns to new columns
-- Convert costCents to totalCost (cents to dollars)
UPDATE "EvaluationCostLog"
SET
  "totalCost" = COALESCE("costCents", 0) / 100.0,
  "inputTokens" = COALESCE("tokenCount", 0),
  "outputTokens" = 0, -- No data to migrate, set to 0
  "frameworkVersion" = 'v1', -- Default version
  "evaluatedAt" = "createdAt"
WHERE "totalCost" IS NULL;

-- Step 3: Set NOT NULL constraints on new columns
ALTER TABLE "EvaluationCostLog"
  ALTER COLUMN "frameworkVersion" SET NOT NULL,
  ALTER COLUMN "inputTokens" SET NOT NULL,
  ALTER COLUMN "outputTokens" SET NOT NULL,
  ALTER COLUMN "totalCost" SET NOT NULL,
  ALTER COLUMN "evaluatedAt" SET NOT NULL,
  ALTER COLUMN "evaluatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Step 4: Drop old columns that are no longer needed
ALTER TABLE "EvaluationCostLog"
  DROP COLUMN IF EXISTS "costCents",
  DROP COLUMN IF EXISTS "tokenCount",
  DROP COLUMN IF EXISTS "evaluationType",
  DROP COLUMN IF EXISTS "organizationId",
  DROP COLUMN IF EXISTS "evaluationFrameworkId";

-- Step 5: Drop old indexes
DROP INDEX IF EXISTS "EvaluationCostLog_organizationId_idx";
DROP INDEX IF EXISTS "EvaluationCostLog_evaluationFrameworkId_idx";
DROP INDEX IF EXISTS "EvaluationCostLog_createdAt_idx";

-- Step 6: Create new indexes to match schema
CREATE INDEX IF NOT EXISTS "EvaluationCostLog_evaluatedAt_idx" ON "EvaluationCostLog"("evaluatedAt");
CREATE INDEX IF NOT EXISTS "EvaluationCostLog_frameworkVersion_idx" ON "EvaluationCostLog"("frameworkVersion");

-- Step 7: Drop old foreign key constraints
ALTER TABLE "EvaluationCostLog"
  DROP CONSTRAINT IF EXISTS "EvaluationCostLog_organizationId_fkey",
  DROP CONSTRAINT IF EXISTS "EvaluationCostLog_evaluationFrameworkId_fkey";

COMMIT;

-- Verification queries (run separately after migration):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'EvaluationCostLog'
-- ORDER BY ordinal_position;
