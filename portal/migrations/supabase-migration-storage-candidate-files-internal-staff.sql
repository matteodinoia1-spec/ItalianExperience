-- ============================================================================
-- Italian Experience ATS – Storage policy hardening: candidate-files bucket
-- ============================================================================
-- Goal:
--   Replace generic authenticated access to the candidate-files bucket with
--   internal-staff-only access, aligned with database RLS (admin, recruiter, staff).
--
-- Current state (before):
--   - SELECT: any authenticated user
--   - INSERT: any authenticated user
--   - DELETE: any authenticated user
--
-- Target state (after):
--   - SELECT / INSERT / DELETE: only when public.is_internal_staff(auth.uid())
--
-- UPDATE: Not used by the portal for this bucket (upload, signed URL, delete, move
-- use INSERT/SELECT/DELETE only). No UPDATE policy added.
-- ============================================================================

-- Drop existing broad authenticated policies for candidate-files
DROP POLICY IF EXISTS "Allow authenticated read from candidate-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to candidate-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from candidate-files" ON storage.objects;

-- SELECT: internal staff only
CREATE POLICY "candidate_files_internal_staff_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'candidate-files'
  AND auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);

-- INSERT: internal staff only
CREATE POLICY "candidate_files_internal_staff_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'candidate-files'
  AND auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);

-- DELETE: internal staff only
CREATE POLICY "candidate_files_internal_staff_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'candidate-files'
  AND auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);
