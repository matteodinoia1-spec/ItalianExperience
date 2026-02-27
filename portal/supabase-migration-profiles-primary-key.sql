-- ============================================================================
-- Italian Experience ATS – Ensure profiles.id is primary key
-- ============================================================================
-- Run this in the Supabase SQL editor only if your \"profiles\" table does NOT
-- already have a primary key on column \"id\".
-- This guarantees one profile row per authenticated user.
-- ============================================================================

ALTER TABLE profiles
ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

