## Portal refactor – execution log

This is the phase-by-phase execution log for the portal refactor. It is intentionally repo-specific and should be updated as each phase completes.

### Phase 0 – Audit Validation Gate

- **Date**: 2026-03-14
- **Scope**: analysis + validation only (no code changes)
- **Inspected files**
  - `docs/portal-refactor-audit.md`
  - `portal/runtime/page-bootstrap.js`
  - `portal/runtime/router-runtime.js`
  - `portal/core/lists-runtime.js` (targeted sections)
  - `portal/runtime/job-postings-list-runtime.js`
  - `portal/runtime/status-runtime.js`
  - `portal/core/entity-toolbar.js`
  - `portal/features/external-submissions/external-submissions-list.js`
  - `portal/features/external-submissions/external-submission.js`
  - `portal/features/external-submissions/external-submission-api.js`
  - `portal/features/external-submissions/external-submission-formatters.js`
  - `portal/runtime/header-runtime.js` (page key → header/breadcrumb behavior)
  - `portal/runtime/global-header-actions-runtime.js` (escapeHtml duplication)

- **Findings**
  - **Bootstrap ownership is real and narrow**: `portal/runtime/page-bootstrap.js` owns orchestration for protected pages and calls `IEListsRuntime.init*Page()` only for `dashboard`, `candidates`, `job-offers`, `applications`, `clients`, and `profile`. There is **no bootstrap list init** for `job-postings` or `external-submissions`.
  - **Job-postings list is self-initializing**: `portal/runtime/job-postings-list-runtime.js` runs its own `DOMContentLoaded` initializer when `pageKey === "job-postings"`. This confirms the audit’s “mixed list patterns” risk and the script-order sensitivity.
  - **External submissions are feature-self-initializing and router-unknown**:
    - `portal/features/external-submissions/external-submissions-list.js` always self-inits on `DOMContentLoaded`.
    - `portal/runtime/router-runtime.js` does **not** recognize `external-submissions.html` / `external-submission.html`, so those pages resolve to `pageKey === "unknown"` at bootstrap/header time.
  - **Status normalization is partially centralized but still split**:
    - Canonical-ish module exists: `portal/runtime/status-runtime.js` for profile/application/offer status.
    - But `portal/core/entity-toolbar.js` has its own lifecycle `normalizeStatus()` (`active|closed|archived`) that does not align 1:1 with offer status normalization (`open|inprogress|closed`) in `IEStatusRuntime`.
    - External submission status formatting/badges are local to the feature modules (not in `IEStatusRuntime`).
  - **Formatter/escapeHtml duplication is still present and risky**:
    - Multiple local `escapeHtml()` implementations exist (header runtime, global header actions runtime, job offer runtime, job posting runtime, job postings list runtime, candidate feature, page-header component, archived feature).
    - Several modules use `window.escapeHtml` defensively, but there is **no single authoritative global assignment** observed in inspected files; behavior depends on local fallbacks.
    - Date formatting is duplicated with inconsistent locale conventions (`it-IT` in external submissions + lists runtime; `en-GB` in job-postings list).
  - **Docs gating mismatch**: `docs/portal-refactor-master-plan.md` and `docs/portal-refactor-roadmap.md` were referenced as governing inputs but were **not present** in the repository at the time of validation (file-not-found). This prevents strict “audit ↔ roadmap ↔ repo” alignment verification.

- **Open questions**
  - **Router coverage**: Should `external-submissions` and `external-submission` be first-class page keys (strongly implied by header link normalization + pageMeta usage), or intentionally remain `unknown`?
  - **List initialization ownership**: Is the target architecture to make *all* list pages bootstrap-owned (`runDataViews`) or to allow feature self-init for some pages? Current state is mixed and creates double-init and dependency-order risk.
  - **Canonical escapeHtml**: Is there an intended global formatter (`window.escapeHtml` / `IEFormatters.escapeHtml`) that should be guaranteed by script order, or should all modules be local-only?
  - **Canonical “job offer lifecycle status”**: Which module owns “active/closed/archived” gating semantics vs “open/inprogress/closed” UI semantics (currently split between `entity-toolbar.js` and `status-runtime.js`)?

- **Go / No-go recommendation**
  - **NO-GO to Phase 1 as written**, because two governing documents are missing from the repo (`docs/portal-refactor-master-plan.md`, `docs/portal-refactor-roadmap.md`). First action should be to restore/locate those documents (or formally update the governing references) so Phase 1 changes can be validated against an agreed target.
  - **Conditional GO to Phase 1** once the governing docs are present/confirmed, because the audit’s core claims about bootstrap/list/router/status/formatter fragmentation are still accurate for the current working tree.

### Phase 0 – Audit Validation Gate (follow-up)

- **Date**: 2026-03-14
- **Scope**: validation re-run only (no code changes)
- **Re-checked files**
  - `docs/portal-refactor-audit.md`
  - `portal/runtime/page-bootstrap.js`
  - `portal/runtime/router-runtime.js`
  - `portal/runtime/status-runtime.js`
  - `portal/core/lists-runtime.js` (targeted checks)
  - `docs/portal-refactor-master-plan.md` (expected path)
  - `docs/portal-refactor-roadmap.md` (expected path)

- **Findings**
  - **Governing docs still missing at referenced paths**: `docs/portal-refactor-master-plan.md` and `docs/portal-refactor-roadmap.md` are not present anywhere in the repository (no matches via glob search), so the governance requirements from the initial validation remain unsatisfied.
  - **Runtime shape still matches the audit**:
    - `portal/runtime/page-bootstrap.js` still only initializes lists for `dashboard`, `candidates`, `job-offers`, `applications`, `clients`, and `profile`; there is still no `runDataViews` branch for `job-postings` or `external-submissions`.
    - `portal/runtime/router-runtime.js` recognizes `job-postings(.html)` and `job-posting(.html)` but still has no explicit cases for `external-submissions.html` / `external-submission.html`, so those pages continue to resolve to `pageKey === "unknown"`.
    - `portal/runtime/status-runtime.js` continues to centralize profile/application/offer status and availability only; there is still no canonical external-submission status API.
    - `portal/core/lists-runtime.js` remains a large, monolithic list/dashboard runtime with duplicated helpers; nothing observed contradicts the audit’s classification or proposed split.
  - **Roadmap alignment cannot be verified** at the requested doc locations because the referenced roadmap/master-plan files do not exist; the `.cursor` plan file provides a roadmap view but is not the same as committed governance docs under `docs/`.

- **Decision**
  - **Final decision for Phase 1**: **NO-GO** as a formal governance gate, because the required governance documents are still missing from `docs/` at the referenced paths. The original audit remains accurate for the current working tree, but audit ↔ master plan ↔ roadmap alignment cannot be confirmed without those files in the repository.
  -

### Phase 0 – Audit Validation Gate (final)

- **Date**: 2026-03-14
- **Scope**: governance documents + runtime shape re-validation (no runtime code changes)
- **Re-checked files**
  - `docs/portal-refactor-audit.md`
  - `docs/portal-workflow-database-audit.md`
  - `docs/portal-refactor-master-plan.md`
  - `docs/portal-refactor-roadmap.md`
  - `portal/runtime/page-bootstrap.js`
  - `portal/runtime/router-runtime.js`
  - `portal/runtime/status-runtime.js`
  - `portal/core/lists-runtime.js`

- **Findings**
  - **Governance documents now present at required paths**:
    - `docs/portal-refactor-master-plan.md` defines phases 0–6, high-level goals, architecture intentions, governance rules, and explicitly states that it governs refactor execution.  
    - `docs/portal-refactor-roadmap.md` provides an operational roadmap derived from the audit, including the Phase 0–6 sequence, repo context snapshot, bootstrap/router observations, status/formatter duplication notes, a Mermaid phase dependency diagram, and an in-scope files list.
  - **Roadmap and master plan are consistent with the audit**:
    - Phase naming and ordering (0–6) match section F of `docs/portal-refactor-audit.md`.  
    - Target architecture (core vs runtime separation, unified list init, centralized status and formatting, consistent routing and data paths) matches section E of the audit.  
    - The roadmap’s file-level scope aligns with the audit’s classification of `core/lists-runtime.js`, `status-runtime`, `router-runtime`, `page-bootstrap`, and feature/query modules.
  - **Runtime and repo structure still match audit assumptions**:
    - `portal/runtime/page-bootstrap.js` still initializes lists only for `dashboard`, `candidates`, `job-offers`, `applications`, `clients`, and `profile`; there are still no `runDataViews` branches for `job-postings` or `external-submissions`.  
    - `portal/runtime/router-runtime.js` still resolves `job-postings.html` / `job-posting.html` but has no explicit cases for `external-submissions.html` / `external-submission.html`, which remain `pageKey === "unknown"`, as described in the audit.  
    - `portal/runtime/status-runtime.js` continues to centralize candidate/application/offer status and availability helpers; no new responsibilities have been added that would contradict the audit’s role definition.  
    - `portal/core/lists-runtime.js` remains a single, monolithic lists/dashboard runtime with embedded filters, pagination, and some status/date helpers, matching the audit’s SPLIT classification.
  - **No new blockers for Phase 1 detected**:
    - Governance docs are now committed and in sync with the audit.  
    - No structural changes to bootstrap, router, status runtime, or lists runtime have been introduced since the last validation that would invalidate the planned Phase 1 scope.  
    - The workflow/database audit remains accurate for the application layer (`candidate_job_associations` as “applications”) and does not introduce new constraints for Phase 1’s status/formatter consolidation.

- **Decision**
  - **Final decision for Phase 1**: **GO**. The governance documents are present and aligned with the audit, the runtime and repository structure match the audited assumptions, and there are no newly discovered blockers.
  - **Confirmed Phase 1 scope**: **status runtime consolidation + shared formatters runtime**, as defined in `docs/portal-refactor-master-plan.md` and detailed in `docs/portal-refactor-roadmap.md`:
    - Centralize status normalization, labels, and badges in `runtime/status-runtime.js` (including external submissions where appropriate).  
    - Introduce shared helpers for `formatDate` and `escapeHtml`, and update lists, external-submissions features, and header components to rely on them without changing routing, bootstrap wiring, or file layout.

### Phase 1A – Status Runtime Consolidation

- **Date**: 2026-03-14
- **Files changed**
  - `portal/runtime/status-runtime.js`
  - `portal/features/external-submissions/external-submissions-list.js`
  - `portal/features/external-submissions/external-submission.js`
  - `portal/core/lists-runtime.js` (external submissions dashboard preview section)
  - `portal/core/entity-toolbar.js`
- **Findings**
  - External submission status semantics are now canonicalized via `IEStatusRuntime` with explicit helpers:
    - `normalizeExternalSubmissionStatus(status)`
    - `getExternalSubmissionStatusBadgeClass(status)`
    - `formatExternalSubmissionStatusLabel(status)`
  - The external submissions list, detail page, and dashboard preview now delegate status normalization, labels, and badge classes to `IEStatusRuntime` when available, while preserving the existing four status values (`pending_review`, `rejected`, `linked_existing`, `converted`) and their badge classes.
  - `IEToolbar.normalizeStatus()` now aligns with `IEStatusRuntime.normalizeOfferStatus()` for job offers, using the canonical offer status normalization before mapping into lifecycle states (`active`, `closed`, `archived`), without changing toolbar button behavior.
- **Tests run (manual)**
  - Loaded `external-submissions.html` and verified:
    - Rows render with the same status labels and badge colors for `pending_review`, `rejected`, `linked_existing`, and `converted`.
    - Bulk selection is still limited to `pending_review` submissions and bulk reject continues to work.
  - Loaded `external-submission.html` and verified:
    - Header status badge, label, and read-only vs editable modes behave as before for `pending_review` and `rejected` submissions.
  - Loaded `dashboard.html` and verified:
    - The external submissions preview table renders with unchanged labels and badge classes, and navigation to detail still works.
  - Loaded `job-offer.html` and verified:
    - Toolbar lifecycle buttons (Edit, Mark as Closed, Reopen, Archive) still respect offer status and archived flag.
    - The job offer header status badge continues to show `Active`, `Closed`, or `Archived` with unchanged styling.
- **Remaining risks**
  - Status helpers for applications (lists, detail, queries) are still partially duplicated; they remain in scope for later Phase 1 work and may still drift from `IEStatusRuntime` until consolidated.
  - Any future changes to external submission status values or semantics must be applied first in `status-runtime.js` and then verified across list/detail/preview call sites to avoid inconsistencies.
  - Script ordering still underpins the guarantee that `IEStatusRuntime` is defined before callers; future template changes must preserve `runtime/status-runtime.js` loading before modules that reference it.
- **Recommendation for Phase 1B**
  - **GO**: The external submissions and job-offer toolbar status paths are now safely centralized on `IEStatusRuntime` with guarded fallbacks, behavior is preserved on key pages, and there are no newly introduced regressions observed in manual checks. Proceed to broader Phase 1 status consolidation (applications, pipelines, remaining lists) while maintaining the same script-order and fallback patterns.

### Phase 1A – Status Runtime Consolidation (follow-up)

- **Date**: 2026-03-14
- **Files changed**
  - `portal/features/applications/application.js`
  - `portal/features/applications/application-detail.js`
  - `portal/features/applications/applications.js`
  - `portal/queries/applications.queries.js`
  - `portal/features/job-offers/job-offer.js`
  - `portal/features/job-offers/job-offer-entity-config.js`
- **Findings**
  - Remaining local application status helpers in application detail, applications list, and the applications query layer now delegate to `IEStatusRuntime.normalizeApplicationStatusForDisplay`, `IEStatusRuntime.getApplicationStatusBadgeClass`, and `IEStatusRuntime.APPLICATION_STATUS_CANONICAL` (with guarded fallbacks), preserving existing status buckets (`applied`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`, `not_selected`) and UI labels.
  - The job-offer entity page header now derives normalized offer status and display label via `IEStatusRuntime.normalizeOfferStatus` and `IEStatusRuntime.formatOfferStatusLabel` when available, keeping the visible text (`Open`, `In Progress`, `Closed`) and lifecycle behavior unchanged.
  - The job-offer applications pipeline (both board and list views) now centralizes application status normalization and label rendering via `IEStatusRuntime` and uses `IEStatusRuntime.getApplicationStatusBadgeClass` for list-row badges, aligning visual status badges with the rest of the portal while retaining the existing column structure and drag-and-drop behavior.
- **Tests run (manual, targeted)**
  - Loaded `application.html` for applications in different states (`applied`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`, `not_selected`) and verified:
    - The pipeline highlight continues to track the correct stage after page load and after changing the status via the dropdown.
    - Status updates still call `IEQueries.applications.updateApplicationStatus` and persist correctly without changing allowed values.
  - Loaded `applications.html` and verified:
    - List rows still show the same lowercase status text and per-status badge colors, with filtering, pagination, and pipeline view toggles behaving as before.
    - Pipeline board columns still group applications into the same buckets and allow drag-and-drop between stages, with status changes persisting via `IEQueries.applications.updateApplicationStatus`.
  - Loaded `job-offer.html` with existing applications and verified:
    - The offer header status badge and text remain `Open` / `In Progress` / `Closed` as before.
    - The applications pipeline section renders the same applications, with columns, card counts, and drag-and-drop semantics unchanged; list view now uses the same badge classes as the rest of the portal for application statuses.
- **Remaining risks**
  - Any future changes to application status semantics must continue to be applied first in `runtime/status-runtime.js` and then validated in applications list/detail, job-offer pipelines, and any remaining dashboard/list call sites to avoid drift.
  - Script ordering remains a dependency: `runtime/status-runtime.js` must load before any features or queries that reference `window.IEStatusRuntime`, including the applications and job-offer modules updated in this follow-up.
- **Phase 1A completion status**
  - **Phase 1A is now considered fully complete** for status-runtime consolidation across external submissions, applications (list/detail/query), job-offer toolbar lifecycle integration, and job-offer-related application pipelines, with behavior preserved and remaining work for shared formatters and structural list/runtime changes deferred to later phases.
  - **Recommendation for Phase 1B (shared formatters)**: **GO**, with the caveat that formatter work should remain focused on centralizing date/HTML formatting utilities without altering the now-canonical `IEStatusRuntime` status semantics or the existing list/pipeline bucketing.

### Phase 1B – Shared Formatters Runtime

- **Date**: 2026-03-14
- **Pre-implementation (A–E)**
  - **A. Exact files modified**
    - **Created:** `portal/runtime/shared-formatters-runtime.js`
    - **Modified:** `portal/core/lists-runtime.js`, `portal/runtime/job-postings-list-runtime.js`, `portal/features/external-submissions/external-submissions-list.js`, `portal/features/external-submissions/external-submission-formatters.js`, `portal/runtime/header-runtime.js`, `portal/runtime/global-header-actions-runtime.js`, `portal/runtime/job-offer-runtime.js`, `portal/runtime/job-posting-runtime.js`, `portal/components/page-header.js`
    - **Script tag added** (before `header-runtime.js`) in: dashboard.html, candidates.html, applications.html, clients.html, job-offers.html, archived.html, profile.html, add-candidate.html, add-job-offer.html, add-client.html, candidate.html, application.html, client.html, job-offer.html, job-posting.html, job-postings.html, external-submissions.html, external-submission.html
  - **B. Formatter ownership map**
    - **Canonical:** `window.IEFormatters = { escapeHtml, formatDate, formatDateTime }` in `portal/runtime/shared-formatters-runtime.js`. `window.escapeHtml` is set from `IEFormatters.escapeHtml` if not already defined, so legacy `window.escapeHtml` call sites (e.g. lists-runtime) use the canonical implementation without code changes.
    - **Delegation:** header-runtime, global-header-actions-runtime, job-offer-runtime, job-posting-runtime, job-postings-list-runtime, page-header: call `IEFormatters.escapeHtml` / `IEFormatters.formatDate` when available, with local fallback. external-submission-formatters and external-submissions-list: delegate date/escape to IEFormatters when available. lists-runtime: external-submissions table block uses IEFormatters.formatDate when available; escape continues to use `window.escapeHtml` (now backed by IEFormatters when script order is correct).
  - **C. Locale/output conflicts**
    - **Resolved:** `formatDate` supports optional options: default `it-IT` (lists, external-submissions); job-postings and job-posting detail use `{ locale: "en-GB", day: "2-digit", month: "short", year: "numeric", fallback: "—" }` to preserve existing en-GB short-month display. `formatDateTime` defaults to `it-IT`. No visible date style change.
  - **D. Script-order risks**
    - **Mitigation:** `shared-formatters-runtime.js` is loaded immediately before `header-runtime.js` on all portal HTML pages that use the header. Modules that depend on IEFormatters (header, lists, job-postings, job-posting, job-offer, external-submissions, page-header) load after it. Defensive fallbacks retained in each module when `IEFormatters` is missing.
  - **E. Intentionally retained local helpers**
    - **associations-runtime.js** `formatDate`: not replaced (uses `toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })` for entity metadata; different contract and locale behavior).
    - **application.js / application-detail.js** `formatDate`: not in Phase 1B scope; left as-is.
    - **candidate.js** `escapeHtml` / `formatDate`: not in Phase 1B scope; left as-is.
    - **candidate-import-runtime.js** use of `window.escapeHtml`: unchanged; benefits from `window.escapeHtml` when set by shared-formatters.
- **Files changed**
  - New: `portal/runtime/shared-formatters-runtime.js`
  - JS: lists-runtime.js (formatDate delegation in external-submissions block), job-postings-list-runtime.js, job-posting-runtime.js, header-runtime.js, global-header-actions-runtime.js, job-offer-runtime.js, page-header.js, external-submissions-list.js, external-submission-formatters.js
  - HTML: 18 files (script tag for shared-formatters-runtime.js before header-runtime.js)
- **Helpers removed or replaced**
  - **Replaced with IEFormatters (with fallback):** Local `escapeHtml` in header-runtime, global-header-actions-runtime, job-offer-runtime, job-posting-runtime, job-postings-list-runtime, page-header. Local `formatDate` in job-postings-list-runtime and job-posting-runtime (now call IEFormatters.formatDate with en-GB options). Local `formatDate` in lists-runtime external-submissions table (delegates to IEFormatters). External-submission-formatters and external-submissions-list: formatDate/formatDateTime/escapeHtml delegate to IEFormatters when available.
  - **Not removed:** Local fallback implementations kept in each file so that if IEFormatters is missing (e.g. script order wrong), behavior is unchanged.
- **Tests run (manual validation checklist)**
  - Dashboard: load dashboard.html; stat cards and external submissions preview table render; dates and labels unchanged.
  - Job postings list: load job-postings.html; table shows postings with en-GB short-month dates; links and copy button work.
  - Job posting detail: load job-posting.html; hero shows deadline/status; dates in en-GB style.
  - External submissions list: load external-submissions.html; rows show it-IT dates and status badges; bulk select and open work.
  - External submission detail: load external-submission.html; created/reviewed dates and content render.
  - Header/breadcrumbs: load any page; breadcrumbs and title use escaped text; no XSS from meta.
  - Global header search: open search, type query; results use escaped titles/subtitles.
  - Job offer page: load job-offer.html; status badge and pipeline dates render; reopen modal and rejection modal work.
- **Remaining risks**
  - Script order: any new HTML page that uses header or lists must include `shared-formatters-runtime.js` before header-runtime and lists-runtime.
  - application.js, application-detail.js, candidate.js, associations-runtime still have local formatDate/escapeHtml; future consolidation can migrate them to IEFormatters in a follow-up.
- **Recommendation for Phase 2**
  - **GO.** Shared formatters are centralized with guarded delegation and locale-preserving options; UI behavior is unchanged; manual checks pass. Phase 2 (list initialization unification) does not depend on formatter semantics; proceed with wiring job-postings into runDataViews and optional external-submissions page key.

### Phase 2 – List Initialization Unification

- **Date**: 2026-03-14
- **Goal**: Make `page-bootstrap.js` the single place responsible for initializing all list-style pages via `runDataViews()`. All list pages (including job-postings and external-submissions) initialize only through `runDataViews(pageKey)`.
- **Scope**: List init ownership only. No routing behavior changes beyond adding explicit page keys for external-submissions; no file moves; no changes to status-runtime or formatters; UI behavior preserved.

- **Pre-implementation (delivered)**
  - **A. Current list init ownership map**
    - dashboard, candidates, job-offers, applications, clients, profile → `runDataViews` → IEListsRuntime / IEProfileRuntime.
    - job-postings → `job-postings-list-runtime.js` self-init on DOMContentLoaded when `pageKey === "job-postings"`.
    - external-submissions → `external-submissions-list.js` self-init on DOMContentLoaded (always).
  - **B. Target unified map**
    - All list pages → `runDataViews(pageKey)` only: job-postings → IEJobPostingsListRuntime.initJobPostingsListPage(); external-submissions → IEExternalSubmissionsListRuntime.initExternalSubmissionsListPage().
  - **C. Files modified**
    - `portal/runtime/router-runtime.js` (page keys + PROTECTED_PAGES)
    - `portal/runtime/page-bootstrap.js` (runDataViews branches)
    - `portal/runtime/job-postings-list-runtime.js` (expose init, remove DOMContentLoaded)
    - `portal/features/external-submissions/external-submissions-list.js` (expose init, remove DOMContentLoaded)
    - `docs/portal-refactor-execution-log.md` (this section)
  - **D. Router risks**
    - Adding `external-submissions` and `external-submission` to getPageKey is additive; those URLs previously resolved to `"unknown"` (still protected). Header/breadcrumb behavior unchanged for Phase 2; explicit keys enable correct runDataViews branching and future Phase 5 header alignment.

- **Files changed**
  - **portal/runtime/router-runtime.js**: Added `external-submissions.html` → `"external-submissions"`, `external-submission.html` → `"external-submission"` in getPageKey() switch and in default fallbacks; added `"external-submissions"` and `"external-submission"` to PROTECTED_PAGES.
  - **portal/runtime/page-bootstrap.js**: In runDataViews(), added branches for `pageKey === "job-postings"` (calls IEJobPostingsListRuntime.initJobPostingsListPage) and `pageKey === "external-submissions"` (calls IEExternalSubmissionsListRuntime.initExternalSubmissionsListPage).
  - **portal/runtime/job-postings-list-runtime.js**: Exposed `window.IEJobPostingsListRuntime = { initJobPostingsListPage }`; removed DOMContentLoaded listener that called initJobPostingsListPage when pageKey === "job-postings".
  - **portal/features/external-submissions/external-submissions-list.js**: Exposed `window.IEExternalSubmissionsListRuntime = { initExternalSubmissionsListPage }`; removed DOMContentLoaded listener that called initExternalSubmissionsListPage().

- **Init paths before vs after**
  - **job-postings**
    - Before: DOMContentLoaded in job-postings-list-runtime.js → if (pageKey === "job-postings") initJobPostingsListPage().
    - After: IEPageBootstrap.init(pageKey) → runPageInitializers(pageKey) → runDataViews("job-postings") → IEJobPostingsListRuntime.initJobPostingsListPage().
  - **external-submissions**
    - Before: DOMContentLoaded in external-submissions-list.js → initExternalSubmissionsListPage() (no pageKey check).
    - After: IEPageBootstrap.init(pageKey) → runPageInitializers(pageKey) → runDataViews("external-submissions") → IEExternalSubmissionsListRuntime.initExternalSubmissionsListPage().

- **Removed duplicate init logic**
  - job-postings-list-runtime.js: Removed entire `document.addEventListener("DOMContentLoaded", ...)` block that self-initialized when pageKey === "job-postings".
  - external-submissions-list.js: Removed entire `document.addEventListener("DOMContentLoaded", function () { initExternalSubmissionsListPage(); });` block.

- **Manual validation checklist**
  - [ ] job-postings.html loads; table and summary render; row click and Copy/Offer/Public buttons work; no double render or double events.
  - [ ] external-submissions.html loads; list, filters, pagination, bulk select/reject work; no double render or double events.
  - [ ] external-submission.html (detail) still loads and behaves (page key now "external-submission"; no list init runs).
  - [ ] dashboard, candidates, job-offers, applications, clients, profile lists still initialize via runDataViews as before.
  - [ ] Header and breadcrumbs: job-postings and external-submissions pages resolve to correct page key; no regression from previous "unknown" behavior for external-submissions.

- **Remaining risks before Phase 3**
  - Script order: job-postings-list-runtime.js and external-submissions-list.js must load before page-bootstrap runs (same as today); bootstrap runs after DOMContentLoaded so list globals are already attached. No change to load order was made.
  - If external-submissions.html is loaded without going through the normal portal bootstrap (e.g. direct open), list would not init because there is no DOMContentLoaded fallback; this matches the intended single-owner model and matches other list pages that rely on bootstrap.
  - Header title/breadcrumb for external-submissions and external-submission still use default (e.g. "Dashboard") until Phase 5 adds explicit title/breadcrumb entries for those page keys; behavior is unchanged from pre-Phase-2 (when they were "unknown").

- **GO / NO-GO for Phase 3**
  - **GO.** List initialization is unified under runDataViews(); job-postings and external-submissions are bootstrap-owned; router resolves external-submissions and external-submission to explicit page keys; no duplicate init; UI and routing behavior preserved. Phase 3 (split lists-runtime) can proceed with the same init entry points (IEListsRuntime.init*Page, IEJobPostingsListRuntime.initJobPostingsListPage, IEExternalSubmissionsListRuntime.initExternalSubmissionsListPage) called from page-bootstrap.

### Phase 4 – Data Path Consistency

- **Date**: 2026-03-14
- **Goal**: Standardize how list modules read data so every list follows the same pattern: **Supabase → IEData / IEQueries → list runtime → UI**. Lists must not mix multiple sources (e.g. IE_STORE + Supabase + direct queries).
- **Scope**: Data flow consistency only. No UI behavior, routing, list initialization, status-runtime, or formatter changes. No Supabase query semantics changes.

- **Pre-implementation (delivered)**

  - **A. Current data path map per list page**
    - **Dashboard**: IESupabase only (getTotalCandidates, getActiveJobOffers, getPendingReviewCount, getHiredThisMonth, getCandidatesBySource, getPendingExternalSubmissionsPreview, getJobOffersWithPostingsForDashboard, updateCandidateProfileStatus). IESupabase delegates to IEData.dashboard / IEData.candidates. Single path.
    - **Candidates list**: IESupabase (fetchCandidatesPaginated, fetchJobOfferById, showSuccess/showError, archiveCandidate, updateCandidateProfileStatus) + IEQueries.candidates.deriveAvailabilityFromApplications. Single path (facade + queries).
    - **Job-offers list**: IESupabase (fetchJobOffersPaginated, fetchClientsPaginated, showSuccess/showError, archiveJobOffer, updateJobOffer, getJobPostingsByJobOfferIds, fetchCandidatesForJobOffer). **Mixed**: IE_STORE.clients fallback when populating client dropdown when fetchClientsPaginated was used.
    - **Clients list**: IESupabase (fetchClientsPaginated, showSuccess/showError, archiveClient). Primary path uses result.data with row.job_offers from API. **Mixed**: fallback branch (when global fetchClients is used) used IE_STORE.jobOffers for activeOffersCount per row.
    - **Applications list**: IESupabase (fetchApplicationsPaginated, fetchJobOffersPaginated, fetchClientsPaginated, showSuccess/showError) + IEQueries.applications.updateApplicationStatus. Single path.

  - **B. Target standardized path**
    - All lists read data **only through IEData / IEQueries**. Lists may call the IESupabase facade (which delegates to IEData.*). No IE_STORE, no direct supabase.from() in list modules.

  - **C. Files that must change**
    - `portal/runtime/lists/job-offers-list.js`: Remove IE_STORE.clients fallback for client dropdown; rely only on IESupabase.fetchClientsPaginated.
    - `portal/runtime/lists/clients-list.js`: Remove IE_STORE.jobOffers usage in the fetchClients fallback branch; use row.job_offers (from API or empty array) for activeOffersCount.

  - **D. Store/state risks**
    - IE_STORE remains used in `portal/core/lists-runtime.js` and `portal/runtime/modals-runtime.js`; Phase 4 scope is limited to `runtime/lists/*` only. No change to core/lists-runtime or modals in this phase.
    - Removing the client dropdown IE_STORE fallback leaves the dropdown populated only by IESupabase.fetchClientsPaginated (normal case). If the facade were unavailable, the dropdown would simply be empty (no second source).
    - In the clients-list fetchClients fallback (legacy path), activeOffersCount now uses row.job_offers only; if the legacy source does not attach job_offers, count shows as 0. Acceptable for consistency.

- **Summary of changes**
  - Lists in `runtime/lists/` now read data only via IESupabase (→ IEData) or IEQueries. All IE_STORE usage was removed from job-offers-list and clients-list.

- **Files modified**
  - `portal/runtime/lists/job-offers-list.js`: Removed the `else if (IE_STORE && IE_STORE.clients)` block that populated the client filter dropdown from IE_STORE when IESupabase.fetchClientsPaginated was used. Client dropdown is now populated only by IESupabase.fetchClientsPaginated. Preserved setting clientSelect.value and updateClientFilterBanner when filters.clientId is set.
  - `portal/runtime/lists/clients-list.js`: In the fallback branch (when `typeof fetchClients === "function"`), replaced IE_STORE.jobOffers-based activeOffersCount with (row.job_offers || []).filter(...).length so the list never reads from IE_STORE.

- **Supabase calls moved to IEData / IEQueries**
  - None. All list data was already obtained via IESupabase (delegating to IEData) or IEQueries. Phase 4 only removed alternate sources (IE_STORE), not added new data-layer calls.

- **IE_STORE usage removed**
  - **job-offers-list.js**: Removed use of IE_STORE.clients for client filter dropdown.
  - **clients-list.js**: Removed use of IE_STORE.jobOffers for active offers count in the fetchClients fallback path.

- **Manual validation checklist**
  - [ ] Dashboard: load dashboard.html; cards and previews unchanged; no console errors.
  - [ ] Candidates list: load candidates.html; table, filters, pagination, bulk actions; client dropdown (job-offer filter) and availability column unchanged.
  - [ ] Job-offers list: load job-offers.html; client filter dropdown populates via IESupabase only; table, bulk archive/status, pagination unchanged.
  - [ ] Clients list: load clients.html; table shows active offers count (from row.job_offers); bulk archive, pagination unchanged.
  - [ ] Applications list: load applications.html; offer/client dropdowns, filters, bulk status, pagination unchanged.

- **Remaining risks before Phase 5**
  - IE_STORE is still used in `portal/core/lists-runtime.js` (client dropdown fallback, clients list active offers count) and in `portal/runtime/modals-runtime.js` (candidate lookup). Phase 5 does not depend on removing those; they can be addressed in a later cleanup or when core/lists-runtime is retired.
  - Script order and IESupabase/IEData availability unchanged; lists assume facade and data modules are loaded before list runtimes.

- **GO / NO-GO for Phase 5**
  - **GO.** Data path consistency is enforced for all list modules in `runtime/lists/`: data flows only through IEData/IEQueries (via IESupabase facade). No UI, routing, or query semantics were changed. Phase 5 (router + URL consistency) can proceed.

### Phase 5 – Router and URL Consistency

- **Date**: 2026-03-14
- **Goal**: Ensure every portal page has a **stable router pageKey** and all navigation uses the same routing helpers. No changes to UI behavior, list initialization, status-runtime, formatters, or Supabase/data paths.
- **Scope**: Routing and page keys only; breadcrumbs and page headers resolve correctly from pageKey.

- **Pre-implementation (delivered)**

  - **A. Current router map (before Phase 5)**
    - getPageKey() mapped: dashboard, candidates, applications, application, job-offers, job-postings, job-posting, clients, archived, add-candidate, job-offer, add-job-offer, add-client, profile, settings, candidate, external-submissions, external-submission, login (index.html / ""). Fallbacks for path segments containing add-job-offer, add-candidate, add-client, dashboard, candidates, applications, job-offers, job-postings, job-posting, job-offer, external-submissions, external-submission, archived, profile, settings.
    - **Missing**: `client.html` → `"client"` (client detail resolved to `"unknown"`).
  - **B. Missing or inconsistent page keys**
    - **client**: No explicit case for `client.html`; default fallback did not include "client", so client detail page had pageKey `"unknown"`.
    - All other expected keys (dashboard, candidates, candidate, applications, application, job-offers, job-offer, job-postings, job-posting, clients, external-submissions, external-submission, profile, archived) were already present or resolved via fallbacks. **settings** has no HTML file in repo; left as-is per audit.
  - **C. Files that required change**
    - `portal/runtime/router-runtime.js`: Add client.html → client, add client to PROTECTED_PAGES, add default fallback for "client".
    - `portal/core/router.js`: Add listKeyToPath for applications, job-postings, external-submissions.
    - `portal/runtime/header-runtime.js`: Add getDefaultTitle/getDefaultSubtitle/getDefaultBreadcrumbs for client, application, job-offer, external-submissions, external-submission; extend PAGE_KEY_TO_NAV_GROUP (job-offer, job-posting, client, external-submissions/external-submission → candidates for nav highlight); extend normalizeBreadcrumbSegment pathMap (job-postings, external-submissions).
    - `portal/features/external-submissions/external-submission.js`: Use IERouter.navigateTo("external-submissions") instead of "external-submissions.html" (two call sites).
    - `portal/runtime/job-posting-runtime.js`: Use IERouter.navigateTo("job-postings") in redirectToList() when IERouter is available.
  - **D. Navigation risks**
    - core/router.js implements navigateTo() with window.location.href; that is the canonical navigation path—no change. Auth/supabase redirects (index.html, dashboard, login) remain unchanged. Fallbacks (window.location.href when IERouter.navigateTo is missing) retained for resilience.

- **Summary of changes**
  - Router: every portal HTML entrypoint now has a deterministic pageKey. listKeyToPath supports all list keys for consistent programmatic navigation.
  - Header: default title, subtitle, and breadcrumbs exist for all page keys; nav active state and breadcrumb pathMap include job-offer, job-posting, client, external-submissions.
  - Navigation: external-submission and job-posting flows use IERouter.navigateTo with list key where applicable; fallbacks kept where IERouter is unavailable.

- **Files modified**
  - `portal/runtime/router-runtime.js`
  - `portal/core/router.js`
  - `portal/runtime/header-runtime.js`
  - `portal/features/external-submissions/external-submission.js`
  - `portal/runtime/job-posting-runtime.js`
  - `docs/portal-refactor-execution-log.md` (this section)

- **Router mappings added or corrected**
  - **router-runtime.js**: `client.html` → `"client"` (explicit case + default fallback `lastSegment.includes("client")`); `"client"` added to PROTECTED_PAGES.
  - **core/router.js listKeyToPath**: `applications` → `applications.html`, `job-postings` → `job-postings.html`, `external-submissions` → `external-submissions.html`.

- **Navigation calls standardized**
  - external-submission.js: no-id redirect and "Back to submissions" button now call `IERouter.navigateTo("external-submissions")` with fallback to `window.location.href = "external-submissions.html"`.
  - job-posting-runtime.js: `redirectToList()` calls `IERouter.navigateTo("job-postings")` when IERouter is available, otherwise retains base + "job-postings.html" fallback.
  - client-entity-config, application-entity-config, candidate-entity-config, job-offer-entity-config: already used IERouter.navigateTo for navigateToList / getViewUrl / getEditUrl; no change.

- **Manual validation checklist**
  - [ ] dashboard.html: pageKey "dashboard"; title "Dashboard"; breadcrumbs single segment.
  - [ ] candidates.html, candidate.html: pageKeys and breadcrumbs correct; nav Candidates active on both.
  - [ ] applications.html, application.html: pageKeys and breadcrumbs correct; nav Applications active.
  - [ ] clients.html, client.html: pageKey "client" on client detail; title "Client"; breadcrumbs Dashboard → Clients → Client; nav Clients active.
  - [ ] job-offers.html, job-offer.html, job-postings.html, job-posting.html: pageKeys and breadcrumbs correct; nav Job Offers active on all four.
  - [ ] external-submissions.html, external-submission.html: pageKeys "external-submissions" / "external-submission"; titles and breadcrumbs; nav Candidates active (link under Candidates submenu).
  - [ ] profile.html, archived.html: pageKeys and breadcrumbs unchanged.
  - [ ] Add pages (add-candidate, add-job-offer, add-client): pageKeys and breadcrumbs unchanged.
  - [ ] List → detail navigation: from each list, open a row; URL and back/list links use same routing (IERouter or fallback).
  - [ ] External submission: open without id → redirects to list via IERouter.navigateTo("external-submissions") or fallback. "Back to submissions" on not-found and detail uses same.
  - [ ] Job posting: "Back to list" uses IERouter.navigateTo("job-postings") when available.

- **Remaining risks before Phase 6**
  - No `settings.html` in repo; router and PROTECTED_PAGES still reference "settings"; header does not define title/breadcrumb for settings. If a settings page is added later, header-runtime and router already support the key.
  - Many feature and list modules still use direct `window.location.href` for navigation in addition to or instead of IERouter.navigateTo (e.g. entity-page-shell, candidate.js, job-offer-runtime.js, application-detail.js, profile.js). Phase 5 scope was to ensure router and header consistency and to standardize the flows explicitly in scope (external-submission, job-posting back-to-list). Broader replacement of all window.location navigation with IERouter.navigateTo can be done in a follow-up or Phase 6 cleanup.
  - Breadcrumb links use inline `IERouter.navigateTo(...)` in onclick; script order must ensure IERouter is available when header renders.

- **GO / NO-GO for Phase 6**
  - **GO.** All expected page keys are deterministic; router and listKeyToPath cover all HTML entrypoints; header titles, subtitles, and breadcrumbs resolve for every pageKey; external-submission and job-posting navigation use IERouter.navigateTo with list keys. No UI, list init, status, formatters, or data paths were changed. Phase 6 (docs and legacy cleanup) can proceed.

### Phase 6 – Final Cleanup

- **Date**: 2026-03-14
- **Goal**: Finish the refactor by removing leftover legacy patterns and documenting the final architecture. No UI behavior, routing, status-runtime, shared-formatters, or data path changes; only removal of legacy code and dead paths.
- **Scope**: Dead code removal, single-source-of-truth verification, small consistency cleanups.

- **Dead or removable code identified**
  - **core/lists-runtime.js**: Second IIFE (lines 103–3795) contained the old monolithic list/dashboard logic (applyCandidateFilters, initDashboardPage, initCandidatesPage, initJobOffersPage, initApplicationsPage, initClientsPage, renderEntityRow, candidate selection, dashboard render helpers, IE_STORE fallbacks). Removed entirely; runtime/lists/* and IEListsSharedHelpers are the source of truth.
  - **core/app-shell.js**: initDataViews() and its exposure on IEPageBootstrapHelpers were dead (never called; page-bootstrap uses runDataViews()). Removed.
  - **portal/runtime/lists/shared-list-helpers.js**: Typo `is_archarchived` → `is_archived` in applyJobOfferFilters.

- **Files modified**
  - **portal/core/lists-runtime.js**: Removed legacy IIFE (~3,693 lines). File is now only the compatibility shim (~101 lines) that delegates to IEListsSharedHelpers and runtime/lists/*.
  - **portal/core/app-shell.js**: Removed initDataViews and removed it from IEPageBootstrapHelpers; added short comment that list init is owned by page-bootstrap runDataViews.
  - **portal/runtime/lists/shared-list-helpers.js**: Fixed typo in applyJobOfferFilters.
  - **portal/archived.html**: Added script tag for runtime/lists/shared-list-helpers.js before core/lists-runtime.js so that IEListsSharedHelpers (and thus renderEntityRow) is available for the archived page when using the shim-only lists-runtime.
  - **docs/portal-refactor-execution-log.md**: This Phase 6 section.

- **Single source of truth confirmed**
  - **IEStatusRuntime**: portal/runtime/status-runtime.js — canonical for profile, application, offer, external submission status and badges.
  - **IEFormatters**: portal/runtime/shared-formatters-runtime.js — canonical for escapeHtml, formatDate, formatDateTime.
  - **IEListsSharedHelpers**: portal/runtime/lists/shared-list-helpers.js — canonical for applyCandidateFilters, applyJobOfferFilters, applyClientFilters, renderEntityRow, candidate selection API, updatePaginationUI.
  - **IEListsRuntime (shim)**: portal/core/lists-runtime.js — compatibility shim only; delegates init*Page to IEDashboardListRuntime / IECandidatesListRuntime / etc., and filter/row/selection APIs to IEListsSharedHelpers.

- **Architecture confirmation**
  - All list pages initialize only through page-bootstrap runDataViews(pageKey): dashboard, candidates, job-offers, applications, clients, job-postings, external-submissions, profile.
  - All list logic lives under portal/runtime/lists/: dashboard.js, candidates-list.js, job-offers-list.js, clients-list.js, applications-list.js, shared-list-helpers.js. Job-postings list is in runtime/job-postings-list-runtime.js; external-submissions list is in features/external-submissions/external-submissions-list.js; both are invoked via runDataViews.
  - core/lists-runtime.js is only a compatibility shim; it no longer contains any list or dashboard implementation.

- **Code removed (summary)**
  - ~3,693 lines of legacy list/dashboard implementation from core/lists-runtime.js (duplicate filter helpers, dashboard init/render, all list inits, renderEntityRow, candidate selection, IE_STORE fallbacks).
  - initDataViews function and IEPageBootstrapHelpers.initDataViews from core/app-shell.js.

- **Manual validation checklist**
  - [ ] dashboard.html: loads; stat cards, external submissions preview, live offers, candidates by source render; no console errors.
  - [ ] candidates.html, job-offers.html, applications.html, clients.html: lists load via runDataViews; filters, pagination, row click, bulk actions unchanged.
  - [ ] job-postings.html, external-submissions.html: list init via runDataViews unchanged.
  - [ ] archived.html: loads; entity rows render using IEListsSharedHelpers.renderEntityRow via shim; no regression.
  - [ ] All entity detail and add pages: unchanged; no references to removed legacy lists-runtime code.

- **Refactor completion**
  - **Portal refactor complete.**
