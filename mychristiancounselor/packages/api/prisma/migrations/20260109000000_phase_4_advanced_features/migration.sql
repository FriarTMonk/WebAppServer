-- Phase 4: Advanced Features Migration
-- This migration adds EvaluationFramework, EvaluationCostLog models
-- and adds autoEvalFrameworkId and evaluationCostLimitCents to Organization

-- CreateTable
CREATE TABLE "EvaluationFramework" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCostLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "evaluationFrameworkId" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "evaluationType" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationCostLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "autoEvalFrameworkId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "evaluationCostLimitCents" INTEGER;

-- CreateIndex
CREATE INDEX "EvaluationCostLog_organizationId_idx" ON "EvaluationCostLog"("organizationId");

-- CreateIndex
CREATE INDEX "EvaluationCostLog_bookId_idx" ON "EvaluationCostLog"("bookId");

-- CreateIndex
CREATE INDEX "EvaluationCostLog_evaluationFrameworkId_idx" ON "EvaluationCostLog"("evaluationFrameworkId");

-- CreateIndex
CREATE INDEX "EvaluationCostLog_createdAt_idx" ON "EvaluationCostLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_autoEvalFrameworkId_fkey" FOREIGN KEY ("autoEvalFrameworkId") REFERENCES "EvaluationFramework"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCostLog" ADD CONSTRAINT "EvaluationCostLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCostLog" ADD CONSTRAINT "EvaluationCostLog_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCostLog" ADD CONSTRAINT "EvaluationCostLog_evaluationFrameworkId_fkey" FOREIGN KEY ("evaluationFrameworkId") REFERENCES "EvaluationFramework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
