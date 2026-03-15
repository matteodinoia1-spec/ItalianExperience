# Portal Role + Access Management Blueprint

**Purpose:** Design the role and access model for the recruitment portal before implementing new roles and consultant assignments. Planning only—no SQL or migrations in this step.

**Current state (brief):** Portal uses `profiles.role` with `is_internal_staff(uid)` recognizing `admin`, `recruiter`, `staff`. All internal staff currently have full CRUD on candidates, job_offers, clients, candidate_job_associations, job_postings, and read on external_candidate_submissions / privacy_consents. No consultant role or assignment table exists.

---

## A. Recommended roles

**Roles needed now:**

| Role        | Description |
|------------|-------------|
| **admin**  | Full portal access; manages users, roles, and consultant assignments. |
| **consultant** | Read-only access limited to assigned job offers and their associated candidates; can download generated CVs. |

**Future / deferred (not part of Phase 1):**

| Role        | Description |
|------------|-------------|
| **candidate** | *(Future.)* Self-service view of own profile and applications; no access to other candidates or job-offer management. |
| **recruiter** | *(Deferred.)* Full operational access: candidates, job offers, clients, applications, external submissions. Cannot manage users or consultant assignments. Revisit when there is a real use case. |

**Legacy compatibility:** The existing `staff` role in the database/RLS is **not** part of the forward role model. If it still exists in code or data, treat it only for legacy compatibility (e.g. same access as admin for now, or explicitly mapped in a compatibility layer); do not document or plan new behavior for `staff`.

---

## B. Role access matrix

**Current implementation (Phase 1):** admin, consultant only. Candidate and recruiter are future/deferred and shown for reference.

| Area | admin | consultant | candidate (future) | recruiter (deferred) |
|------|--------|------------|---------------------|----------------------|
| **Dashboard** | ✅ Full | ✅ Scoped (assigned jobs only) | ❌ or minimal (own stats) | — |
| **Candidates list** | ✅ All | ✅ Only linked to assigned jobs | ❌ | — |
| **Candidate detail** | ✅ Full CRUD | ✅ Read + download CV only | ✅ Own only, read | — |
| **Job offers list** | ✅ All | ✅ Assigned only | ❌ | — |
| **Job offer detail** | ✅ Full CRUD | ✅ Read only | ❌ | — |
| **Job postings** | ✅ All | ✅ Read for assigned jobs | ❌ | — |
| **Clients** | ✅ All | ✅ Read only (for assigned job’s client) | ❌ | — |
| **Applications (CJA)** | ✅ All | ✅ Read only (for assigned jobs) | ✅ Own only, read | — |
| **External submissions** | ✅ All | ✅ Read only (for assigned job) | ❌ | — |
| **Profile (self)** | ✅ Read/edit self | ✅ Read only self | ✅ Read/edit self | — |
| **Settings** | ✅ Full | ❌ | ❌ | — |
| **Users / access mgmt** | ✅ Full (future) | ❌ | ❌ | — |
| **Consultant assignment** | ✅ Assign/unassign | ❌ (sees result only) | ❌ | — |
| **Create/edit/delete entities** | ✅ | ❌ | ❌ (own profile only) | — |
| **Download CVs** | ✅ | ✅ (assigned candidates only) | ❌ or own | — |

Summary:

- **admin:** full access including future user management and consultant assignments.
- **consultant:** read-only; scope = assigned job offers + their candidates/applications; can download CVs for those candidates.
- **candidate (future):** read (and limited edit) only for own profile and own applications.
- **recruiter (deferred):** not part of Phase 1; add when there is a real use case.

---

## C. Minimum schema changes needed now

### 1. Profiles

- **Keep:** `id`, `email`, `first_name`, `last_name`, `role`.
- **Add:** `is_active` (boolean, default `true`).  
  Used to disable login/access without deleting the profile; RLS and app logic will require `is_active = true` for non-admin access.  
  **Recommendation:** Add `is_active` now so that user management (activate/deactivate) can be implemented without a second schema change.

### 2. Consultant assignment table (new)

- **Table name (conceptual):** `consultant_assignments` (or `job_offer_consultants`).
- **Columns (minimal):**
  - `id` (uuid, PK).
  - `job_offer_id` (uuid, FK → `job_offers.id`, NOT NULL).
  - `consultant_id` (uuid, FK → `profiles.id`, NOT NULL).  
  - Optional: `created_at`, `created_by` (audit).
- **Uniqueness:** One row per (job_offer_id, consultant_id) — a consultant can be assigned to a job offer at most once.
- **Indexes:**  
  - Index on `consultant_id` (list job offers for a consultant).  
  - Unique index on `(job_offer_id, consultant_id)`.
- **Constraints:** No circular or duplicate assignments; FK to `profiles` where `role = 'consultant'` is a business rule enforced in app/API or trigger, not strictly required in schema for v1.

### 3. RLS / helpers (conceptual only)

- **Helper (conceptual):** e.g. `is_consultant_assigned_to_job(uid uuid, job_offer_id uuid)` → true if `consultant_assignments` has a row for that user and job.  
  Used in RLS so consultants see only assigned job offers and, via that, only related candidates/applications.
- **Helper (conceptual):** `is_internal_staff(uid)` (or equivalent) should recognize only `admin` and `consultant` for the forward role model. Separate policies will restrict consultants to assigned data. Any existing `staff` (or `recruiter`) in the role list is for legacy compatibility only.
- **Policies (conceptual):**  
  - **consultant:**  
    - job_offers: SELECT where `is_consultant_assigned_to_job(auth.uid(), id)`.  
    - candidates: SELECT where candidate is linked (via candidate_job_associations) to at least one assigned job_offer.  
    - candidate_job_associations: SELECT where job_offer_id in assigned set.  
    - clients: SELECT where id in (client_id of assigned job_offers).  
    - job_postings: SELECT where job_offer_id in assigned set.  
    - external_candidate_submissions: SELECT where job_offer_id in assigned set (if applicable).  
  - No INSERT/UPDATE/DELETE for consultant on these tables (read-only).  
  - Storage (CVs): allow read/download for candidate files when the candidate is visible to the consultant (same “assigned job” logic).

No SQL is written here; this defines the minimum schema and policy *concepts* for implementation.

---

## D. Future schema changes (later)

- **candidate role and linking:** When introducing the **candidate** role: link `profiles.id` (or a dedicated `candidate_profiles` / external user) to `candidates.id` so that “own” applications and profile can be resolved. May require a `candidates.user_id` or a separate mapping table.
- **User management tables (optional):** If you introduce invite/workflow tables (e.g. invited emails, pending roles), add those in a later phase.
- **Audit for assignments:** If needed, add `created_by` / `created_at` (and optionally `deactivated_at`) to `consultant_assignments`; not required for minimal v1.
- **Legacy `staff`:** Not part of the forward role model. If present in DB/RLS, treat as compatibility only (e.g. keep in role list so existing users still have access until migrated); no new behavior planned for `staff`. Recruiter role is deferred until there is a real use case.

---

## E. Consultant assignment UX flow (conceptual)

1. **Where it lives:** Admin-only “Access management” or “Job offer” detail: e.g. “Consultants” section on the job offer detail page or a dedicated “Assign consultants” screen.
2. **List:** For a given job offer, show current consultant assignments (consultant name/email, optionally “Assigned on”).
3. **Assign:** Admin selects a user with role `consultant` (from a list of consultants) and adds an assignment to the current job offer. Backend creates a row in `consultant_assignments` (job_offer_id, consultant_id).
4. **Unassign:** Admin removes an assignment; backend deletes (or soft-deletes) the corresponding row.
5. **Validation:** Only users with `role = 'consultant'` can be assigned; no duplicate (job_offer_id, consultant_id).
6. **Consultant experience:** Consultant logs in → sees only assigned job offers (e.g. in dashboard and job-offers list) → opens a job offer → sees only candidates/applications for that job → can open candidate and download CV; no edit/delete/create actions.

---

## F. Implementation phases

| Phase | Scope | Schema | Application / RLS |
|-------|--------|--------|--------------------|
| **1 – Foundation** | Roles + profile flag | Add `profiles.is_active` (default true). Add `consultant_assignments` table + indexes. | RLS: recognize `admin` and `consultant` only (plus legacy `staff` if needed for compatibility). Enforce `is_active` in RLS. Add `consultant` so consultants can log in; consultant scoping in Phase 2. |
| **2 – Consultant scoping** | Consultant sees only assigned data | — | Implement `is_consultant_assigned_to_job` and RLS policies so consultants get SELECT only on assigned job_offers, related candidates, CJA, clients, job_postings, external submissions. Restrict storage (CV) read to candidates visible to consultant. UI: hide create/edit/delete for consultant. |
| **3 – Assignment UX** | Admin assigns consultants to jobs | — | Admin-only UI: list/add/remove consultant assignments per job offer. Use `consultant_assignments` for reads/writes. |
| **4 – User/access management (future)** | Activate/deactivate, role assignment | — | Admin area: users list, user detail, set `is_active`, set `role`. Optionally invite flow. |
| **5 – Candidate role (future)** | Self-service candidate portal | Link profile/user to candidate (e.g. `candidates.user_id` or mapping table). | RLS and UI for “own” profile and applications only; candidate role in `profiles.role`. |
| **Recruiter (deferred)** | When needed | — | Add `recruiter` to role model and RLS when there is a real use case. |

**Implement now (minimal):**  
- **Phase 1** (schema: `is_active`, `consultant_assignments`; RLS: `admin` + `consultant`, respect `is_active`; legacy `staff` compatibility only if present).  
- **Phase 2** (consultant RLS scoping + read-only UI).  
- **Phase 3** (assignment UX for admin).

**Later:** Phase 4 (user/access management UI), Phase 5 (candidate role and linking), recruiter when needed.

---

## Summary

- **Roles now:** admin, consultant. **Future/deferred:** candidate, recruiter. **Legacy:** staff (compatibility only, not part of forward model).
- **Data model now:** `profiles.is_active`; new table `consultant_assignments` (job_offer_id, consultant_id) with unique + index on consultant_id.
- **Access:** Admin full; consultant read-only on assigned job offers and related candidates, with CV download. Candidate and recruiter deferred.
- **Consultant behavior:** Only assigned job offers; only candidates linked to those offers; can download CVs; no edits.
- **Future admin area:** Users list/detail, activate/deactivate, role assignment, consultant assignment to job offers.
- **Phasing:** 1 – foundation (schema + admin/consultant in RLS, is_active), 2 – consultant scoping (RLS + UI), 3 – assignment UX; 4–5 later (user management, candidate role); recruiter when needed.

This blueprint is intentionally minimal and avoids overengineering; implementation details (exact policy names, trigger for `role = 'consultant'`, storage policy wording) are left for the implementation step.
