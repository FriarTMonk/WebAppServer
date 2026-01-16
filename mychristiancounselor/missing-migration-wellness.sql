-- Missing Migrations for Production Database
-- These changes were made to the schema but never migrated to production
-- Run these SQL statements on the production PostgreSQL database

-- ========================================
-- Migration 1: Drop allowedVisibilityTiers from Organization
-- Commit: 8bb2309 (Jan 9, 2026)
-- ========================================

-- Drop the column if it exists (safe to run even if already dropped)
ALTER TABLE "Organization" DROP COLUMN IF EXISTS "allowedVisibilityTiers";

-- ========================================
-- Migration 2: Add WellnessEntry Table
-- Commit: 123ea8f (wellness tracking feature)
-- ========================================

-- CreateTable
CREATE TABLE "WellnessEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "moodRating" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "exerciseMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WellnessEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WellnessEntry_userId_date_key" ON "WellnessEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "WellnessEntry_userId_idx" ON "WellnessEntry"("userId");

-- CreateIndex
CREATE INDEX "WellnessEntry_date_idx" ON "WellnessEntry"("date");

-- CreateIndex
CREATE INDEX "WellnessEntry_userId_date_idx" ON "WellnessEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "WellnessEntry" ADD CONSTRAINT "WellnessEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
