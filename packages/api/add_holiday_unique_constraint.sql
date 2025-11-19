-- Add unique constraint to Holiday table for name and date
-- This ensures idempotent holiday seeding
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_name_date_key" UNIQUE ("name", "date");
