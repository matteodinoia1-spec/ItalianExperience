-- ============================================================================
-- ATS Application Status Migration (legacy → canonical)
-- ============================================================================
-- Run in Supabase SQL Editor AFTER verifying data (see ats-verification-queries.sql).
-- Only updates the status column; preserves created_at, created_by, notes.
-- ============================================================================

-- Map legacy 'new' to 'applied'
UPDATE candidate_job_associations
SET status = 'applied'
WHERE status = 'new';

-- Map legacy 'offered' to 'offer' (if any rows exist)
UPDATE candidate_job_associations
SET status = 'offer'
WHERE status = 'offered';
