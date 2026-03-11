# Candidate Status Refactor – Audit Report (First Pass)

**Scope:** Separate candidate profile status, application status, and candidate availability.  
**Requested:** Audit only – no implementation. Identify impacted files, refactor plan, and safest implementation order.

---

## 1. Target model (goal)

| Concept | Source | Values |
|--------|--------|--------|
| **Candidate profile status** | `candidates.status` | `pending_review`, `approved`, `rejected`, `archived` |
| **Application pipeline** | `candidate_job_associations.status` | `applied`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`, `not_selected` |
| **Availability (DB support)** | `candidates.availability_status` | `available`, `unavailable` |
| **Availability (UI, runtime)** | Derived from applications | `working` (any hired), `in_process` (any active), `available` (else) |

**Business rule:** A candidate who is already hired in one application can still be added to another job. Do not add hard-block logic based on working/hired.

---

## 2. Impacted files (by category)

### 2.1 Candidate status treated as pipeline (remove pipeline semantics)

| File | Current usage | Change |
|------|----------------|--------|
| **portal/runtime/status-runtime.js** | `getCandidateStatusBadgeClass`, `formatCandidateStatusLabel`: pipeline values (new, applied, screening, interview, offer, hired, rejected, withdrawn, not_selected). `getEffectiveCandidateStatus`: derives from `latest_association.status` / candidate.status. `isCandidateHired(candidate)`: uses `candidate.status === 'hired'`. `getDashboardCandidateStatusBadgeClass`, `formatDashboardCandidateStatusLabel`: new/interview/hired/rejected. | Introduce **profile status** helpers (pending_review, approved, rejected, archived) and legacy mapping. Keep application helpers as-is. Change `getEffectiveCandidateStatus` to be application-only or remove; use profile status for “Profile Status” and application status only for application context. `isCandidateHired`: base on applications (any assoc status === 'hired'), not `candidates.status`; or remove if no longer needed. |
| **portal/features/candidates/candidate.js** | `getStatusBadgeClasses`: new/interview/hired/rejected. `renderCandidateCore`: shows `candidate.status` as pipeline (new, interview, hired, rejected) in “Status” field. | Use **profile status** (with legacy mapping). Rename UI concept to “Profile Status”. |
| **portal/runtime/candidate-runtime.js** | Populates form `status` from `candidate.status` (line 501); default `"new"`. Tracks `setCandidateOriginalStatus` for change log. | Form options = new profile status enum; default e.g. `pending_review`. Map legacy values on load/save. |
| **portal/runtime/associations-runtime.js** | `renderInlineCandidateRow`: uses `(candidate.status \|\| "new")` and `formatCandidateStatusLabel` / `getCandidateStatusBadgeClass`; **hides row if `isCandidateHired(candidate)`** (line 40). Filter for “add candidate” uses `isCandidateHired` and `computeCandidateAvailability === "available"` (lines 691, 1173). | Show **profile status** (or application summary) in row; **remove** hide when hired (allow adding hired candidates to another offer). Filter by availability only (no hard block on hired). |
| **portal/core/data/candidates.js** | `buildCandidatesQuery`: `if (filters.status) q = q.eq("status", filters.status)` (line 395). Returns `status: r.status` in mapped rows. | Keep filter on `candidates.status`; values become profile status enum. Legacy: map old values in query or in normalization layer. |
| **portal/core/lists-runtime.js** | `applyCandidateFilters`: filters by `getEffectiveCandidateStatus(item)` vs `filters.status` (new/applied/hired etc). Dashboard: `renderDashboardRecentCandidates` uses `row.status` and `getDashboardCandidateStatusBadgeClass` / `formatDashboardCandidateStatusLabel`. | Candidate list: filter by **profile status** (and optionally availability). Dashboard recent table: show **profile status** (with legacy mapping). |
| **portal/runtime/entity-actions-runtime.js** | Saves candidate with `payload.status` (from form); logs “Status changed” when profile status changes. | Keep; values become profile status enum. Legacy mapping on save if needed. |

### 2.2 Sync logic that sets `candidates.status = hired` (remove)

| File | Location | Change |
|------|----------|--------|
| **portal/core/data/applications.js** | Lines 932–947: after association → `hired`, updates `candidates.status` to `hired`. | **Remove** this block entirely. Keep `recalculateCandidateAvailability` and `syncJobOfferStatusFromHired`. |

### 2.3 Search / “available candidates” and hard blocks (align with business rule)

| File | Current usage | Change |
|------|----------------|--------|
| **portal/core/data/applications.js** | `searchAvailableCandidatesForAssociation`: `.eq("availability_status", "available").not("status", "eq", "hired")` (lines 359–360). | **Remove** `.not("status", "eq", "hired")`. Rely only on `availability_status` (or keep as-is for “available” list; do not add extra block for hired). User rule: hired candidates can be added to another job. |
| **portal/runtime/associations-runtime.js** | `renderInlineCandidateRow`: returns `null` if `isCandidateHired(candidate)` (line 40). Picker filter (lines 691, 1173): excludes when `isCandidateHired(c)` or availability !== "available". | **Stop excluding** candidates solely because they are hired. Filter only by availability if desired (available vs in_process vs working), or show all and let user choose. |

### 2.4 UI labels and candidate detail page

| File | Current usage | Change |
|------|----------------|--------|
| **portal/candidate.html** | Candidate Information: label “Status” (line 89), `data-field="status-text"`. | Change label to **“Profile Status”**. Keep field for profile status only. |
| **portal/features/candidates/candidate.js** | Sets `status-text` from `candidate.status` (pipeline semantics). Comment: “Status in Candidate Information is pipeline status”. | Set `status-text` from **profile status** (with legacy mapping). Add or improve **application summary** (per-application status) so application status is distinct. |
| **portal/add-candidate.html** | Label “Status”, select options: New, Interview, Hired, Rejected (lines 87–93). | Label **“Profile Status”**; options: Pending review, Approved, Rejected, Archived. Map legacy values for edit. |

### 2.5 Dashboard metrics (separate candidate DB vs recruitment pipeline)

| File | Current usage | Change |
|------|----------------|--------|
| **portal/core/data/dashboard.js** | `getHiredThisMonth()`: counts `candidates` where `status = 'hired'` and `created_at` this month (lines 141–174). `getRecentCandidates()`: returns `status` (candidate row). | **Replace** “Hired this month” with a **recruitment pipeline** metric: count applications (`candidate_job_associations`) with `status = 'hired'` and `created_at` (or `updated_at`) this month. Dashboard “Recent candidates” table: show **profile status** (not pipeline); optional second column for “Latest application status” if desired. |
| **portal/core/supabase.js** | Delegates `getHiredThisMonth` to dashboard module (line 1158). Comment says “candidates with status 'hired'”. | No code change in supabase.js; dashboard module implements new metric from CJA. |
| **portal/dashboard.html** | “Hired” metric card: `onclick="IERouter.navigateTo('candidates', { status: 'hired' })"` (line 66). “New” metric: `status: 'new'` (line 53). Table header “Status” for recent candidates (line 96). | “Hired” card: navigate to candidates filtered by **application** status (e.g. “applications with status hired”) or to applications list with filter; or keep as “candidates with at least one hired application” (clarify product intent). “New” → e.g. profile status “pending_review” or “new this month”. Table: “Profile Status” column; optional “Latest application” column. |
| **portal/core/lists-runtime.js** | `initDashboardPage`: calls `getHiredThisMonth()`, maps `recentList` to `status: r.status`. `renderDashboardRecentCandidates`: shows `row.status` with dashboard status badge/label. | Use new dashboard API for “hired this month” (from CJA). Pass profile status (and optional latest application status) for recent candidates; use profile status badge/label. |

### 2.6 Preserve (do not change behavior)

| Area | Where | Note |
|------|--------|------|
| Offer auto-close | `portal/core/data/applications.js`: `syncJobOfferStatusFromHired`, `updateCandidateAssociationStatus` (not_selected, job close) | Keep as-is. |
| Availability recalc | `recalculateCandidateAvailability(oldRow.candidate_id)` after association update | Keep. |
| Runtime availability | `status-runtime.js`: `computeDerivedAvailability`, `computeCandidateAvailability` (working / in_process / available) | Keep; ensure no dependency on `candidates.status` for “hired” for availability. |
| Application pipeline | `candidate_job_associations.status`, application list/detail, pipeline statuses doc | Already correct; no change to CJA status values. |

### 2.7 Legacy value compatibility

| Legacy value | Intended mapping (suggested) |
|--------------|-----------------------------|
| `new` | `pending_review` |
| `interview` | `pending_review` (or `approved` if “interview” meant approved for next step) |
| `hired` | `approved` (profile approved; “hired” is only on application) |

Apply in: (1) reading `candidates.status` for display (normalize to profile status + labels), (2) candidate list/dashboard filters (accept legacy in URL/query and map to new enum for DB if needed), (3) optional one-time migration script to update DB rows.

### 2.8 Documentation to update

| Doc | Updates |
|-----|---------|
| **portal/docs/STATUS-AUDIT.md** | Describe new `candidates.status` (profile: pending_review, approved, rejected, archived). Clarify CJA as only pipeline source. Remove “sync candidate status to hired”. Document legacy mapping. |
| **portal/docs/FLUSSO-RECRUITMENT-AUDIT-VISIVO.md** | Section 3.1: `candidates.status` = profile status (new enum). Remove sync to hired. Section 3.2: keep availability_status. Section 5.2: remove step that sets `candidates.status = hired`. |
| **portal/docs/pipeline-statuses.md** | Add short note: `candidates.status` is **profile lifecycle** (pending_review, approved, rejected, archived), not pipeline; pipeline remains only on `candidate_job_associations.status`. |
| **portal/docs/application-lifecycle.md** | No structural change; already CJA-centric. Optionally add one line that candidate profile status is separate (see portal docs). |

---

## 3. Refactor plan (summary)

1. **Introduce profile status semantics**
   - New enum: `pending_review`, `approved`, `rejected`, `archived`.
   - In `status-runtime.js`: add `getProfileStatusBadgeClass`, `formatProfileStatusLabel`, `normalizeProfileStatusFromLegacy(value)`.
   - Use these everywhere “candidate status” is shown as profile (detail page, dashboard recent table, add/edit form, list if showing profile status).

2. **Remove candidate-level pipeline semantics**
   - Stop syncing `candidates.status = 'hired'` in `applications.js`.
   - In candidate detail and list, show **Profile Status** from `candidates.status` (with legacy mapping); show **Application status** only in application context (e.g. application summary table on candidate profile, applications list, job-offer associations).

3. **Rename UI “Status” → “Profile Status”**
   - `candidate.html`, `add-candidate.html`, and any other labels.

4. **Candidate detail page**
   - “Candidate Information”: one field **Profile Status** (from `candidates.status`).
   - Hero/header: keep availability badge (working / in_process / available) as today.
   - Add or improve **application summary** (e.g. table: offer, client, application status, date) so application status is clearly per-application.

5. **Dashboard**
   - **Candidate DB metrics:** total candidates, new candidates today, recent candidates table → use `candidates.status` (profile) and `candidates` table only.
   - **Recruitment pipeline metrics:** “Hired this month” → count from `candidate_job_associations` where `status = 'hired'` and created/updated this month.
   - Recent candidates table: column “Profile Status”; optional “Latest application” column. Dashboard “Hired” card: link to applications list filtered by hired, or to candidates with hired applications (product decision).

6. **Association picker and search**
   - Remove “hide if hired” and remove `.not("status", "eq", "hired")` from `searchAvailableCandidatesForAssociation` so hired candidates can be added to another job. Rely on `availability_status` only if you still want to restrict to “available” in the picker; do not add contract-based or hired-based blocks.

7. **Legacy compatibility**
   - Normalize legacy `new` / `interview` / `hired` to profile status in: status-runtime (display), candidate form load/save, list/dashboard filters, and optionally in `buildCandidatesQuery` (e.g. when filter is “new” or “hired”, map to profile or to application filter as decided).
   - Optional: DB migration to set `candidates.status` to new enum from legacy values.

8. **Docs**
   - Update STATUS-AUDIT.md, FLUSSO-RECRUITMENT-AUDIT-VISIVO.md, pipeline-statuses.md, and optionally application-lifecycle.md as in table above.

---

## 4. Safest implementation order

1. **Data and compatibility (no UI dependency)**
   - Add profile status helpers and legacy normalization in `status-runtime.js` (new functions only; do not remove old ones yet).
   - Optional: add DB migration that sets default `candidates.status = 'pending_review'` where null or legacy, and/or backfill legacy → new enum.

2. **Remove sync only**
   - In `portal/core/data/applications.js`, remove the block that sets `candidates.status = 'hired'` when an association becomes hired. Keep recalc availability and sync job offer. Deploy and verify: no errors; availability and offer close still work.

3. **Candidate form and detail (profile status only)**
   - `add-candidate.html`: change label to “Profile Status”, change options to new enum; in `candidate-runtime.js` and entity-actions, use new values and legacy mapping on load/save.
   - `candidate.html`: label “Profile Status”; in `candidate.js` use profile status helpers and legacy mapping for `status-text`. Keep availability badge as-is.

4. **Application summary on candidate profile**
   - Add or improve the applications table on candidate profile so each row shows application status (from CJA); ensure it’s clear that this is per-application, not profile status.

5. **Dashboard**
   - Add new metric: “hired this month” from `candidate_job_associations` (in dashboard data module); switch dashboard card to use it.
   - Recent candidates: show profile status (with legacy mapping) in “Status” column; optionally rename column to “Profile Status” and add “Latest application” column.

6. **Lists and filters**
   - Candidate list: filter by `candidates.status` (profile enum); accept legacy in URL and map to new enum for query; use profile status in row display if you show it.
   - Ensure list filter dropdown reflects profile status options (and/or availability, depending on product).

7. **Association picker and search**
   - Remove `isCandidateHired` check that hides candidates in picker; remove `.not("status", "eq", "hired")` from `searchAvailableCandidatesForAssociation`. Test: hired candidate can be added to another offer.

8. **status-runtime cleanup**
   - Deprecate or repurpose `getEffectiveCandidateStatus` / `getCandidateStatusBadgeClass` / `formatCandidateStatusLabel` for **application** context only (or remove from candidate profile/list and use profile helpers). Update `isCandidateHired` to derive from applications if still needed elsewhere, or remove.

9. **Documentation**
   - Update STATUS-AUDIT.md, FLUSSO-RECRUITMENT-AUDIT-VISIVO.md, pipeline-statuses.md (and application-lifecycle.md if desired). Add a short “Candidate profile status” section where relevant.

---

## 5. File list (quick reference)

| File | Category |
|------|----------|
| portal/runtime/status-runtime.js | Profile status helpers, legacy map, isCandidateHired / getEffectiveCandidateStatus |
| portal/features/candidates/candidate.js | Profile status on detail, application summary |
| portal/runtime/candidate-runtime.js | Form status options and load/save |
| portal/runtime/associations-runtime.js | Picker: don’t hide hired; status display |
| portal/core/data/candidates.js | buildCandidatesQuery filters.status |
| portal/core/lists-runtime.js | applyCandidateFilters, dashboard recent, dashboard metrics wiring |
| portal/core/data/applications.js | Remove hired sync; searchAvailableCandidatesForAssociation |
| portal/core/data/dashboard.js | getHiredThisMonth from CJA; recent candidates status |
| portal/runtime/entity-actions-runtime.js | Save payload status (profile enum) |
| portal/candidate.html | Label “Profile Status” |
| portal/add-candidate.html | Label and select options |
| portal/dashboard.html | Hired card link; table header |
| portal/core/supabase.js | Comments only (getHiredThisMonth) |
| portal/docs/STATUS-AUDIT.md | New status model |
| portal/docs/FLUSSO-RECRUITMENT-AUDIT-VISIVO.md | Section 3 and 5 |
| portal/docs/pipeline-statuses.md | candidates.status = profile |
| portal/docs/application-lifecycle.md | Optional one-line note |

---

## 6. Migration notes (for implementation phase)

- **DB:** No schema change required if `candidates.status` remains a string; only valid values change. Optional migration: `UPDATE candidates SET status = 'pending_review' WHERE status IS NULL OR status = '';` and `UPDATE candidates SET status = 'approved' WHERE status = 'hired';` (and similar for `new`/`interview`) after code supports both.
- **Backward compatibility:** All reads of `candidates.status` should go through a normalizer that maps `new` → `pending_review`, `interview` → `pending_review`, `hired` → `approved`, `rejected` → `rejected` for display and for filter semantics until data is migrated.
- **Dashboard “Hired” link:** Today it goes to `candidates?status=hired`. After refactor, “hired” is an application status. Options: (A) link to applications list with filter `status=hired`, or (B) link to candidates list with a special filter “has at least one hired application” (would require API support). Prefer (A) unless product needs (B).

---

*End of audit. No code changes were made; this document is for planning only.*
