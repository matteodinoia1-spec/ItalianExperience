-- ============================================================================
-- Italian Experience ATS – Minimal RLS hardening for internal portal
-- ============================================================================
-- Goal for this migration:
-- - Remove dangerous broad `authenticated` policies (`USING true / WITH CHECK true`)
--   on core portal tables.
-- - Introduce a small helper-based internal access model.
-- - Preserve full functionality for the current internal admin user.
-- - Leave anon public job_postings read and service-role behavior unchanged.
-- ============================================================================

-- 1) Helper function: internal staff check based on profiles.role
--    This is intentionally minimal and only recognizes current internal roles.

CREATE OR REPLACE FUNCTION public.is_internal_staff(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND p.role = ANY (
        ARRAY[
          'admin'::text,
          'recruiter'::text,
          'staff'::text
        ]
      )
  );
$$;


-- ============================================================================
-- 2) candidates – restrict from "any authenticated" to internal staff only
-- ============================================================================

DROP POLICY IF EXISTS "candidates_all" ON public.candidates;
DROP POLICY IF EXISTS "candidates_full_access_authenticated" ON public.candidates;

CREATE POLICY "candidates_internal_staff_all"
ON public.candidates
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);


-- ============================================================================
-- 3) clients – restrict from "any authenticated" to internal staff only
-- ============================================================================

DROP POLICY IF EXISTS "clients_all" ON public.clients;
DROP POLICY IF EXISTS "clients_full_access_authenticated" ON public.clients;

CREATE POLICY "clients_internal_staff_all"
ON public.clients
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);


-- ============================================================================
-- 4) job_offers – restrict from "any authenticated" to internal staff only
-- ============================================================================

DROP POLICY IF EXISTS "job_offers_all" ON public.job_offers;
DROP POLICY IF EXISTS "job_offers_full_access_authenticated" ON public.job_offers;

CREATE POLICY "job_offers_internal_staff_all"
ON public.job_offers
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);


-- ============================================================================
-- 5) candidate_job_associations – restrict from "any authenticated" to staff
-- ============================================================================

DROP POLICY IF EXISTS "associations_all" ON public.candidate_job_associations;
DROP POLICY IF EXISTS "associations_full_access_authenticated" ON public.candidate_job_associations;

CREATE POLICY "associations_internal_staff_all"
ON public.candidate_job_associations
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);


-- ============================================================================
-- 6) external_candidate_submissions – narrow authenticated read to staff only
--     (write paths remain service-role / backend only, as today).
-- ============================================================================

DROP POLICY IF EXISTS "external_submissions_select_authenticated"
  ON public.external_candidate_submissions;

CREATE POLICY "external_submissions_select_internal_staff"
ON public.external_candidate_submissions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);


-- ============================================================================
-- 7) job_postings – authenticated internal policies only
--     - Keep anon public read on published postings unchanged.
--     - Narrow authenticated read/write to internal staff.
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated can insert job_postings" ON public.job_postings;
DROP POLICY IF EXISTS "Authenticated can read job_postings" ON public.job_postings;
DROP POLICY IF EXISTS "Authenticated can update job_postings" ON public.job_postings;

CREATE POLICY "job_postings_internal_staff_select"
ON public.job_postings
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);

CREATE POLICY "job_postings_internal_staff_insert"
ON public.job_postings
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);

CREATE POLICY "job_postings_internal_staff_update"
ON public.job_postings
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);

-- NOTE: The existing anon policy
--   "Public can read published job postings"
-- is intentionally left untouched.


-- ============================================================================
-- 8) privacy_consents – narrow authenticated read to internal staff
--     (write remains service-role / backend only).
-- ============================================================================

DROP POLICY IF EXISTS "privacy_consents_select_authenticated"
  ON public.privacy_consents;

CREATE POLICY "privacy_consents_select_internal_staff"
ON public.privacy_consents
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND public.is_internal_staff(auth.uid())
);


-- ============================================================================
-- End of migration
-- ============================================================================

