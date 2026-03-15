-- ============================================================================
-- Italian Experience ATS – Storage policy hardening: external-candidate-submissions bucket
-- ============================================================================
-- Goal:
--   Replace generic authenticated SELECT on external-candidate-submissions with
--   internal-staff-only SELECT, aligned with RLS (admin, recruiter, staff).
--
-- Current state (before):
--   - SELECT: any authenticated user (policy: external_submission_files_select_authenticated)
--
-- Target state (after):
--   - SELECT: only when public.is_internal_staff(auth.uid())
--
-- Scope: SELECT only. Do not add INSERT/DELETE/UPDATE for authenticated users.
-- Upload flow: unchanged (signed URLs / edge functions with service role).
-- ============================================================================

-- Drop existing broad authenticated SELECT policy
DROP POLICY IF EXISTS "external_submission_files_select_authenticated" ON storage.objects;

-- SELECT: internal staff only
CREATE POLICY "external_candidate_submissions_internal_staff_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'external-candidate-submissions'
  AND auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);
