-- Migrate existing 'custom' assessments to 'custom_assessment'
-- This is a data-only migration to fix assessments that may have had type='custom' before the enum values were added
UPDATE "Assessment" SET type = 'custom_assessment' WHERE type = 'custom';
