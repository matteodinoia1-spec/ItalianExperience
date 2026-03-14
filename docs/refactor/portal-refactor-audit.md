# Portal – Complete Architectural and Technical Audit (Refactor-Oriented)

**Date:** 2025-03-14  
**Scope:** `portal/` – ATS-style recruitment portal (vanilla JS, Supabase)  
**Goal:** Prepare for a structured refactor; no patch fixes or implementation in this document.

---

## A. Executive Summary

The portal is a **working but fragmented** vanilla JS application with a Supabase backend. It has undergone incremental refactors (entity-page shell, status runtime, data layer split, job postings) that introduced **multiple parallel patterns** rather than a single coherent architecture. The codebase is **maintainable only with high familiarity**; onboarding and future security hardening will be costly without consolidation.

**Critical findings:**

- **Three list-page patterns:** (1) `IEListsRuntime.init*Page()` driven by `page-bootstrap` (dashboard, candidates, job-offers, applications, clients); (2) self-init on `DOMContentLoaded` (job-postings list, external-submissions list). Job-postings is not wired in `runDataViews`, so list initialization is inconsistent.
- **Dual data paths:** `IESupabase` (facade) delegates to `IEData.*` for domain logic, but **IEQueries** (applications, candidates, clients, jobOffers) is a separate query layer used by entity configs and runtimes. Application entity uses IEQueries for load/save/status; candidate/client/job-offer use IESupabase. Application detail also uses raw `IESupabase.supabase` for updates.
- **Status normalization is repeated** in at least 8 places (profile, application, job offer, external submission, list filters) with overlapping semantics and local helpers (e.g. `normalizeStatus` in applications.js, application-detail.js, job-offer-entity-config.js, lists-runtime.js, entity-toolbar.js, queries).
- **Entity pages:** Candidate, client, job-offer, application use **EntityPageShell + entity config** for detail (view/edit); create pages (add-candidate, add-client, add-job-offer) use **page-bootstrap runPageControllers** (candidate/client/job-offer runtime) and do **not** use EntityPageShell. Create vs detail flows are asymmetric.
- **Single 3,600+ line file:** `core/lists-runtime.js` holds dashboard + all list filtering/rendering/pagination and duplicate status/format helpers. Dashboard data transforms live here and in `core/data/dashboard.js`; some duplication of “what counts as active” and “live” offers.
- **Router vs toolbar URL building:** `core/router.js` uses `IEToolbar.getEntityViewUrl()` for redirects; entity configs build URLs via IERouter/IEPortal or fallback strings. Inconsistent handling of `jobOffer` vs `job-offer` in places.
- **External submissions and job-postings** are first-class pages but not integrated into the same list/bootstrap model (external-submissions not in router page key switch; job-postings list init not in `runDataViews`).
- **Docs and migrations:** 21 docs under `portal/docs/` (mix of audits, plans, verification); migrations under `portal/migrations/`. No clear “legacy vs active” tagging; some docs refer to removed or renamed behavior.

**Recommendation:** Proceed with a **phased refactor** that (1) unifies list initialization and status/source normalization, (2) consolidates data access (queries vs facade), (3) splits lists-runtime and centralizes shared UI/format helpers, (4) aligns create/detail page model and routing, (5) documents and optionally archives legacy docs. This audit classifies files and proposes a target architecture and migration path without implementing changes.

---

## B. Current Architecture Findings

### B.1 Folder structure (current)

```
portal/
├── index.html, dashboard.html, *.html (list/detail/create pages)
├── core/                    # Mixed: true core vs runtime-style logic
│   ├── app-shell.js         # Auth guard, IEPageBootstrapHelpers, initDataViews, save handlers
│   ├── router.js            # Navigation, resolveEntityPageState, get*PageParams
│   ├── supabase.js          # IESupabase facade (~1100 lines) → IEData.*
│   ├── supabase-client.js   # Single Supabase client + getBasePath
│   ├── auth.js
│   ├── session-ready.js
│   ├── entity-toolbar.js    # getEntityViewUrl, normalizeStatus (offer), renderLifecycleActions
│   ├── source-helpers.js    # IESourceRuntime (normalize source, labels)
│   ├── job-posting-deadline.js
│   ├── debug.js
│   ├── data/                # IEData.* – real Supabase calls
│   │   ├── activity.js, applications.js, candidates.js, clients.js
│   │   ├── dashboard.js, job-offers.js, job-postings.js
│   ├── entity-page/
│   │   ├── entity-page-shell.js   # init(config), mount toolbar, related sections, activity
│   │   └── entity-field-mapper.js
│   ├── lists-runtime.js     # In core/ but is list+dashboard runtime (~3663 lines)
│   ├── session/, ui/        # session.js, modals.js, previews.js
│   └── migrations/         # SQL migrations
├── runtime/                 # Page-specific and shared runtime
│   ├── router-runtime.js   # getPageKey(), isProtectedPage()
│   ├── page-bootstrap.js   # Auth → header → runPageInitializers → bottom nav
│   ├── status-runtime.js   # IEStatusRuntime (profile, application, offer, availability)
│   ├── header-runtime.js, bottom-nav-runtime.js
│   ├── lists-runtime.js    # NOT HERE – in core/
│   ├── forms-runtime.js, modals-runtime.js
│   ├── filter-drawer-runtime.js
│   ├── associations-runtime.js, entity-actions-runtime.js
│   ├── candidate-runtime.js, candidate-profile-runtime.js, candidate-import-runtime.js
│   ├── client-runtime.js, job-offer-runtime.js, job-posting-runtime.js
│   ├── job-postings-list-runtime.js  # Self-init for job-postings list only
│   ├── profile-runtime.js, global-header-actions-runtime.js
│   └── ...
├── features/                # Entity-specific UI + config
│   ├── candidates/          # candidate.js (init + EntityPageShell), candidate-entity-config.js
│   ├── clients/             # client.js, client-entity-config.js
│   ├── job-offers/          # job-offer.js, job-offer-entity-config.js
│   ├── applications/        # application.js, application-detail.js, applications.js, application-entity-config.js
│   ├── archived/            # archived.js
│   ├── profile/             # profile.js
│   └── external-submissions/
│       ├── external-submission.js, external-submissions-list.js
│       ├── external-submission-api.js, external-submission-formatters.js
│       └── ...
├── queries/                 # IEQueries.* – used by entity configs + runtimes
│   ├── applications.queries.js, candidates.queries.js
│   ├── clients.queries.js, jobOffers.queries.js
├── shared/                  # header-loader.js, activity-section.js
├── components/              # page-header.js
├── layout/                 # header.html, footer.html, bottom-nav.html
├── styles/                  # style.css, ui.css, components/*.css
└── docs/                    # 21 .md audit/plan/verification docs
```

**Observations:**

- **core/** contains both shared infrastructure (router, supabase, auth) and heavy “runtime” logic (lists-runtime.js). Naming suggests lists-runtime could live under `runtime/` for consistency.
- **Entity configs** live in `features/<entity>/` and are the single point of contract for EntityPageShell (route, data, ui, lifecycle, related sections). Application entity config uses IEQueries; others use IESupabase.
- **Queries** are loaded only on pages that need them; script order in HTML defines the dependency graph. Missing a query script can cause “IEQueries.applications not available” at runtime.
- **No `settings.html`** in repo; router and header reference “settings” as protected/page key.

### B.2 Runtime architecture

- **Bootstrap sequence:**  
  (1) `app-shell.js` runs at parse time → sets `__IE_AUTH_GUARD__`.  
  (2) DOMContentLoaded → `IEPageBootstrap.init(pageKey)`: modals, entity-actions, await auth guard, profile + inactivity (if protected), header init, **runPageInitializers** (back button, buttons, forms, **runFormInitializers**, **runPageControllers**, **runDataViews**), then dynamic load of bottom-nav and init.

- **runDataViews(pageKey)** calls:
  - `dashboard` → `IEListsRuntime.initDashboardPage()`
  - `candidates` → `IEListsRuntime.initCandidatesPage()`
  - `job-offers` → `IEListsRuntime.initJobOffersPage()`
  - `applications` → `IEListsRuntime.initApplicationsPage()`
  - `clients` → `IEListsRuntime.initClientsPage()`
  - `profile` → `IEProfileRuntime.initProfileMyActivitySection()`
  - **No branch for `job-postings`.** Job-postings list is initialized by `runtime/job-postings-list-runtime.js` on its own DOMContentLoaded when `pageKey === "job-postings"`.

- **External-submissions:** Not in router’s getPageKey() switch (falls to “unknown”). List page uses `features/external-submissions/external-submissions-list.js` which binds to `[data-ie-external-submissions-body]` and pagination; init is inside the feature, not via page-bootstrap.

- **Entity detail pages:** After bootstrap, the feature script (e.g. `candidate.js`) runs DOMContentLoaded and calls `EntityPageShell.init(CandidateEntityConfig)` if both exist; else legacy `initCandidateProfilePage()`. Same pattern for client, job-offer, application. So entity shell runs **after** page-bootstrap; it does its own auth check and load/render/toolbar/related/activity.

- **Create pages (add-candidate, add-client, add-job-offer):** Use runPageControllers in page-bootstrap (e.g. `IECandidateRuntime.initCandidatePage()` for both `candidate` and `add-candidate`). They do **not** use EntityPageShell; they use the same runtime as detail for form init.

### B.3 Entity page system

- **EntityPageShell** (`core/entity-page/entity-page-shell.js`):  
  - `init(config)`: normalize params (id, mode) from config.route.getPageParams() or URL; if no id, navigate to list and return. Otherwise requireAuth → loadEntity → renderMain → applyMode → mountToolbar → runRelatedSections → mountActivity → reveal.
  - Toolbar is mounted via `window.renderEntityToolbar` (IEToolbar) with lifecycle from config (getStatus, archive, reopen, close for job-offer). Save handler uses config.data.buildSavePayload and performSave.
  - **Create flow:** Shell is not used. Add-* pages have no `id`; they use form runtimes and entity-actions (save) only.

- **Config shape:** entityType, metadata, route (getPageParams, navigateToList, getViewUrl, getEditUrl), fields (editable, mapping), ui (rootId, toolbarContainerId, activityContainerId, renderMain, onNotFound), lifecycle (getStatus, archive, reopen, close), data (loadEntity, buildSavePayload, performSave), mode.apply, related.sections (load/render), save.onSave (candidate only). Candidate has extra bulkActions and save.onSave.

- **Related sections:** Candidate has “associated-offers”; job-offer has “job-offer-applications-pipeline” and “job-offer-public-posting”. Load/render are async; section data is loaded then rendered. Pipeline in job-offer-entity-config contains a full board/list UI and status normalization duplicated from status-runtime.

- **Inconsistency:** Application entity uses IEQueries.applications.getApplicationById and updateApplicationStatus; performSave writes directly via `window.IESupabase.supabase.from('candidate_job_associations').update(...)`. Candidate/client/job-offer use only IESupabase.* methods.

### B.4 List vs detail vs create page model

| Page type   | Example            | List init                         | Detail init                    | Create init                    |
|------------|--------------------|-----------------------------------|--------------------------------|--------------------------------|
| Candidates | candidates.html    | IEListsRuntime.initCandidatesPage | EntityPageShell + candidate.js | runPageControllers (candidate) |
| Clients    | clients.html       | IEListsRuntime.initClientsPage    | EntityPageShell + client.js    | runPageControllers (client)    |
| Job offers | job-offers.html    | IEListsRuntime.initJobOffersPage   | EntityPageShell + job-offer.js | runPageControllers (job-offer) |
| Applications | applications.html | IEListsRuntime.initApplicationsPage | EntityPageShell + application.js | N/A (no add-application)   |
| Job postings | job-postings.html | job-postings-list-runtime (DOMContentLoaded) | job-posting-runtime (job-posting.html) | N/A (create from job-offer) |
| External   | external-submissions.html | external-submissions-list.js (feature) | external-submission.js (feature) | N/A (public form)          |
| Dashboard  | dashboard.html     | IEListsRuntime.initDashboardPage  | —                              | —                             |

Detail and create share the same “entity runtime” (candidate, client, job-offer) for form wiring, but only detail uses EntityPageShell and entity config. Create pages do not go through shell or config for load/save; they use entity-actions and form runtimes.

### B.5 Routing and URL conventions

- **Router (router-runtime):** getPageKey() uses last path segment (e.g. `candidates.html` → `candidates`). No explicit case for `external-submissions.html` (would fall to default/unknown). Protected pages set is a fixed list including `job-posting`, `job-postings`, etc.
- **Navigation:** IERouter.navigateTo(pathOrListKey, idOrParams). redirectToEntityView(entityType, id) uses IEToolbar.getEntityViewUrl(entityType, id). Entity type in router is sometimes `jobOffer` (camelCase), in URLs always `job-offer.html`.
- **listKeyToPath:** candidates → candidates.html, jobOffers/job-offers → job-offers.html, clients → clients.html; others pass through or append .html.
- **Entity view URLs:** Built in entity-toolbar (getEntityViewUrl) and in each entity config (getViewUrl, getEditUrl). Fallbacks are string concatenation (e.g. `candidate.html?id=...`). IEPortal.links (candidateView, offerView, clientView, applicationView) are set in app-shell and used when present.

### B.6 Dashboard and data-transform duplication

- **Dashboard data:** Fetched in `core/data/dashboard.js` (getTotalCandidates, getActiveJobOffers, getNewCandidatesToday, getPendingReviewCount, getHiredThisMonth, getRecentCandidates, getCandidatesBySource, getPendingExternalSubmissionsPreview, getJobOffersWithPostingsForDashboard). IESupabase delegates to IEData.dashboard.
- **Dashboard UI:** `core/lists-runtime.js` initDashboardPage() calls IESupabase.* and sets card values, renderDashboardRecentCandidates, renderDashboardSources, renderLiveOffers, renderExternalSubmissionsPreview. “Live” offers use `window.isEffectiveLive(offer, posting)` (defined in job-posting-deadline or similar). So “effective live” logic can live in more than one place.
- **Lists-runtime** also applies client-side filters (applyCandidateFilters, applyJobOfferFilters, applyClientFilters) and contains inline status normalization (e.g. for candidate list status filter it uses IEStatusRuntime.normalizeProfileStatusFromLegacy; for job offers it uses raw status string). Dashboard “by source” and “recent candidates” are rendered in lists-runtime with their own formatting.

### B.7 Candidate / job / client / application flow inconsistencies

- **Candidate:** Create via add-candidate.html + IECandidateRuntime + IEEntityActionsRuntime.saveCandidate. Detail via EntityPageShell + CandidateEntityConfig; loadCandidateCore (candidate.js) uses IESupabase.getCandidateById; save uses updateCandidate + candidate profile children. Associations: IEQueries.applications.getApplicationsByCandidate used in config related section; renderAssociatedOffers, wireAddApplicationButton. Status: profile status (IEStatusRuntime) vs application status in lists.
- **Client:** Create via add-client + IEClientRuntime + entity-actions saveClient. Detail via EntityPageShell + ClientEntityConfig; IESupabase.getClientById, updateClient. No related sections in config. Simple lifecycle (archive/reopen).
- **Job offer:** Create via add-job-offer + IEJobOfferRuntime + entity-actions saveJobOffer. Detail via EntityPageShell + JobOfferEntityConfig; IESupabase.getJobOfferById (+ client enrichment), updateJobOffer; optional updateJobPosting for public posting block. Related: pipeline (applications) and public posting card. Pipeline uses IEQueries.applications.getApplicationsByJob and updateApplicationStatus; job-offer-entity-config has local normalizeStatus/statusLabel for pipeline. Reopen writes job_offers.status = 'active' (legacy value; see portal-workflow-database-audit).
- **Application:** No create page in portal (applications created via candidate “Add application” or job-offer pipeline). Detail via EntityPageShell + ApplicationEntityConfig; load via IEQueries.applications.getApplicationById; save via direct supabase.from('candidate_job_associations').update. Archive/reopen use IEQueries.applications.updateApplicationStatus. application.js and application-detail.js both contain large amounts of UI and status logic; application-detail.js is used on application.html (detail page).

So: **candidate, client, job-offer** use IESupabase for CRUD and EntityPageShell + config; **application** uses IEQueries for read/status and raw Supabase for notes/rejection_reason update. Application has no IEData.applications used from facade for “update application” in the same way.

---

## C. Duplication and Inconsistency Map

### C.1 Status normalization (repeated logic)

| Domain              | Canonical source (intended)     | Duplicated or local in |
|---------------------|----------------------------------|-------------------------|
| Profile (candidate) | status-runtime (normalizeProfileStatusFromLegacy, PROFILE_STATUS_CANONICAL) | lists-runtime (filter), entity-actions-runtime, candidate.js |
| Application         | status-runtime (normalizeApplicationStatusForDisplay, APPLICATION_STATUS_CANONICAL) | applications.queries.js, applications.js, application-detail.js, job-offer-entity-config.js (pipeline), lists-runtime.js (applications list) |
| Job offer           | status-runtime (normalizeOfferStatus, getOfferStatusBadgeClass) + entity-toolbar (normalizeStatus for lifecycle) | job-offer.js (local normalize), lists-runtime (normalizeJobOfferStatusForList), job-offer-entity-config (pipeline) |
| External submission | No single canonical module       | lists-runtime (external submission table), external-submissions-list.js (formatStatus, getStatusBadgeClass) |
| Availability        | status-runtime (computeDerivedAvailability, computeCandidateAvailability) | candidate-entity-config (deriveAvailabilityFromApplications via IEQueries.candidates) |

### C.2 Source normalization

- **Central:** `core/source-helpers.js` (IESourceRuntime: values, labels, normalizeSource, sourceToLabel).
- **Usage:** Candidate forms and lists; dashboard “by source”. No major duplication of source values/labels elsewhere.

### C.3 Supabase / data access

- **Facade:** core/supabase.js exposes IESupabase.* and delegates to IEData.* (activity, candidates, clients, jobOffers, jobPostings, applications, dashboard).
- **Direct client:** application-entity-config performSave uses `window.IESupabase.supabase.from('candidate_job_associations').update(...)`. searchJobOffersByTitle in supabase.js uses supabase directly. archiveRecord, unarchiveRecord, deletePermanent, deletePermanentRecord in supabase.js use supabase directly (generic table helpers).
- **IEQueries:** applications.queries.js, candidates.queries.js, clients.queries.js, jobOffers.queries.js use IESupabase.supabase (getSupabaseClient()) and build queries. Used by entity configs (application, candidate for availability), runtimes (archived, applications, job-offer pipeline). So two paths: IESupabase.* for most CRUD vs IEQueries.* for complex reads and some updates (application status).

### C.4 Repeated UI patterns

- **Entity “not found”:** Client and application entity configs implement onNotFound with same structure (root innerHTML = card with title, message, “Back to list” button). Candidate uses renderNotFound from candidate.js.
- **Table row building:** lists-runtime builds rows for candidates, job offers, clients, applications, external submissions with similar patterns (create tr, td, badges, links, click handlers). No shared “table row factory” or component.
- **Badge classes:** status-runtime exposes get*BadgeClass; lists and entity configs sometimes use the same, sometimes local badge class maps (e.g. external-submissions-list.js, job-offer-entity-config pipeline).
- **Date formatting:** Lists-runtime and job-postings-list-runtime and external-submissions-list each have local formatDate (it-IT or en-GB). No shared date formatter.
- **Escape HTML:** window.escapeHtml used in places; not always present or consistent.

### C.5 Router / page key / header inconsistencies

- **external-submissions** not in getPageKey() switch → resolves to "unknown". Still protected. Header and dashboard link to external-submissions.html.
- **settings** is in PROTECTED_PAGES and getPageKey (settings.html/settings.htm) but there is no settings.html in the repo.
- **client** page key: router returns "client" for client.html; runPageControllers in page-bootstrap use "client" and "add-client" for IEClientRuntime.initClientPage. Consistent.
- Breadcrumbs and nav labels in header-runtime.js are maintained separately from router page keys; adding a new page requires updating both.

---

## D. File-by-File Refactor Classification

Classification key: **KEEP** | **KEEP BUT MOVE** | **KEEP BUT REFACTOR** | **MERGE** | **SPLIT** | **DELETE** | **LEGACY/DEPRECATE**

### HTML (entry points)

| File                     | Classification   | Notes |
|--------------------------|------------------|--------|
| index.html               | KEEP            | Login; minimal scripts. |
| dashboard.html           | KEEP            | Entry for dashboard list. |
| candidates.html          | KEEP            | List page. |
| candidate.html           | KEEP            | Detail/create (no id => redirect). |
| add-candidate.html       | KEEP            | Create form. |
| clients.html             | KEEP            | List. |
| client.html              | KEEP            | Detail. |
| add-client.html          | KEEP            | Create. |
| job-offers.html          | KEEP            | List. |
| job-offer.html           | KEEP            | Detail. |
| add-job-offer.html       | KEEP            | Create. |
| job-postings.html        | KEEP            | List (separate init). |
| job-posting.html         | KEEP            | Detail (posting). |
| applications.html        | KEEP            | List. |
| application.html         | KEEP            | Detail. |
| external-submissions.html| KEEP            | List. |
| external-submission.html | KEEP            | Detail. |
| archived.html            | KEEP            | Archived entities list. |
| profile.html             | KEEP            | User profile. |
| forgot-password.html     | KEEP            | Auth. |
| reset-password.html      | KEEP            | Auth. |

### Core

| File                     | Classification   | Notes |
|--------------------------|------------------|--------|
| core/router.js           | KEEP BUT REFACTOR| Add job-postings/list key consistency; consider single getEntityViewUrl from one place. |
| core/supabase.js         | KEEP BUT REFACTOR| Thin facade only; move any remaining direct query logic to data or queries. |
| core/supabase-client.js  | KEEP            | Single client init. |
| core/auth.js             | KEEP            | Auth API. |
| core/session-ready.js    | KEEP            | Session ready promise. |
| core/source-helpers.js   | KEEP            | Single source of truth for source. |
| core/entity-toolbar.js   | KEEP BUT REFACTOR| Rely on status-runtime for offer status; keep only toolbar UI and getEntityViewUrl. |
| core/entity-page/entity-page-shell.js | KEEP | Central entity detail flow. |
| core/entity-page/entity-field-mapper.js | KEEP | Field collection for edit. |
| core/app-shell.js        | KEEP BUT REFACTOR| Shrink to auth guard + bootstrap trigger; move initDataViews into page-bootstrap or lists; move save handlers to entity-actions only. |
| core/lists-runtime.js    | SPLIT           | Split into: dashboard-runtime, candidates-list-runtime, job-offers-list-runtime, clients-list-runtime, applications-list-runtime (or one lists-runtime that delegates), plus shared list helpers (filters, table row, status/date format). |
| core/debug.js            | KEEP            | Debug flag. |
| core/job-posting-deadline.js | KEEP        | Deadline and isEffectiveLive. |
| core/session/session.js | KEEP            | Session. |
| core/ui/modals.js        | KEEP            | Modals. |
| core/ui/previews.js      | KEEP            | Previews. |
| core/data/activity.js    | KEEP            | IEData.activity. |
| core/data/applications.js| KEEP            | IEData.applications. |
| core/data/candidates.js  | KEEP            | IEData.candidates. |
| core/data/clients.js     | KEEP            | IEData.clients. |
| core/data/dashboard.js   | KEEP            | IEData.dashboard. |
| core/data/job-offers.js  | KEEP            | IEData.jobOffers. |
| core/data/job-postings.js| KEEP            | IEData.jobPostings. |

### Runtime

| File                           | Classification   | Notes |
|--------------------------------|------------------|--------|
| runtime/router-runtime.js      | KEEP BUT REFACTOR| Add external-submissions (and job-postings if missing) to getPageKey; align with header. |
| runtime/page-bootstrap.js      | KEEP BUT REFACTOR| Add job-postings to runDataViews (call init from job-postings-list-runtime or unified list registry). |
| runtime/status-runtime.js      | KEEP            | Single source for status normalization and badges; extend for external submission status if needed. |
| runtime/header-runtime.js      | KEEP            | Header and breadcrumbs. |
| runtime/bottom-nav-runtime.js  | KEEP            | Bottom nav. |
| runtime/forms-runtime.js       | KEEP            | Form init. |
| runtime/modals-runtime.js      | KEEP            | Modals init. |
| runtime/filter-drawer-runtime.js | KEEP          | Filter drawer. |
| runtime/associations-runtime.js| KEEP BUT REFACTOR| Use status-runtime only for status; reduce duplication. |
| runtime/entity-actions-runtime.js | KEEP         | Save/create actions. |
| runtime/candidate-runtime.js    | KEEP BUT REFACTOR| Rely on status-runtime for profile status. |
| runtime/candidate-profile-runtime.js | KEEP     | Profile sections. |
| runtime/candidate-import-runtime.js | KEEP      | JSON import. |
| runtime/client-runtime.js       | KEEP            | Client page controller. |
| runtime/job-offer-runtime.js    | KEEP BUT REFACTOR| Use status-runtime and shared normalize; remove local normalizeJobOfferStatus. |
| runtime/job-posting-runtime.js  | KEEP            | Job posting detail. |
| runtime/job-postings-list-runtime.js | KEEP BUT MOVE | Move list init into shared list bootstrap (runDataViews) or keep but call from bootstrap for job-postings. |
| runtime/profile-runtime.js     | KEEP            | Profile. |
| runtime/global-header-actions-runtime.js | KEEP   | Header actions. |

### Features

| File                                      | Classification   | Notes |
|-------------------------------------------|------------------|--------|
| features/candidates/candidate.js          | KEEP BUT REFACTOR| Rely on status-runtime; keep EntityPageShell + legacy fallback. |
| features/candidates/candidate-entity-config.js | KEEP       | Config for shell. |
| features/clients/client.js                | KEEP            | Client init + shell. |
| features/clients/client-entity-config.js  | KEEP            | Config. |
| features/job-offers/job-offer.js          | KEEP BUT REFACTOR| Remove local status normalize; use status-runtime. |
| features/job-offers/job-offer-entity-config.js | KEEP BUT REFACTOR | Pipeline: use IEStatusRuntime for application status labels/badges; remove local normalizeStatus/statusLabel. |
| features/applications/application.js      | KEEP BUT REFACTOR| Use status-runtime only; consider merging with application-detail.js. |
| features/applications/application-detail.js | KEEP BUT REFACTOR | Same; use status-runtime; consider merge with application.js. |
| features/applications/applications.js     | KEEP BUT REFACTOR| List/pipeline helpers; use status-runtime. |
| features/applications/application-entity-config.js | KEEP | Unify save path (IESupabase or IEQueries) instead of raw supabase. |
| features/archived/archived.js            | KEEP            | Archived page. |
| features/profile/profile.js              | KEEP            | Profile page. |
| features/external-submissions/*.js        | KEEP BUT REFACTOR| Centralize submission status in status-runtime; shared formatDate/escape. |

### Queries

| File                        | Classification   | Notes |
|-----------------------------|------------------|--------|
| queries/applications.queries.js | KEEP BUT REFACTOR | Single normalizeStatus; consider re-export from status-runtime. |
| queries/candidates.queries.js   | KEEP            | Used for availability etc. |
| queries/clients.queries.js      | KEEP            | |
| queries/jobOffers.queries.js   | KEEP            | |

### Shared / layout / components / styles

| File / dir              | Classification | Notes |
|-------------------------|----------------|--------|
| shared/header-loader.js| KEEP           | |
| shared/activity-section.js | KEEP        | |
| layout/*.html           | KEEP           | |
| components/page-header.js | KEEP         | |
| styles/*                | KEEP           | |

### Docs and migrations

| File / dir        | Classification   | Notes |
|-------------------|------------------|--------|
| portal/docs/*.md  | LEGACY/DEPRECATE (select) | Keep BOOTSTRAP-AND-SCRIPTS, SECURITY-AUDIT-REPORT, pipeline-statuses, application-lifecycle, recruitment-flow, ats-navigation-rules; archive or merge others into a single “audits” or “decisions” doc. |
| portal/migrations/*.sql | KEEP   | Do not delete; version and document. |

---

## E. Proposed Target Architecture

### E.1 Recommended folder structure

```
portal/
├── index.html, dashboard.html, [all existing HTML]
├── core/                      # Infrastructure only
│   ├── router.js
│   ├── supabase-client.js
│   ├── supabase.js            # Thin facade → data + queries
│   ├── auth.js
│   ├── session-ready.js
│   ├── session/
│   ├── source-helpers.js
│   ├── job-posting-deadline.js
│   ├── debug.js
│   ├── entity-toolbar.js      # Toolbar UI + getEntityViewUrl only
│   ├── entity-page/
│   │   ├── entity-page-shell.js
│   │   └── entity-field-mapper.js
│   ├── data/                  # IEData.* (unchanged)
│   ├── ui/                    # modals, previews
│   └── migrations/
├── runtime/                   # All runtime and list logic
│   ├── bootstrap/
│   │   ├── router-runtime.js
│   │   ├── page-bootstrap.js
│   │   └── (optional) list-registry.js  # pageKey → initList
│   ├── status-runtime.js      # Single status + source display API
│   ├── lists/                 # Split from current lists-runtime
│   │   ├── dashboard.js       # initDashboardPage + dashboard render
│   │   ├── candidates-list.js
│   │   ├── job-offers-list.js
│   │   ├── clients-list.js
│   │   ├── applications-list.js
│   │   ├── job-postings-list.js
│   │   ├── external-submissions-list.js  # moved from feature or kept in feature
│   │   └── shared-list-helpers.js         # filters, formatDate, escapeHtml, row factory
│   ├── header-runtime.js, bottom-nav-runtime.js
│   ├── forms-runtime.js, modals-runtime.js, filter-drawer-runtime.js
│   ├── associations-runtime.js, entity-actions-runtime.js
│   ├── candidate-runtime.js, candidate-profile-runtime.js, candidate-import-runtime.js
│   ├── client-runtime.js, job-offer-runtime.js, job-posting-runtime.js
│   ├── profile-runtime.js, global-header-actions-runtime.js
│   └── ...
├── queries/                   # IEQueries.* – complex reads + updates
│   ├── applications.queries.js
│   ├── candidates.queries.js
│   ├── clients.queries.js
│   └── jobOffers.queries.js
├── features/                  # Entity-specific UI + config only
│   ├── candidates/
│   ├── clients/
│   ├── job-offers/
│   ├── applications/
│   ├── archived/
│   ├── profile/
│   └── external-submissions/
├── shared/
├── components/
├── layout/
├── styles/
└── docs/                      # Consolidated: REFACTOR-AUDIT, BOOTSTRAP, SECURITY, decisions
```

Optional: move `core/lists-runtime.js` (after split) into `runtime/lists/` and keep a single entry that delegates (e.g. IEListsRuntime.initCandidatesPage → candidates-list.init).

### E.2 Responsibilities by folder

- **core:** Router, Supabase client and facade, auth, session, source helpers, entity-page shell and field mapper, entity toolbar (UI + URL builder), data modules (IEData.*), UI primitives (modals, previews). No page-specific list or dashboard rendering.
- **runtime:** Page key and protected pages; bootstrap (auth, header, page initializers, data views); **single** status/source display API; list init and rendering (dashboard, candidates, job-offers, clients, applications, job-postings, optionally external-submissions); form/modals/filter/associations/entity-actions; entity runtimes (candidate, client, job-offer, job-posting, profile). All list init goes through one path (runDataViews or list registry).
- **queries:** Complex Supabase queries and updates used by entity configs and runtimes; no UI. Applications, candidates, clients, job offers. Prefer one data path: either facade wraps queries or queries are the only path for those domains; avoid mixing raw supabase in entity configs.
- **features:** Entity-specific entry (DOMContentLoaded → EntityPageShell.init(config) or legacy), entity config object, and any entity-specific UI (e.g. pipeline board in job-offer). No duplicate status/source logic; call runtime/status and runtime/lists helpers.

### E.3 Shared / default components to create

- **Status/badge API:** Already in status-runtime; extend with external submission status and ensure all lists and entity UIs use it (get*BadgeClass, format*Label, normalize*).
- **Date formatter:** Single `formatDate(value, options)` in shared or runtime (e.g. shared/format.js or runtime/shared-list-helpers.js) used by all lists and forms.
- **Escape HTML:** Single `window.escapeHtml` or shared util, guaranteed to be loaded before any list that builds HTML.
- **Table row factory (optional):** Shared helper that takes (row, columns, options) and returns `<tr>` for list tables to reduce duplication in lists-runtime and job-postings-list and external-submissions-list.
- **“Not found” card:** Shared function renderEntityNotFound(rootId, entityLabel, listUrl) used by client and application (and candidate if desired) in entity configs.

### E.4 Entity-specific modules to keep

- features/candidates (candidate.js, candidate-entity-config.js)
- features/clients (client.js, client-entity-config.js)
- features/job-offers (job-offer.js, job-offer-entity-config.js)
- features/applications (application.js, application-detail.js, application-entity-config.js; applications.js for list helpers)
- features/archived, features/profile
- features/external-submissions (API, formatters, list, detail)

Entity configs stay; only their implementation of load/save/status should use shared data and status layers.

### E.5 Files to remove (after migration)

- None “delete” without replacement. Legacy code paths (e.g. initCandidateProfilePage fallback) can be deprecated once EntityPageShell path is the only path. Remove duplicate status/format helpers after centralizing in status-runtime and shared-list-helpers. Old docs can be archived (moved to docs/archive/ or merged).

### E.6 Migration path (phases)

**Phase 1 – Status and format consolidation (low risk)**  
- Add external submission status to status-runtime (normalize, badge, label).  
- Replace all local normalizeStatus/formatStatus/getStatusBadgeClass in lists and features with IEStatusRuntime (and shared formatDate/escapeHtml where missing).  
- Leave file layout as-is; only change call sites.

**Phase 2 – List init unification**  
- Add `job-postings` to page-bootstrap runDataViews: call the same init that job-postings-list-runtime currently runs (extract initJobPostingsListPage and call it from runDataViews when pageKey === 'job-postings'). Optionally add `external-submissions` to getPageKey and runDataViews and call external-submissions list init from bootstrap.  
- One list init path for all list pages.

**Phase 3 – Split lists-runtime**  
- Extract dashboard, each list (candidates, job-offers, clients, applications), and shared list helpers from core/lists-runtime.js into runtime/lists/* (or keep one file that requires submodules).  
- Update page-bootstrap (or list registry) to call the new init functions.  
- Preserve behavior; no change to HTML or entity configs.

**Phase 4 – Data path and app-shell**  
- Unify application save: use IEData.applications or IEQueries for update (notes, rejection_reason) instead of raw supabase in application-entity-config.  
- Reduce app-shell to auth guard + bootstrap trigger; move initDataViews into page-bootstrap if not already; ensure all save handlers go through entity-actions or entity config performSave only.

**Phase 5 – Router and entity URLs**  
- Add external-submissions (and any missing pages) to router getPageKey.  
- Single place for entity view/edit URLs (e.g. IEToolbar.getEntityViewUrl + config getViewUrl/getEditUrl delegating to it).  
- Create settings.html or remove settings from router/header.

**Phase 6 – Docs and cleanup**  
- Archive or merge portal/docs into a small set (e.g. REFACTOR-AUDIT, BOOTSTRAP, SECURITY, decisions).  
- Remove deprecated fallbacks (e.g. legacy initCandidateProfilePage) when shell path is default everywhere.

---

## F. Step-by-Step Refactor Plan

1. **Status and format (Phase 1)**  
   - In status-runtime, add external submission status (values, normalize, badge, label).  
   - In shared or runtime, add formatDate and ensure escapeHtml is loaded early.  
   - Replace in: lists-runtime (external submission table), external-submissions-list.js, applications.js, application-detail.js, job-offer-entity-config.js (pipeline), applications.queries.js (normalize only), entity-toolbar (use status-runtime for offer).  
   - Test: dashboard, all lists, candidate/client/job-offer/application detail, job-offer pipeline, external submissions list/detail.

2. **List init (Phase 2)**  
   - In page-bootstrap runDataViews, add case `job-postings`: call initJobPostingsListPage (move or re-export from job-postings-list-runtime).  
   - Optionally: add getPageKey case for external-submissions; add runDataViews case and call external-submissions list init.  
   - In job-postings-list-runtime, remove duplicate DOMContentLoaded init when pageKey === 'job-postings' if bootstrap now calls it (or keep DOMContentLoaded and have it call same function).  
   - Test: job-postings list, external-submissions list.

3. **Split lists-runtime (Phase 3)**  
   - Create runtime/lists/ (or equivalent) and files: dashboard.js, candidates-list.js, job-offers-list.js, clients-list.js, applications-list.js, job-postings-list.js (if not already separate), shared-list-helpers.js.  
   - Move dashboard init and render from core/lists-runtime.js to runtime/lists/dashboard.js.  
   - Move each list’s init and render to corresponding file; shared filter/format/row logic to shared-list-helpers.js.  
   - Keep IEListsRuntime as a single export that delegates to these modules (or require each script and assign to IEListsRuntime).  
   - Update HTML script order to load new list modules.  
   - Test: dashboard, every list page, filters, pagination.

4. **Data path and app-shell (Phase 4)**  
   - In application-entity-config performSave, use IESupabase (add updateApplication or similar to facade → IEData.applications or IEQueries) instead of raw supabase.from('candidate_job_associations').update.  
   - Move any remaining initDataViews from app-shell to page-bootstrap if still there.  
   - Ensure save flows use only entity-actions and entity config performSave.  
   - Test: application detail save, all create flows (candidate, client, job-offer).

5. **Router and URLs (Phase 5)**  
   - Add external-submissions (and job-postings if not in switch) to router-runtime getPageKey.  
   - Add settings.html or remove “settings” from protected pages and header.  
   - Document and use single getEntityViewUrl/getEditUrl from entity-toolbar; entity configs call that.  
   - Test: navigation from lists to detail, breadcrumbs, header links.

6. **Docs and cleanup (Phase 6)**  
   - Create docs/archive/; move superseded audits/plans.  
   - Keep BOOTSTRAP-AND-SCRIPTS, SECURITY-AUDIT-REPORT, pipeline-statuses, application-lifecycle, recruitment-flow, ats-navigation-rules; add this REFACTOR-AUDIT.  
   - Remove legacy init fallbacks once EntityPageShell is default on all entity pages.  
   - Test: full regression (login, dashboard, all lists, all detail and create pages, external submissions, archived, profile).

---

## G. Risks and Regression Warnings

- **Script order:** Refactor must preserve load order (supabase-client → data → supabase → auth → router-runtime → … → features). Changing list script location can break IEListsRuntime or IEData.
- **Global namespace:** Many modules assume window.IESupabase, window.IEStatusRuntime, etc. Renaming or moving scripts without updating every reference will cause “X is undefined” at runtime.
- **Session and auth:** Multiple call sites still call getSession() or checkAuth(). Changing bootstrap or guard order can cause redirect loops or missing profile on protected pages.
- **Application save:** Switching from raw supabase update to IEData/IEQueries must preserve RLS and column set (notes, rejection_reason). Test with real DB.
- **Job offer reopen:** Currently sets status to `'active'`; DB and status-runtime treat `active` and `open` similarly. If DB is migrated to only `open`, reopen must be updated in job-offer-entity-config (and any job-offer runtime) to set `open`.
- **Activity logs:** Portal-workflow-database-audit notes that application-scoped activity_logs (entity_type = 'application') are rejected by DB constraints. Refactor should not rely on application activity log writes until schema is extended or logging strategy is changed.
- **Lists-runtime split:** The file is very large; split carefully so filter state and pagination are not broken. Prefer one init entry point (IEListsRuntime.init*Page) that delegates to submodules.
- **Regression testing:** After each phase, run: login → dashboard → every list (candidates, clients, job-offers, applications, job-postings, external-submissions, archived) → every detail (candidate, client, job-offer, application, job-posting, external-submission) → every create (add-candidate, add-client, add-job-offer) → profile → logout. Check filters, pagination, save, and status changes (application pipeline, job offer close/reopen, candidate profile status).

---

**End of audit.** No code changes were made; this document is for planning only.
