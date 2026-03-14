-- ============================================================================
-- Supabase schema snapshot – public.privacy_consents
-- ============================================================================
-- Purpose:
-- - Document the CURRENT live schema for privacy consent records.
-- - Capture columns, types, nullability, defaults, and indexes as of snapshot time.
-- - Provide a reference for how privacy consents relate to candidates and
--   external submissions, even though the current portal runtime does not
--   directly query this table.
--
-- Data sources:
-- - CONFIRMED (DB): information_schema.columns / pg_indexes via Supabase tooling
--   - Tool: user-supabase.execute_sql
-- - CONFIRMED (table presence): user-supabase.list_tables
-- - UNKNOWN in portal runtime: no direct references under portal/** at snapshot time.
--
-- Column legend:
-- - [CONFIRMED_DB]: structure confirmed via information_schema.
-- - [INFERRED_RELATION]: relationship target inferred from column naming.
-- - [UNKNOWN_RUNTIME]: not currently used by portal runtime code.
-- ============================================================================

-- High-level column summary (documentation-only)
--
-- id                     uuid, PK, NOT NULL, DEFAULT gen_random_uuid()          [CONFIRMED_DB]
-- candidate_id           uuid, NULL                                             [CONFIRMED_DB, INFERRED_RELATION → candidates.id]
-- external_submission_id uuid, NULL                                             [CONFIRMED_DB, INFERRED_RELATION → external_candidate_submissions.id]
-- consent_type           text, NOT NULL, DEFAULT 'privacy_policy'               [CONFIRMED_DB]
-- consent_given          boolean, NOT NULL                                      [CONFIRMED_DB]
-- policy_version         text, NULL                                             [CONFIRMED_DB]
-- consent_text_snapshot  text, NULL                                             [CONFIRMED_DB]
-- source                 text, NOT NULL, DEFAULT 'public_form'                  [CONFIRMED_DB]
-- ip_address             text, NULL                                             [CONFIRMED_DB]
-- user_agent             text, NULL                                             [CONFIRMED_DB]
-- created_at             timestamptz, NOT NULL, DEFAULT now()                   [CONFIRMED_DB]
--
-- Index summary (from pg_indexes)
-- - privacy_consents_pkey                         UNIQUE (id)                   [CONFIRMED_DB]
-- - idx_privacy_consents_candidate_id             (candidate_id)                [CONFIRMED_DB]
-- - idx_privacy_consents_external_submission_id   (external_submission_id)      [CONFIRMED_DB]
-- - idx_privacy_consents_source                   (source)                      [CONFIRMED_DB]
-- - idx_privacy_consents_created_at               (created_at DESC)             [CONFIRMED_DB]
--
-- Runtime notes:
-- - NO current direct reads/writes from portal runtime to privacy_consents
--   were found under portal/** at audit time. Any future usage should treat
--   this snapshot as the baseline and update it as schema evolves.           [UNKNOWN_RUNTIME]
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.privacy_consents (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),    -- [CONFIRMED_DB]
  candidate_id           uuid,                                          -- [CONFIRMED_DB, INFERRED_RELATION → candidates.id]
  external_submission_id uuid,                                          -- [CONFIRMED_DB, INFERRED_RELATION → external_candidate_submissions.id]
  consent_type           text NOT NULL DEFAULT 'privacy_policy',        -- [CONFIRMED_DB]
  consent_given          boolean NOT NULL,                              -- [CONFIRMED_DB]
  policy_version         text,                                          -- [CONFIRMED_DB]
  consent_text_snapshot  text,                                          -- [CONFIRMED_DB]
  source                 text NOT NULL DEFAULT 'public_form',           -- [CONFIRMED_DB]
  ip_address             text,                                          -- [CONFIRMED_DB]
  user_agent             text,                                          -- [CONFIRMED_DB]
  created_at             timestamptz NOT NULL DEFAULT now()             -- [CONFIRMED_DB]
);

-- Indexes (idempotent definitions matching current live indexes)

CREATE UNIQUE INDEX IF NOT EXISTS privacy_consents_pkey
  ON public.privacy_consents USING btree (id);

CREATE INDEX IF NOT EXISTS idx_privacy_consents_candidate_id
  ON public.privacy_consents USING btree (candidate_id);

CREATE INDEX IF NOT EXISTS idx_privacy_consents_external_submission_id
  ON public.privacy_consents USING btree (external_submission_id);

CREATE INDEX IF NOT EXISTS idx_privacy_consents_source
  ON public.privacy_consents USING btree (source);

CREATE INDEX IF NOT EXISTS idx_privacy_consents_created_at
  ON public.privacy_consents USING btree (created_at DESC);

