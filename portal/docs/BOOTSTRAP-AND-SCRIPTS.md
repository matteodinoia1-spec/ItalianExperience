# Portal bootstrap and script loading

This document describes how protected pages start up, which scripts they must load, and how to keep new pages aligned. It is the single reference for boot sequence, script baseline, and session/layout behavior.

---

## 1. Portal shell architecture (header + bottom-nav)

- **Header** — Full-width; nav left (shell padding), user/profile right. Primary global navigation. Desktop/tablet: primary nav and user area in header; no page title in header. On mobile, page title is displayed in the header.
- **Bottom nav** — Mobile only. Fixed bar; primary items: Dashboard, Candidates, Job Offers, Applications, More. “More” panel contains: Clients, Archived, Settings, Logout. Loaded by `header-loader.js` with header and footer.
- **Footer** — Desktop/tablet only. Full width; uses the same shell padding as the header. Breadcrumbs only (`#page-breadcrumbs`), left aligned, vertically centered in the footer bar; align with header navigation start. On mobile the footer is completely hidden; breadcrumbs are not shown.
- **No sidebar** — Sidebar and hamburger have been removed. Mobile uses bottom nav + More; no off-canvas sidebar.
- **No top toolbar** — The old top toolbar has been fully removed. Page actions and filters live in the content area (e.g. `.page-list-actions`, `.page-detail-actions`, `.page-form-actions`, `.page-filters-column`).
- **Page titles** — Not part of the shared shell for now.

`header-loader.js` mounts header, then gets/creates footer and bottom-nav containers, fetches `layout/footer.html` and `layout/bottom-nav.html`, injects them (DOM order: …content, `#portal-bottom-nav`, `#portal-footer`), then dispatches `ie:header-loaded`. One event when the full shell (header + bottom nav + footer) is ready.

---

## 2. Protected page boot sequence

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
   - `header-loader.js`’s listener runs `loadPortalHeader()` (fetches `layout/header.html` and `layout/footer.html`; on completion dispatches `ie:header-loaded`).
   - `app-shell.js`’s listener runs `IEPageBootstrap.init(currentPageKey)`.

4. **Page bootstrap (`runtime/page-bootstrap.js`)**  
   - `initGlobalModals()`, `IEEntityActionsRuntime.init()`.
   - **Await** `__IE_AUTH_GUARD__`; if not allowed, return.
   - **Protected pages:** `loadCurrentUserProfile()` (uses `getSessionReady()` when available), then `initInactivityTimer()`.
   - **Then:** `IEHeaderRuntime.initHeader(pageKey)`, then `runPageInitializers(pageKey)` (back button, buttons, forms, page controllers, data views).
   - **Finally:** `ensureBottomNavRuntimeLoaded()` (dynamically loads `runtime/bottom-nav-runtime.js` if not present), then `IEBottomNavRuntime.initBottomNav(pageKey)` (active state, link normalization, More open/close, mobile logout in More).

5. **Header loaded (`ie:header-loaded`)**  
   Fires when header, bottom nav, and footer fragments have finished mounting (single “shell ready” event). **header-runtime** reacts by: rendering breadcrumbs into the footer (`#page-breadcrumbs`), updating profile/avatar blocks, and initializing header nav behavior (active state, user menu, logout). **Bottom-nav-runtime** binds after bootstrap loads it and runs `initBottomNav(pageKey)`; it listens for `ie:header-loaded` to normalize links and set active state. `IEPageBootstrap` owns shell/page initialization; it does not call any layout or sidebar runtime (those were removed).

---

## 3. Required script baseline for protected pages

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
| 10 | `runtime/forms-runtime.js` | |
| 11 | `runtime/modals-runtime.js` | |
| 12 | `runtime/profile-runtime.js` | |
| 13 | `runtime/status-runtime.js` | |
| 14 | `runtime/associations-runtime.js` | |
| 15 | `runtime/candidate-profile-runtime.js` | |
| 16 | `runtime/candidate-runtime.js` | |
| 17 | `runtime/client-runtime.js` | |
| 18 | `runtime/job-offer-runtime.js` | |
| 19 | **`runtime/header-runtime.js`** | Required for header and breadcrumbs |
| 20 | **`runtime/entity-actions-runtime.js`** | Required for entity action buttons and delegation |
| 21 | `runtime/page-bootstrap.js` | Loads bottom-nav-runtime dynamically; must be after header-runtime |
| 22 | `components/page-header.js` | |
| 23 | `core/entity-toolbar.js` | |
| 24 | `core/lists-runtime.js` | |
| 25 | `core/session/session.js` | Inactivity timer |
| 26 | `core/ui/modals.js` | |
| 27 | `core/ui/previews.js` | |
| 28 | `core/app-shell.js` | Must be last core script; triggers DOMContentLoaded bootstrap |
| 29+ | *(page-specific)* | e.g. `shared/activity-section.js`, `features/*/…` |

**Note:** `runtime/bottom-nav-runtime.js` is **not** in the static script list; `page-bootstrap.js` loads it dynamically and then calls `IEBottomNavRuntime.initBottomNav(pageKey)`.

**Pages that must match this baseline:**  
dashboard, candidates, candidate, applications, application, job-offers, clients, add-candidate, add-job-offer, add-client, profile, archived.

**Deviations:**  
- Only add or reorder scripts when necessary (e.g. extra query files).  
- Never omit `header-runtime.js` or `entity-actions-runtime.js` on a protected app page; omitting them was the cause of missing header and actions on `candidate.html` before stabilization.

---

## 4. Page-specific scripts

- **application.html / archived.html:** `queries/applications.queries.js` before auth; `shared/activity-section.js` and feature script after app-shell.
- **applications.html:** `queries/applications.queries.js`, `queries/jobOffers.queries.js`, `queries/clients.queries.js` before auth; `features/applications/applications.js` after app-shell.
- **add-candidate / add-client / add-job-offer:** `shared/activity-section.js` after app-shell when the page uses activity.
- **candidate.html:** `features/candidates/candidate.js` after app-shell.
- **profile.html:** `features/profile/profile.js` after app-shell.
- **archived.html:** `features/archived/archived.js` after app-shell.

---

## 5. Session-ready abstraction

- **Purpose:** One resolved session per page load so boot code does not call `getSession()` (or equivalent) repeatedly.
- **API:** `window.IESessionReady.getSessionReady()` returns a promise that resolves to `{ data: { session, user }, error }` (same shape as `IESupabase.getSession()`). The first call performs the fetch; later calls in the same load return the same promise.
- **Used by:**  
  - **app-shell** guard: awaits `getSessionReady()`, then `checkAuth(cachedSession)` so no second session fetch.  
  - **page-bootstrap:** re-validation (when used) uses `getSessionReady()` and passes the result to `checkAuth()` so no extra getSession.  
  - **profile-runtime:** `loadCurrentUserProfile()` uses `getSessionReady()` when available instead of calling `IEAuth.getSession()` again.
- **Compatibility:** If `session-ready.js` is not loaded (e.g. legacy or public page), guard falls back to `ensureSupabaseSessionReady()` and `checkAuth()` with no argument; profile falls back to `IEAuth.getSession()`.

---

## 6. Shell initialization

- **Owner:** `IEPageBootstrap` owns shell and page initialization. It runs header init, page initializers (forms, data views), then loads and initializes the bottom-nav runtime. There is no layout-runtime, sidebar-runtime, or toolbar runtime; those were removed.
- **header-runtime** on `ie:header-loaded`: breadcrumb rendering (to footer), profile/avatar updates, header nav behavior (active state, user menu, logout). It does not initialize layout, sidebar, or toolbar.
- **bottom-nav-runtime** is loaded dynamically by page-bootstrap and runs `initBottomNav(pageKey)`: it sets bottom-nav active state, normalizes links, and handles More panel open/close and mobile logout.
- **forms-runtime** `initEditToolbars()` only sets the text on `[data-entity-mode-indicator]` (e.g. "Editing Candidate") from URL state; it does not query any toolbar DOM.

---

## 7. How to keep new pages aligned

- Add a new HTML file for a **protected** page only if it needs a distinct shell (e.g. different layout or feature set). Prefer reusing an existing page with routing if possible.
- When adding a new protected page:
  1. Copy the script block from an existing protected page (e.g. `dashboard.html` or `candidates.html`).
  2. Keep the **exact order** of the baseline scripts above; only insert page-specific scripts in the allowed places (queries after supabase, feature scripts after app-shell).
  3. Ensure `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` are both present before `runtime/page-bootstrap.js`.
  4. Include `core/session-ready.js` after `core/auth.js`.
  5. If the page is protected, register it in `runtime/router-runtime.js` in `PROTECTED_PAGES` and add any page-specific branch in `runtime/page-bootstrap.js` (e.g. `runFormInitializers`, `runPageControllers`, `runDataViews`).
- When adding a new runtime or core script that must run on all protected pages, add it to this baseline and to every protected HTML file in the correct order.

---

## 8. Quick reference

- **Entry:** Protected app entry is the corresponding HTML file; JS entry is script order → app-shell → DOMContentLoaded → `IEPageBootstrap.init(pageKey)`.
- **Auth:** One session fetch per load via `IESessionReady.getSessionReady()`; guard and bootstrap use it so protected pages do not repeat getSession/checkAuth unnecessarily.
- **Shell:** Header (primary nav + user menu), bottom nav (mobile), footer (breadcrumbs, desktop/tablet only; hidden on mobile). No sidebar, hamburger, or top toolbar; page actions and filters are in content. Bottom-nav runtime is loaded dynamically by page-bootstrap.
- **Script baseline:** See Section 3; no protected page should omit header-runtime or entity-actions-runtime. Do not add layout-runtime, sidebar-runtime, or toolbar runtime (removed).

---

## 9. Final shell architecture summary (post bottom-nav and toolbar removal)

- **Shared shell:** Header (primary global nav), bottom nav (mobile), footer (breadcrumbs, desktop/tablet only). No sidebar, no hamburger, no top toolbar.
- **Desktop/tablet:** Header nav and user menu; footer shows breadcrumbs (full width, shell padding; breadcrumbs left aligned, vertically centered).
- **Mobile:** Header shows page title. Bottom nav is primary navigation; More panel contains Clients, Archived, Settings, Logout. Footer is hidden; breadcrumbs are not shown.
- **Page layout:** Actions and filters live in content. List pages: `.page-layout-with-filters` with left sticky `.page-filters-column` and `.page-main-column`; primary CTAs in `.page-list-actions`. Detail pages: `.page-detail-actions`. Form pages: `.page-form-actions` and `[data-entity-mode-indicator]`. Sticky filter column uses `top: calc(var(--portal-header-height) + var(--portal-safe-top))`; no `toolbar.css` or `--portal-toolbar-height`.
- **Loader:** `header-loader.js` mounts header, bottom nav, and footer; dispatches `ie:header-loaded` once when all are in place.
- **Bootstrap:** `IEPageBootstrap.init()` runs auth guard → profile + inactivity → header init → page initializers → dynamic load of `bottom-nav-runtime.js` → `initBottomNav(pageKey)`. Bottom-nav runtime owns active state, link normalization, More open/close, and mobile logout.
- **Layout/styling:** No sidebar or toolbar CSS. On mobile, footer is hidden; bottom nav is primary. Spacing uses design tokens; iOS/safe-area insets applied (`--portal-safe-*`). Page titles are not part of the shared shell for now.
