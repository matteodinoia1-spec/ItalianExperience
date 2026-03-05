-- ============================================================================
-- ATS Pre-Implementation Verification Queries
-- ============================================================================
-- Run in Supabase SQL Editor. See portal/docs/ATS-PRE-IMPLEMENTATION-VERIFICATION.md
-- ============================================================================

-- 1. Schema: columns for ATS-relevant tables
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'candidate_job_associations',
    'candidates',
    'job_offers',
    'clients',
    'activity_logs'
  )
ORDER BY table_name, ordinal_position;

-- 2. Foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'candidate_job_associations',
    'candidates',
    'job_offers',
    'clients',
    'activity_logs'
  )
ORDER BY tc.table_name, kcu.column_name;

-- 3. Indexes on candidate_job_associations (including unique)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'candidate_job_associations';

-- 4. Application status distribution
SELECT status, COUNT(*) AS cnt
FROM candidate_job_associations
GROUP BY status
ORDER BY cnt DESC;

-- 5. Duplicate applications (candidate_id, job_offer_id)
SELECT candidate_id, job_offer_id, COUNT(*) AS cnt
FROM candidate_job_associations
GROUP BY candidate_id, job_offer_id
HAVING COUNT(*) > 1;
