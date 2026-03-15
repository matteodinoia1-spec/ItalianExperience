# Portal Role Access Matrix and Phase 1 Foundation Plan

**Purpose:** Implementation-ready plan derived from [PORTAL-ROLE-ACCESS-BLUEPRINT.md](./PORTAL-ROLE-ACCESS-BLUEPRINT.md). Defines the exact minimum for Phase 1: **admin** and **consultant** only. Candidate and recruiter are future/deferred; `staff` is legacy compatibility only. **No SQL or migrations are applied in this step—planning only.**

**Current state:** RLS uses `is_internal_staff(uid)` with roles `admin`, `recruiter`, `staff`. All internal staff have full CRUD on candidates, job_offers, clients, candidate_job_associations, job_postings; SELECT only on external_candidate_submissions and privacy_consents. No `consultant` role, no `consultant_assignments` table, no `profiles.is_active`.

---

## A. Role Access Matrix (by entity / action)

Matrix is by **entity** and **action** (read, create, update, delete, download, assign/manage).  
Phase 1 implements **admin** and **consultant** only. Candidate and recruiter are future/deferred; shown for reference.  
`—` = not applicable / deferred; ✅ = allowed; ❌ = not allowed.

| Entity / area | Action | admin | consultant | candidate (future) | recruiter (deferred) |
|---------------|--------|--------|------------|---------------------|----------------------|
| **dashboard** | read | ✅ | ✅ (scoped: assigned jobs only) | ❌ or own stats only | — |
| **candidates** | read | ✅ All | ✅ Only linked to assigned job_offers | ❌ | — |
| **candidates** | create | ✅ | ❌ | ❌ | — |
| **candidates** | update | ✅ | ❌ | ❌ | — |
| **candidates** | delete | ✅ | ❌ | ❌ | — |
| **candidate files / CV download** | read / download | ✅ | ✅ (assigned candidates only) | ❌ or own only | — |
| **job_offers** | read | ✅ All | ✅ Assigned only | ❌ | — |
| **job_offers** | create | ✅ | ❌ | ❌ | — |
| **job_offers** | update | ✅ | ❌ | ❌ | — |
| **job_offers** | delete | ✅ | ❌ | ❌ | — |
| **job_postings** | read | ✅ All | ✅ For assigned job_offers only | ❌ | — |
| **job_postings** | create | ✅ | ❌ | ❌ | — |
| **job_postings** | update | ✅ | ❌ | ❌ | — |
| **job_postings** | delete | ✅ | ❌ | ❌ | — |
| **candidate_job_associations / applications** | read | ✅ All | ✅ For assigned job_offers only | ✅ Own only | — |
| **candidate_job_associations / applications** | create | ✅ | ❌ | ❌ | — |
| **candidate_job_associations / applications** | update | ✅ | ❌ | ❌ | — |
| **candidate_job_associations / applications** | delete | ✅ | ❌ | ❌ | — |
| **clients** | read | ✅ All | ✅ For assigned job’s client only | ❌ | — |
| **clients** | create | ✅ | ❌ | ❌ | — |
| **clients** | update | ✅ | ❌ | ❌ | — |
| **clients** | delete | ✅ | ❌ | ❌ | — |
| **external_candidate_submissions** | read | ✅ All | ✅ For assigned job_offer only | ❌ | — |
| **external_candidate_submissions** | create/update/delete | (service-role only today) | ❌ | ❌ | — |
| **profile (self)** | read | ✅ | ✅ | ✅ | — |
| **profile (self)** | update | ✅ | ❌ (read-only self) | ✅ (own only) | — |
| **consultant assignment** | read (list per job) | ✅ | ❌ (sees result only) | ❌ | — |
| **consultant assignment** | assign / unassign / manage | ✅ | ❌ | ❌ | — |
| **user management** | read (list users, roles) | ✅ | ❌ | ❌ | — |
| **user management** | create/update/delete (users, roles, is_active) | ✅ | ❌ | ❌ | — |

**Summary by role:**

- **admin:** Full access; user management and consultant assignment (assign/unassign) included.
- **consultant:** Read (and download CV) only; scope = assigned job_offers and their related candidates, CJA, job_postings, clients, external_candidate_submissions. Self profile read-only. No assign/manage.
- **candidate (future):** Own profile read/edit; own applications read only; not in Phase 1.
- **recruiter (deferred):** Not part of Phase 1; add when there is a real use case.

---

## B. Phase 1 schema changes (exact minimum)

Apply in a **single Phase 1 migration** (when you implement). No SQL is emitted in this planning step.

### 1. `profiles` table

- **Add column:** `is_active`  
  - Type: `boolean`.  
  - Default: `true`.  
  - Nullable: optional (recommend `NOT NULL DEFAULT true`).  
- **Purpose:** Allow deactivating a user without deleting the profile; RLS and app logic will require `is_active = true` for non-admin access (Phase 4 will use this for user management).
- **Existing columns:** Keep `id`, `email`, `first_name`, `last_name`, `role` unchanged.

### 2. `consultant_assignments` table (new)

- **Table name:** `consultant_assignments`.
- **Columns (minimal):**
  - `id` — `uuid`, PK, default `gen_random_uuid()`.
  - `job_offer_id` — `uuid`, NOT NULL, FK → `job_offers.id` (with appropriate `ON DELETE` behavior, e.g. CASCADE or RESTRICT per product choice).
  - `consultant_id` — `uuid`, NOT NULL, FK → `profiles.id`.
  - Optional but recommended: `created_at` — `timestamptz`, default `now()`; `created_by` — `uuid`, FK → `profiles.id` (for audit).
- **Constraints:**
  - Unique constraint on `(job_offer_id, consultant_id)` — one assignment per consultant per job offer.
- **Indexes:**
  - Unique index on `(job_offer_id, consultant_id)` (can be the same as the unique constraint).
  - Index on `consultant_id` — to list job offers for a consultant (RLS and “my assigned jobs” queries).
- **Business rule:** Only users with `profiles.role = 'consultant'` should be assignable; enforce in app/API or a trigger in a later phase, not required for Phase 1 schema.

### 3. `staff` role — legacy compatibility only

- **Forward role model:** Phase 1 supports only **admin** and **consultant**. `staff` is **not** part of the planned role model.
- **Legacy compatibility:** If existing code or data still uses `staff`, keep it in the RLS role list only so existing users do not lose access (e.g. treat as same access as admin, or document as compatibility). Do not add new behavior or documentation for `staff`; do not treat it as recruiter in the plan. When migrating away, existing `staff` users can be reassigned to `admin` or a future `recruiter` role.

---

## C. Phase 1 RLS direction (exact minimum)

### 1. How roles are recognized (admin, consultant only)

- **Forward model:** `is_internal_staff(uid)` (or equivalent) should recognize **only** `admin` and `consultant` for new behavior.  
  So: `p.role = ANY (ARRAY['admin', 'consultant'])` for the forward path.  
  Effect: Admins have full access; consultants can log in and hit portal routes, with data scope restricted by separate policies (Phase 2).
- **Legacy:** If you must preserve existing users, keep `staff` (and optionally `recruiter`) in the role list for compatibility only—e.g. same access as admin so current users keep working. Document as legacy, not part of Phase 1 design.
- **Phase 1 scope:** Optionally give consultants the same data as admin in Phase 1 (no scoping yet); Phase 2 will add `is_consultant_assigned_to_job` and restrict consultants to assigned data.

### 2. How `is_active` is enforced

- **New helper (recommended):** e.g. `portal_user_can_access(uid uuid)` → true when `profiles.id = uid` and `(profiles.is_active = true OR profiles.role = 'admin')`.  
  Admins can access even when inactive (so an admin can reactivate themselves or be fixed by another admin if needed; alternatively you can require `is_active` for everyone and handle “last admin” via procedure—minimal Phase 1: allow admin when inactive).
- **Where to use:** Use this helper in RLS **in place of or in addition to** “authenticated + internal staff” where you want to enforce active status. Minimum: use it in the same policies that currently use `is_internal_staff(auth.uid())` so that inactive users (non-admin) get no rows.
- **Default for new column:** Existing rows get `is_active = true` via migration default; no backfill needed if default is set.

### 3. What stays unchanged in Phase 1

- **Policies that already use `is_internal_staff(auth.uid())`:** Use `portal_user_can_access(auth.uid())` (which enforces `is_active` and recognizes admin + consultant, and legacy roles if kept for compatibility). No split of SELECT/INSERT/UPDATE/DELETE per role yet—consultant can get same data as admin in Phase 1 if you defer scoping to Phase 2.
- **Storage policies (candidate-files, external-candidate-submissions):** Use the same helper; include `consultant` and enforce `is_active` so that inactive users cannot read/upload/delete.
- **job_postings anon policy:** Leave “Public can read published job postings” unchanged.
- **Service-role:** Unchanged; no RLS changes for service-role.

---

## D. What is intentionally NOT implemented in Phase 1

The following are **deferred** to later phases or future work:

- **Candidate portal:** No `candidate` role implementation; no self-service candidate view or own-applications view. Candidate is future only.
- **Recruiter role:** Not part of Phase 1; add when there is a real use case. No RLS or UI for recruiter.
- **Full admin user management:** No UI or API for listing users, editing roles, or bulk activate/deactivate. Schema adds `is_active` so that a later phase can implement this without another schema change.
- **Invite flows:** No invite tables, no “pending invite” or email-invite workflow.
- **Password / reset flows:** No changes to auth flows (handled by Supabase Auth); out of scope for this plan.
- **Advanced permission granularity:** No per-entity or per-action roles beyond admin and consultant. No custom permissions table.
- **Consultant data scoping in Phase 1 (optional):** If Phase 1 is “foundation only,” consultant may be given same data as admin temporarily; scoping to “assigned job offers only” is Phase 2.
- **Consultant assignment UX:** No admin UI to assign/unassign consultants to job offers; table exists so Phase 3 can implement it.
- **staff:** Not part of the forward role model. If kept in RLS for legacy compatibility, no new behavior or documentation; no “staff as recruiter” in Phase 1 plan.

---

## E. Recommended implementation order

Execute in this order to keep the change set minimal and safe.

1. **Schema (single migration)**  
   - Add `profiles.is_active` (boolean, NOT NULL, default true).  
   - Create `consultant_assignments` with `id`, `job_offer_id`, `consultant_id`, optional `created_at`/`created_by`; unique on `(job_offer_id, consultant_id)`; index on `consultant_id`.  
   - Enable RLS on `consultant_assignments` and add a policy: admin only for SELECT, INSERT, UPDATE, DELETE (Phase 3 will use this).

2. **Role helpers**  
   - `is_internal_staff(uid)` (or equivalent): recognize **admin** and **consultant** for the forward model; add legacy `staff` (and optionally `recruiter`) only if needed for existing users.  
   - Add `portal_user_can_access(uid)` requiring `is_active = true` or `role = 'admin'`.  
   - Add `is_consultant_assigned_to_job(uid, job_offer_id)` returning true if a row exists in `consultant_assignments` for that user and job. (Used in Phase 2; can be present but unused in Phase 1.)

3. **RLS**  
   - Replace or combine `is_internal_staff(auth.uid())` with `portal_user_can_access(auth.uid())` in all existing internal-staff policies so that inactive users are denied.  
   - Phase 1: admin has full access; consultant can have same data access as admin (no scoping) or Phase 2 scoping.  
   - Add RLS for `consultant_assignments`: SELECT for admin only; INSERT/UPDATE/DELETE for admin only.

4. **Storage**  
   - Update storage policies for candidate-files and external-candidate-submissions to use the new helper so that `portal_user_can_access(auth.uid())` is required and `consultant` is allowed (Phase 2 will restrict consultant to assigned candidates only for CV download).

5. **UI gating (minimal for Phase 1)**  
   - Ensure login / route guard allows users who pass `portal_user_can_access` (e.g. by fetching profile and checking `is_active` and role).  
   - Optionally hide “User management” and “Consultant assignment” from non-admins so the UI matches the matrix even before Phase 3/4.

6. **Consultant assignment UX (Phase 3)**  
   - Implement after Phase 2 (consultant scoping). Admin-only UI: list assignments per job offer, add consultant, remove assignment; backend reads/writes `consultant_assignments`.

---

## Summary

| Deliverable | Content |
|-------------|--------|
| **A. Role access matrix** | Entity/action matrix for admin and consultant (Phase 1); candidate and recruiter future/deferred. |
| **B. Phase 1 schema** | `profiles.is_active`; new `consultant_assignments` table with PK, FKs, unique on (job_offer_id, consultant_id), index on consultant_id. staff = legacy compatibility only. |
| **C. Phase 1 RLS** | Forward roles: admin + consultant only. `portal_user_can_access(uid)` for `is_active`; `is_consultant_assigned_to_job` for Phase 2; policies use new helper. |
| **D. Deferred** | Candidate portal; recruiter role; full user management UI; invite flows; password/reset; fine-grained permissions; consultant assignment UX (Phase 3); consultant scoping (Phase 2 if not in Phase 1). staff not in forward model. |
| **E. Implementation order** | 1) Schema → 2) Role helpers → 3) RLS → 4) Storage → 5) UI gating → 6) Consultant assignment UX (Phase 3). |

No SQL or migrations are applied in this step; this document is the planning reference for the implementation step.
