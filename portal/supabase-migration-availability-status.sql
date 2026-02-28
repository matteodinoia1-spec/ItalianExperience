-- ============================================================================
-- Italian Experience ATS – Add availability_status to candidates
-- ============================================================================
-- Run this in Supabase SQL Editor.
-- Does NOT remove the existing status column or modify existing constraints.
-- No backfill.
-- ============================================================================

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS availability_status text DEFAULT 'available';
