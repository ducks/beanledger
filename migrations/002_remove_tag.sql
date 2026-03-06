-- Migration 002: Remove tag column from roast_groups
-- The tag abbreviations are no longer needed in the UI

ALTER TABLE roast_groups DROP COLUMN IF EXISTS tag;
