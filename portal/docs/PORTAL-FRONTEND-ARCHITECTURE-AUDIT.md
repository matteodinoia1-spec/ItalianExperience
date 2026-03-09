# Portal Frontend Architecture Audit

**Date:** March 7, 2025  
**Scope:** `portal/` — modular vanilla JavaScript web application with Supabase backend  
**Goal:** Evaluate performance, architectural quality, maintainability, and developer comprehensibility. No code was modified.

**Global header (search + Add):** See [PORTAL-GLOBAL-HEADER-SEARCH-ADD-PLAN.md](PORTAL-GLOBAL-HEADER-SEARCH-ADD-PLAN.md) for implementation progress and phases.

**Note (post bottom-nav and toolbar removal):** Shell architecture: header = full width, nav left (shell padding), user right; desktop/tablet = header nav + user menu, footer with breadcrumbs (full width, shell padding; breadcrumbs left aligned, vertically centered); mobile = header shows page title, bottom nav primary, footer hidden (no breadcrumbs). No sidebar, hamburger, or top toolbar; page actions and filters live in content (`.page-list-actions`, `.page-detail-actions`, `.page-form-actions`, `.page-filters-column`). `header-loader.js` mounts header, bottom nav, and footer; dispatches `ie:header-loaded` once. `page-bootstrap.js` runs header init, page initializers, then dynamically loads and initializes `bottom-nav-runtime.js`. No `layout-runtime.js`, `sidebar-runtime.js`, or toolbar runtime; no `toolbar.css` or `--portal-toolbar-height`. Sticky filter column uses `top: calc(var(--portal-header-height) + var(--portal-safe-top))`. `forms-runtime.js` only uses `[data-entity-mode-indicator]` for mode labels.

---

## SECTION 1 — Runtime performance

### JS loading analysis

- **Blocking script waterfall:** Every protected portal page (e.g. `dashboard.html`, `application.html`, `candidates.html`) loads **25–30+ script tags** in order. All are synchronous and blocking. No `async`/`defer` or bundling; the browser parses and executes them sequentially. Tailwind is loaded from CDN; Supabase from CDN; then ~20+ local modules (core, runtime, components, shared, features).
- **No code splitting:** The same large set of runtime modules is loaded on every protected page regardless of whether the page needs them (e.g. `candidate-profile-runtime.js`, `job-offer-runtime.js`, `client-runtime.js` load on dashboard and all list/detail pages).
- **CDN variance:** `index.html` uses `@supabase/supabase-js@2` (pinned); other pages use `@supabase/supabase-js` (unpinned). Version drift and cache behavior can differ.
- **Duplicate script lists:** Script order and presence differ by page. Example: `candidate.html` omits `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` that `candidates.html` and `application.html` include. This is inconsistent and causes missing behavior on the candidate detail page (see Section 4).

**Files:** All `portal/*.html` (e.g. `application.html` lines 224–254, `dashboard.html` 143–170, `candidate.html` 283–309).

### Runtime initialization flow

1. **Parse-time:** `core/app-shell.js` runs at load and immediately calls `window.IERouterRuntime.getPageKey()` (line 15) to set `pageKey` and decide if the page is protected. It then creates `window.__IE_AUTH_GUARD__` (promise) which calls `ensureSupabaseSessionReady()` (which calls `getSession()`) and then `IEAuth.checkAuth()` (which again uses session).
2. **DOMContentLoaded:**  
   - `shared/header-loader.js` registers `loadPortalHeader()` which fetches `layout/header.html` and dispatches `ie:header-loaded`.  
   - `app-shell.js`’s listener runs and calls `IEPageBootstrap.init(currentPageKey)`.
3. **Page bootstrap (`runtime/page-bootstrap.js`):**  
   - Calls `IEModalsRuntime.initGlobalModals()` and `IEEntityActionsRuntime.init()`.  
   - Awaits `__IE_AUTH_GUARD__`.  
   - For protected pages: `IEProfileRuntime.loadCurrentUserProfile()` (uses `getSessionReady()` when available), then `initInactivityTimer()`.  
   - Then `IEHeaderRuntime.initHeader(pageKey)`, then `runPageInitializers(pageKey)` (back button, buttons, forms, page controllers, data views).  
   - Finally `ensureBottomNavRuntimeLoaded()` (dynamically loads `runtime/bottom-nav-runtime.js`), then `IEBottomNavRuntime.initBottomNav(pageKey)`.

**Observation:** Session/auth is consolidated via `IESessionReady.getSessionReady()`; guard and bootstrap reuse it. Shell no longer loads sidebar or layout runtime; bootstrap runs header init then bottom-nav init.

### Potential duplicate listeners

- **Layout/sidebar (removed):** `layout-runtime.js` and `sidebar-runtime.js` no longer exist. Shell initialization is: header-loader mounts header + bottom nav + footer → `ie:header-loaded`; page-bootstrap runs header init, page initializers, then loads and runs bottom-nav-runtime. No duplicate layout or sidebar init.  
  **Files:** `portal/shared/header-loader.js`, `portal/runtime/page-bootstrap.js`, `portal/runtime/bottom-nav-runtime.js`.

- **initGlobalModals:** Called once from page-bootstrap; `hasInitializedGlobalModals` in `modals-runtime.js` is set but the flag is not used to short-circuit. Confirmed single call path; no duplicate if bootstrap runs once.

- **IEEntityActionsRuntime.init():** Uses `listenersBound` to bind delegated handlers once; safe.

### Potential duplicate Supabase queries

- **Session:** `getSession()` (and thus Supabase `auth.getSession()`) is invoked in many code paths: `app-shell.js` (`ensureSupabaseSessionReady`), `core/auth.js` (`checkAuth` → `getSession`), `page-bootstrap.js` (optional `checkAuth` in several branches), `profile-runtime.js` (`loadCurrentUserProfile` → `getSession`), `activity-section.js`, `applications.queries.js`, `profile.js`, `candidate.js`, etc. On a single page load, **multiple session fetches** can occur before and during bootstrap.
- **Dashboard:** `core/lists-runtime.js`’s `initDashboardPage()` uses `Promise.all()` with six API calls (`getTotalCandidates`, `getActiveJobOffers`, `getNewCandidatesToday`, `getHiredThisMonth`, `getRecentCandidates`, `getCandidatesBySource`). Each of these in `core/supabase.js` typically calls `getSession()` for audit/user context. So dashboard triggers **at least 6 data queries plus multiple session reads**; no request deduplication for session.
- **Profile:** `loadCurrentUserProfile()` runs on every protected page and fetches profile; additional features (e.g. profile page, activity section) may trigger further profile/session usage. No shared in-memory “current user” used across modules; each layer may call session again.

**Files:** `portal/core/supabase.js` (getSession, dashboard helpers), `portal/core/auth.js`, `portal/runtime/page-bootstrap.js`, `portal/runtime/profile-runtime.js`, `portal/core/lists-runtime.js`.

### Possible slow operations

- **Synchronous script chain:** 25+ scripts block parsing/execution. Largest files include `core/supabase.js` (~4,032 lines), `core/lists-runtime.js` (~1,759 lines), `features/applications/application-detail.js` (~1,126 lines), `features/candidates/candidate.js` (~1,219 lines), `runtime/associations-runtime.js` (~1,245 lines). No lazy loading; all run on every full page load.
- **Sequential async bootstrap:** After DOMContentLoaded, `loadPortalHeader()` fetches header, footer, and bottom-nav HTML and dispatches `ie:header-loaded`. Bootstrap awaits auth guard → profile load → header init → page initializers → then dynamically loads bottom-nav-runtime and runs `initBottomNav()`. Shell is one loader (header + footer + bottom-nav); no separate sidebar fetch.
- **Heavy DOM in lists:** `lists-runtime.js` builds table rows with inline HTML strings and many `querySelector`/`querySelectorAll` calls; no virtual list or pagination at the data layer for very large result sets (pagination is UI-only with fixed page sizes).
- **No caching:** Supabase responses are not cached in memory; revisiting the same list or dashboard refetches everything.

---

## SECTION 2 — Architecture quality

### Module responsibility clarity

- **Clear:** `runtime/router-runtime.js` (page key, protected pages), `core/router.js` (navigation helpers), `runtime/page-bootstrap.js` (orchestration), `core/auth.js` (auth API), `queries/*.queries.js` (query builders). Naming and comments make intent visible.
- **Blurred:**  
  - **core/app-shell.js** (~893 lines) still holds layout (back button, initButtons), file upload UI (renderCandidateFileState, handleCandidateFileChange), modal/open wrappers, link builders, and many `IEPortal.*` / `IE*Helpers` compatibility wrappers. Comments say logic was “moved to runtime” but app-shell remains the central wiring point and defines `IEPageBootstrapHelpers`, `IEFormsRuntimeHelpers`, `IEAssociationsRuntimeHelpers`, etc. So “core” is both bootstrap trigger and a large compatibility layer.  
  - **core/supabase.js** (~4,032 lines) mixes auth, session, audit helpers, and **all** entity CRUD and list APIs (candidates, job offers, clients, applications, activity, dashboard stats, storage). No split between “auth”, “data access”, and “entity services”; one giant module.  
  - **core/lists-runtime.js** (~1,759 lines) lives under `core/` but is “lists & dashboard runtime” (filtering, rendering, pagination, dashboard, entity rows). Name and location suggest “core” while behavior is “runtime”; responsibility overlaps with “data views” and “UI rendering.”

### Dependency graph problems

- **Global namespace coupling:** Modules communicate via `window.*` (e.g. `window.IERouterRuntime`, `window.IESupabase`, `window.IEAuth`, `window.IEPortal`, `window.IEFormsRuntime`, `window.IEListsRuntime`, …). There is no explicit dependency list; load order is enforced only by script order in HTML. Refactoring or reordering scripts can break at runtime with “X is undefined.”
- **Bidirectional reliance:** app-shell exposes helpers that call into runtime modules (e.g. `IEEntityActionsRuntime.saveCandidate`), and runtime modules call back into app-shell-originated globals (e.g. `IEPageBootstrapHelpers.initBackButton`). So core ↔ runtime dependencies are two-way; no clear “core depends on runtime” or “runtime depends on core” layering.
- **Queries vs core:** `queries/applications.queries.js` (and similar) are loaded only on some pages (e.g. application, archived). They depend on `window.IESupabase` and sometimes `getSession()`. So “queries” depend on “core/supabase”; core does not depend on queries. That direction is clear, but the fact that only certain HTML files include certain query scripts makes the dependency graph page-dependent and easy to break when adding new pages.

### Circular dependencies

- No strict circular **module load** (script A loads B, B loads A) because everything is script tags and there are no ES modules. There are, however, **logical circles**:  
  - app-shell registers `IEPageBootstrapHelpers` which include `initBackButton`, `initButtons`, `initDataViews`; page-bootstrap calls these and also calls runtime inits; runtimes and features use `IEPortal.*` and other globals defined in app-shell. So: app-shell → page-bootstrap → runtimes → (often) app-shell globals.  
  - `IEHeaderRuntime.initHeader` is called from page-bootstrap; header-runtime’s listener on `ie:header-loaded` updates breadcrumbs and header nav. Page-bootstrap then loads bottom-nav-runtime and runs initBottomNav(); no layout or sidebar runtime.

### Oversized modules

- **core/supabase.js** — ~4,032 lines, 108+ `.from(`/`.select(`-style calls. Single point of change for all Supabase data access; hard to navigate and test in isolation.  
- **core/lists-runtime.js** — ~1,759 lines. Dashboard, candidates/job-offers/clients lists, filters, pagination, entity row rendering, and shared table wiring. Should likely be split (e.g. dashboard vs list views vs shared table helpers).  
- **runtime/associations-runtime.js** — ~1,245 lines. Inline associations, badges, modals, job-offer association UI.  
- **runtime/entity-actions-runtime.js** — ~760 lines. Create/update for candidate, job offer, client; form handling; original-status state.  
- **features/candidates/candidate.js** — ~1,219 lines. Candidate detail page behavior.  
- **features/applications/application-detail.js** — ~1,126 lines. Application detail page behavior.

Small, focused modules: `router-runtime.js`, `auth.js`, `router.js`, `page-bootstrap.js`, `bottom-nav-runtime.js`, `debug.js`.

### Missing abstractions

- **Session/user context:** No single “session ready” or “current user” service. Many modules call `getSession()` or `checkAuth()` independently; no shared cache or event (“session ready”) that others subscribe to.
- **Data layer:** Supabase calls are spread across `core/supabase.js`, `queries/*.queries.js`, and occasional inline calls in features. No repository or data-access facade per entity; no clear place to add caching, retries, or request deduplication.
- **Page contract:** No shared “page lifecycle” (e.g. init → load data → render → teardown). page-bootstrap orchestrates by page key and switches, but each page type is a separate branch; adding a new page requires editing multiple switch statements (page-bootstrap, and possibly app-shell).
- **Config:** Supabase URL/key and feature flags are hardcoded in `core/supabase.js` and elsewhere; no single config object or environment-based setup.

---

## SECTION 3 — Developer comprehension

### Entry points clarity

- **HTML as entry:** Each page is a different HTML file; the “entry” for a given screen is the corresponding `.html` file. There is no single documented “app entry” (e.g. “start at index.html for login, dashboard.html for app home”).
- **JS entry:** The effective JS entry for protected pages is the **order of scripts** in that HTML file. The logical flow starts with `router-runtime.js` (page key) and `app-shell.js` (auth guard + DOMContentLoaded → `IEPageBootstrap.init`). This is not documented in a single place; a new developer must trace script order and then `page-bootstrap.js` to see the pipeline.
- **Feature entry:** Feature scripts (e.g. `features/candidates/candidate.js`, `features/applications/application-detail.js`) are loaded last on their pages and typically run on DOMContentLoaded or when the page key matches. They are not invoked by a central registry; they rely on globals and sometimes self-invoke. So “where does the candidate page start?” requires opening both the HTML script list and the feature file.

### Naming quality

- **Consistent:** `IERouter`, `IERouterRuntime`, `IESupabase`, `IEAuth`, `IEHeaderRuntime`, `IEPageBootstrap`, etc. The `IE` prefix and `Runtime` suffix help distinguish globals. `*-runtime.js` and `*.queries.js` naming is clear.
- **Inconsistent:**  
  - “lists-runtime” lives under `core/` (core/lists-runtime.js), not `runtime/`.  
  - Mix of “job-offer” (kebab) and “jobOffer” (camel) in page keys, URLs, and code.  
  - Some legacy names (e.g. “candidato”, “clienti”, “archiviati”) appear in comments or UI strings; docs refer to both Italian and English.
- **Ambiguous:** `IEPageBootstrapHelpers` vs `IEPageBootstrap` (one is the orchestration API, one is the set of callbacks). `IEFormsRuntimeHelpers` vs `IEFormsRuntime`. New developers must infer which is “the runtime” and which is “helpers for the runtime.”

### Discoverability of features

- **Directory layout:** `features/` contains `applications/`, `archived/`, `candidates/`, `profile/`. Each has one or more JS files. Easy to find “candidate” or “application” feature by name.
- **Wiring is implicit:** Which HTML page loads which feature script is not centralized. To know “what runs on application.html” you must open `application.html` and scan script tags. No `docs/` file maps “Page → Scripts” or “Feature → Pages.”
- **Bootstrap switch:** Page-specific behavior is gated by `pageKey` in `page-bootstrap.js` (e.g. `runFormInitializers`, `runPageControllers`, `runDataViews`). Discovering “what runs for candidate page” requires reading that file and following the switches.

### Documentation coverage

- **Existing docs** (in `portal/docs/`): `AUDIT-REPORT.md`, `LAYOUT-AUDIT.md`, `SECURITY-AUDIT-REPORT.md`, `STATUS-AUDIT.md`, `application-lifecycle.md`, `pipeline-statuses.md`, `recruitment-flow.md`, `ats-navigation-rules.md`, `ATS-PRE-IMPLEMENTATION-VERIFICATION.md`, `VERIFICATION-REPORT.md`, `TRANSLATION-SUMMARY.md`. These cover security, layout, statuses, and business rules, not frontend architecture or module roles.
- **Missing:**  
  - No README in `portal/` describing the app, how to run it, or the high-level architecture.  
  - No document describing script load order, bootstrap sequence, or the role of core vs runtime vs features.  
  - No map of “which page loads which scripts” or “which globals are required when.”  
  - Inline comments in `page-bootstrap.js` and `app-shell.js` help but are scattered; no single “architecture” or “onboarding” doc.

### Onboarding difficulty

- **High:** A new developer must (1) infer entry from HTML and script order, (2) trace DOMContentLoaded and `IEPageBootstrap.init`, (3) learn the many `window.IE*` globals and their responsibilities, (4) understand why both “core” and “runtime” exist and where to add new behavior. The refactor comment “extracted from app-shell” appears in several runtimes but the remaining surface in app-shell is still large.  
- **Risk:** Changing script order or renaming a global can break pages in non-obvious ways (e.g. candidate.html missing header/entity-actions scripts). There is no automated check that “required” scripts are present per page type.

---

## SECTION 4 — Risk analysis

Areas where future changes could break architecture or behavior:

1. **Script order and presence in HTML**  
   Changing the order of scripts or omitting a “required” runtime (e.g. `header-runtime.js`, `entity-actions-runtime.js`) can leave a page with missing UI or broken actions. **Current example:** `candidate.html` omits these two scripts; header init and entity action delegation do not run on that page. Any new page that copies an incomplete script block inherits the same risk.

2. **Global namespace**  
   Renaming or removing a `window.IE*` global (e.g. `IEPageBootstrapHelpers`, `IELayoutRuntime`) can break any module that references it. There is no single manifest of “who uses which global”; refactors are error-prone.

3. **Shell and “ie:header-loaded”**  
   `ie:header-loaded` fires when header, bottom nav, and footer fragments have finished mounting (one “shell ready” event). Header-runtime reacts with breadcrumbs, profile, and header nav. Bottom-nav-runtime is loaded by page-bootstrap and runs `initBottomNav(pageKey)` after page initializers; it listens for `ie:header-loaded` for link normalization and active state. No layout or sidebar runtime.

4. **Session/auth usage**  
   Adding new features that call `getSession()` or `checkAuth()` will increase redundant network/calls unless a shared “session ready” abstraction is introduced. Changing how or when the auth guard runs could break assumptions in page-bootstrap or in features that assume “user is already loaded.”

5. **Page key and bootstrap switches**  
   Adding a new page type requires updating `router-runtime.js` (getPageKey, PROTECTED_PAGES), `page-bootstrap.js` (runFormInitializers, runPageControllers, runDataViews), and possibly app-shell. Forgetting one switch leaves the new page partially initialized.

6. **core/supabase.js size and usage**  
   Any large change to Supabase (e.g. API shape, RLS, or new tables) touches a single 4k-line file. Merge conflicts and regression risk are high. Splitting this file without a clear contract (e.g. “auth vs data”) could break callers that depend on the current single global.

7. **Lists and dashboard in lists-runtime**  
   Changing dashboard or list behavior (e.g. new filters, new columns) requires editing the large `lists-runtime.js`. Extracting “dashboard” vs “candidates list” into separate modules could break shared helpers (e.g. filter functions, pagination) if not done with clear interfaces.

8. **Feature self-invocation**  
   Features like `archived.js` call `init()` at the end of the script. If script order or DOM readiness changes (e.g. moving to deferred scripts), init may run before required globals or DOM exist.

---

## SECTION 5 — Recommendations

### High impact

1. **Shell single owner (current)**  
   `header-loader.js` mounts header, bottom nav, and footer; `page-bootstrap.js` owns header init, page initializers, and bottom-nav runtime load/init. No layout or sidebar runtime.  
   **Files:** `portal/shared/header-loader.js`, `portal/runtime/page-bootstrap.js`, `portal/runtime/bottom-nav-runtime.js`.

2. **Add missing scripts to candidate.html**  
   Include `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` in `candidate.html` in the same relative order as in `candidates.html` (e.g. after `runtime/job-offer-runtime.js`, before `runtime/page-bootstrap.js`). Restores header and entity actions on the candidate detail page.  
   **File:** `portal/candidate.html`.

3. **Introduce a single “session ready” abstraction**  
   Have the auth guard (or a small new module) resolve session once, expose a promise or event (“session ready” / “user set”), and have `loadCurrentUserProfile`, dashboard, and other code paths consume that instead of each calling `getSession()`/`checkAuth()` again. Reduces redundant session calls and clarifies bootstrap order.  
   **Files:** `portal/core/app-shell.js`, `portal/core/auth.js`, `portal/runtime/page-bootstrap.js`, `portal/runtime/profile-runtime.js`; optionally a new `core/session-ready.js` or extend `core/session/session.js`.

4. **Document bootstrap and script order**  
   Add a short doc (e.g. `portal/docs/ARCHITECTURE.md` or `BOOTSTRAP.md`) that describes: (a) entry (which HTML for login vs app), (b) script load order and why (router → auth/supabase → runtime → page-bootstrap → app-shell → features), (c) the sequence inside `IEPageBootstrap.init`, and (d) which globals are required when. Reduces onboarding cost and risk of breaking changes.  
   **New file:** e.g. `portal/docs/ARCHITECTURE.md`.

5. **Standardize script list for protected pages**  
   Define a single “protected app” script block (order and set of scripts) and reuse it across all protected HTML pages (e.g. via a build step that injects the same script list, or a checklist in docs). Ensures no page accidentally omits header-runtime, entity-actions-runtime, or others.  
   **Files:** All `portal/*.html` that use the shell (e.g. dashboard, candidates, candidate, application, clients, job-offers, add-*, profile, archived).

### Medium impact

6. **Split core/supabase.js by concern**  
   Extract auth/session (and optionally audit helpers) into e.g. `core/supabase-auth.js` and keep data access in `core/supabase.js` or split by entity (e.g. `core/supabase-candidates.js`, …). Reduces file size and clarifies where to change auth vs data logic.  
   **File:** `portal/core/supabase.js`.

7. **Split core/lists-runtime.js**  
   Separate dashboard init and rendering from list pages (candidates, job offers, clients) and shared table/pagination helpers. E.g. `runtime/dashboard-runtime.js` and `runtime/lists-runtime.js` (or keep one lists module but split by function). Improves navigability and testability.  
   **File:** `portal/core/lists-runtime.js`.

8. **Pin Supabase script version everywhere**  
   Use the same Supabase CDN URL (e.g. `@supabase/supabase-js@2`) on all pages that load Supabase, including `index.html` and `reset-password.html`. Avoids version drift and cache inconsistencies.  
   **Files:** All `portal/*.html` that reference the Supabase CDN.

9. **Move lists-runtime to runtime/**  
   Rename/relocate `core/lists-runtime.js` to `runtime/lists-runtime.js` (or similar) so that “runtime” behavior is under one directory. Update all HTML script references. Aligns structure with naming.  
   **Files:** `portal/core/lists-runtime.js`, all HTML that reference it.

10. **Page–script map**  
    Add a section in docs or a small table (e.g. in `ARCHITECTURE.md`) that lists each page (e.g. dashboard, candidates, candidate, application) and which feature/runtime scripts it loads. Improves discoverability and prevents incomplete script sets.  
    **File:** e.g. `portal/docs/ARCHITECTURE.md`.

### Low impact

11. **README in portal/**  
    Add a `portal/README.md` with: project name, stack (vanilla JS, Supabase), how to run locally (e.g. simple HTTP server), and a link to architecture/bootstrap docs.  
    **New file:** `portal/README.md`.

12. **Guard initGlobalModals with hasInitializedGlobalModals**  
    In `runtime/modals-runtime.js`, short-circuit `initGlobalModals()` when `hasInitializedGlobalModals` is true to make the API idempotent and future-proof.  
    **File:** `portal/runtime/modals-runtime.js`.

13. **Centralize page key / PROTECTED_PAGES**  
    Ensure the list of protected pages (e.g. in `router-runtime.js`) is the single source of truth and that any other “protected” check (e.g. in app-shell or docs) references or derives from it. Reduces drift when adding new pages.  
    **Files:** `portal/runtime/router-runtime.js`, `portal/core/app-shell.js`.

14. **Fix typo in lists-runtime**  
    Correct `tracking-titter` to `tracking-tighter` in the dashboard sources UI (e.g. in `renderDashboardSources`).  
    **File:** `portal/core/lists-runtime.js` (around the “tracking-titter” string).

15. **Reduce app-shell surface**  
    Over time, move remaining “compatibility” logic from app-shell into runtime or core modules and keep app-shell as a thin bootstrap + guard + minimal wiring. Document the remaining responsibilities. Improves long-term maintainability.  
    **File:** `portal/core/app-shell.js`.

---

*End of audit. No code was modified; this report is for evaluation and planning only.*
