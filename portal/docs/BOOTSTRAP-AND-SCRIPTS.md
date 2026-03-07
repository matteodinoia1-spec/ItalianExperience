# Portal bootstrap and script loading

This document describes how protected pages start up, which scripts they must load, and how to keep new pages aligned. It is the single reference for boot sequence, script baseline, and session/layout behavior.

---

## 1. Protected page boot sequence

1. **Parse time (script execution order)**  
   Scripts run in HTML order. Early scripts set up:
   - `shared/header-loader.js` — registers `loadPortalHeader()` for DOMContentLoaded.
   - `core/supabase.js` — Supabase client and `window.IESupabase`.
   - `core/auth.js` — `window.IEAuth` (checkAuth, getSession, etc.).
   - `core/session-ready.js` — `window.IESessionReady.getSessionReady()` (single cached session per load).
   - `core/router.js` — navigation helpers.
   - `runtime/router-runtime.js` — `getPageKey()`, `isProtectedPage()`.
   - …remaining runtime and core scripts…
   - `core/app-shell.js` — runs immediately: gets `pageKey`, and for **protected pages** creates `window.__IE_AUTH_GUARD__` (a promise that resolves once session is ready and user is authenticated).

2. **Auth guard (protected pages only)**  
   `__IE_AUTH_GUARD__` does:
   - Call `IESessionReady.getSessionReady()` (one `getSession()` per load, cached).
   - Call `IEAuth.checkAuth(cachedSession)` so no second session fetch.
   - On success: set `window.__IE_AUTH_USER__`, make body visible, resolve with `true`.
   - On failure: redirect to login and resolve with `false`.

3. **DOMContentLoaded**  
   - `header-loader.js`’s listener runs `loadPortalHeader()` (fetches `layout/header.html`; on completion dispatches `ie:header-loaded`).
   - `app-shell.js`’s listener runs `IEPageBootstrap.init(currentPageKey)`.

4. **Page bootstrap (`runtime/page-bootstrap.js`)**  
   - `initGlobalModals()`, `IEEntityActionsRuntime.init()`.
   - **Await** `__IE_AUTH_GUARD__`; if not allowed, return.
   - **Protected pages:** `loadCurrentUserProfile()` (uses `getSessionReady()` when available), then `initInactivityTimer()`.
   - **Then:** `ensureSidebarLoaded()` (fetch `layout/sidebar.html`).
   - After sidebar: optional re-check of auth (using cached session when available), then **once only** `IELayoutRuntime.initLayout()`, then `IEHeaderRuntime.initHeader(pageKey)`, then `runPageInitializers(pageKey)` (back button, buttons, forms, page controllers, data views).

5. **Header loaded**  
   When `ie:header-loaded` fires (after header HTML is injected), header-runtime calls `initLayout()` again so the header-injected sidebar toggle button gets bound, then updates page header and profile blocks. `initLayout()` is idempotent: when already initialized it only binds any new toggle buttons and does not add duplicate document/window/overlay listeners or MutationObserver.

---

## 2. Required script baseline for protected pages

Every protected page must include the following scripts in this order. Page-specific scripts (queries, feature JS) are noted where they differ.

| Order | Script | Notes |
|-------|--------|--------|
| 1 | `shared/header-loader.js` | |
| 2 | `core/debug.js` | |
| 3 | `https://cdn.jsdelivr.net/npm/@supabase/supabase-js` | |
| 4 | `core/supabase.js` | |
| 5 | *(optional)* `queries/*.queries.js` | e.g. applications, jobOffers, clients — only where needed |
| 6 | `core/auth.js` | |
| 7 | `core/session-ready.js` | Single cached session per load; used by guard and bootstrap |
| 8 | `core/router.js` | |
| 9 | `runtime/router-runtime.js` | |
| 10 | `runtime/layout-runtime.js` | |
| 11 | `runtime/sidebar-runtime.js` | |
| 12 | `runtime/forms-runtime.js` | |
| 13 | `runtime/modals-runtime.js` | |
| 14 | `runtime/profile-runtime.js` | |
| 15 | `runtime/status-runtime.js` | |
| 16 | `runtime/associations-runtime.js` | |
| 17 | `runtime/candidate-profile-runtime.js` | |
| 18 | `runtime/candidate-runtime.js` | |
| 19 | `runtime/client-runtime.js` | |
| 20 | `runtime/job-offer-runtime.js` | |
| 21 | **`runtime/header-runtime.js`** | Required for header and breadcrumbs |
| 22 | **`runtime/entity-actions-runtime.js`** | Required for entity action buttons and delegation |
| 23 | `runtime/page-bootstrap.js` | |
| 24 | `components/page-header.js` | |
| 25 | `core/entity-toolbar.js` | |
| 26 | `core/lists-runtime.js` | |
| 27 | `core/session/session.js` | Inactivity timer |
| 28 | `core/ui/modals.js` | |
| 29 | `core/ui/previews.js` | |
| 30 | `core/app-shell.js` | Must be last core script; triggers DOMContentLoaded bootstrap |
| 31+ | *(page-specific)* | e.g. `shared/activity-section.js`, `features/*/…` |

**Pages that must match this baseline:**  
dashboard, candidates, candidate, applications, application, job-offers, clients, add-candidate, add-job-offer, add-client, profile, archived.

**Deviations:**  
- Only add or reorder scripts when necessary (e.g. extra query files).  
- Never omit `header-runtime.js` or `entity-actions-runtime.js` on a protected app page; omitting them was the cause of missing header and actions on `candidate.html` before stabilization.

---

## 3. Page-specific scripts

- **application.html / archived.html:** `queries/applications.queries.js` before auth; `shared/activity-section.js` and feature script after app-shell.
- **applications.html:** `queries/applications.queries.js`, `queries/jobOffers.queries.js`, `queries/clients.queries.js` before auth; `features/applications/applications.js` after app-shell.
- **add-candidate / add-client / add-job-offer:** `shared/activity-section.js` after app-shell when the page uses activity.
- **candidate.html:** `features/candidates/candidate.js` after app-shell.
- **profile.html:** `features/profile/profile.js` after app-shell.
- **archived.html:** `features/archived/archived.js` after app-shell.

---

## 4. Session-ready abstraction

- **Purpose:** One resolved session per page load so boot code does not call `getSession()` (or equivalent) repeatedly.
- **API:** `window.IESessionReady.getSessionReady()` returns a promise that resolves to `{ data: { session, user }, error }` (same shape as `IESupabase.getSession()`). The first call performs the fetch; later calls in the same load return the same promise.
- **Used by:**  
  - **app-shell** guard: awaits `getSessionReady()`, then `checkAuth(cachedSession)` so no second session fetch.  
  - **page-bootstrap:** re-validation after sidebar (and in error/fallback paths) uses `getSessionReady()` and passes the result to `checkAuth()` so no extra getSession.  
  - **profile-runtime:** `loadCurrentUserProfile()` uses `getSessionReady()` when available instead of calling `IEAuth.getSession()` again.
- **Compatibility:** If `session-ready.js` is not loaded (e.g. legacy or public page), guard falls back to `ensureSupabaseSessionReady()` and `checkAuth()` with no argument; profile falls back to `IEAuth.getSession()`.

---

## 5. Why duplicate layout init was risky

- **What was wrong:** `initLayout()` was invoked (1) from page-bootstrap after sidebar load, and (2) from the `ie:header-loaded` listener in header-runtime. Layout runtime was not idempotent: each run added document click, keydown, resize listeners and a new MutationObserver on the sidebar. So every load registered duplicate global listeners and a second observer.
- **Fix applied:**  
  - `initLayout()` is now idempotent (module-level guard). When already initialized, it only binds any new toggle buttons (e.g. in the header, which is injected after bootstrap) and returns without re-adding listeners or observer.  
  - The `ie:header-loaded` listener still calls `initLayout()` so the header hamburger toggle gets bound when the header fragment loads; the second call is safe because of the idempotency behavior above.
- **Result:** Full layout setup runs once from page-bootstrap; a second call from `ie:header-loaded` only binds new toggle buttons. No duplicate listeners or observers.

---

## 6. How to keep new pages aligned

- Add a new HTML file for a **protected** page only if it needs a distinct shell (e.g. different layout or feature set). Prefer reusing an existing page with routing if possible.
- When adding a new protected page:
  1. Copy the script block from an existing protected page (e.g. `dashboard.html` or `candidates.html`).
  2. Keep the **exact order** of the baseline scripts above; only insert page-specific scripts in the allowed places (queries after supabase, feature scripts after app-shell).
  3. Ensure `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` are both present before `runtime/page-bootstrap.js`.
  4. Include `core/session-ready.js` after `core/auth.js`.
  5. If the page is protected, register it in `runtime/router-runtime.js` in `PROTECTED_PAGES` and add any page-specific branch in `runtime/page-bootstrap.js` (e.g. `runFormInitializers`, `runPageControllers`, `runDataViews`).
- When adding a new runtime or core script that must run on all protected pages, add it to this baseline and to every protected HTML file in the correct order.

---

## 7. Quick reference

- **Entry:** Protected app entry is the corresponding HTML file; JS entry is script order → app-shell → DOMContentLoaded → `IEPageBootstrap.init(pageKey)`.
- **Auth:** One session fetch per load via `IESessionReady.getSessionReady()`; guard and bootstrap use it so protected pages do not repeat getSession/checkAuth unnecessarily.
- **Layout:** Initialized once from page-bootstrap after sidebar; idempotent if called again.
- **Script baseline:** See Section 2; no protected page should omit header-runtime or entity-actions-runtime.
