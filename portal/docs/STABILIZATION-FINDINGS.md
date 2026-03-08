# Portal stabilization – findings and change plan

**Date:** March 7, 2025  
**Scope:** Duplicate layout init, protected-page scripts, candidate.html, session checks, documentation.

**Note (post bottom-nav refactor):** The layout/sidebar runtimes have been removed. The shell is now header + bottom nav + footer; `header-loader.js` mounts all three and dispatches `ie:header-loaded`. `page-bootstrap.js` runs header init, page initializers, then dynamically loads and runs `bottom-nav-runtime.js`. There is no `layout-runtime.js`, `sidebar-runtime.js`, or `ensureSidebarLoaded()`. The findings and change report below are historical; the current script baseline is in `BOOTSTRAP-AND-SCRIPTS.md` (no layout-runtime or sidebar-runtime in the list).

---

## A. Findings summary

### 1. Duplicate init root cause

- **Call site 1:** `runtime/page-bootstrap.js` (lines 248–252): after `ensureSidebarLoaded()`, for protected pages it calls `IELayoutRuntime.initLayout()` then `IEHeaderRuntime.initHeader(pageKey)`.
- **Call site 2:** `runtime/header-runtime.js` (lines 194–201): `bindHeaderLoadedListener()` adds a listener for `ie:header-loaded` that calls `IELayoutRuntime.initLayout()` when the header fragment has been injected.
- **Order in practice:** Bootstrap runs first (sidebar → initLayout → initHeader → bindHeaderLoadedListener). `loadPortalHeader()` in `shared/header-loader.js` runs on DOMContentLoaded and fetches `layout/header.html`; when that completes it dispatches `ie:header-loaded`. So initLayout runs once from bootstrap, then again when the header load completes.
- **Why it’s harmful:** `layout-runtime.js`’s `initLayout()` is not idempotent. It adds: overlay click listener, document click listener, document keydown listener, window resize listener, and a MutationObserver on the sidebar. Only toggle buttons are guarded with `__ieSidebarToggleBound`. So the second run duplicates document/window listeners and adds a second MutationObserver.

### 2. Protected-page script baseline (candidate)

**Common order across dashboard, candidates, application, job-offers, clients, add-candidate, add-client, add-job-offer, profile, archived:**  
*(Historical; layout-runtime and sidebar-runtime have been removed. Current baseline in BOOTSTRAP-AND-SCRIPTS.md.)*

1. `shared/header-loader.js`
2. `core/debug.js`
3. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js`
4. `core/supabase.js`
5. *(optional page-specific: queries/*.queries.js)*
6. `core/auth.js`
7. `core/session-ready.js`
8. `core/router.js`
9. `runtime/router-runtime.js`
10. `runtime/forms-runtime.js`
11. `runtime/modals-runtime.js`
12. `runtime/profile-runtime.js`
… (see BOOTSTRAP-AND-SCRIPTS.md for full current baseline; no layout-runtime or sidebar-runtime; bottom-nav-runtime is loaded dynamically by page-bootstrap.)

*(This section described the pre–bottom-nav state. Current authoritative baseline: `portal/docs/BOOTSTRAP-AND-SCRIPTS.md`.)*

### 3. candidate.html deviations

- **Missing:** `runtime/header-runtime.js`, `runtime/entity-actions-runtime.js`.
- **Placement:** They should appear after `runtime/job-offer-runtime.js` and before `runtime/page-bootstrap.js`, matching other protected pages.
- **Effect:** Header init and entity action delegation do not run on the candidate detail page.

### 4. Repeated session-check hotspots (boot only)

- **app-shell.js:** On protected pages, `__IE_AUTH_GUARD__` runs `ensureSupabaseSessionReady()` (calls `getSession()` or `supabase.auth.getSession()`) then `IEAuth.checkAuth()` (which uses `requireAuth()` → `enforceAuthGuard()` → `supabase.auth.getSession()` again).
- **page-bootstrap.js:** Awaits `__IE_AUTH_GUARD__`, then for protected pages calls `loadCurrentUserProfile()` (profile-runtime calls `IEAuth.getSession()`), then after sidebar optionally `IEAuth.checkAuth()` again (and in catch/fallback branches again). So multiple getSession/checkAuth during the same boot.

### 5. Files to edit

| File | Change |
|------|--------|
| `portal/runtime/layout-runtime.js` | Make `initLayout()` idempotent with a module-level guard. |
| `portal/runtime/header-runtime.js` | Remove `initLayout()` from `ie:header-loaded` listener (single call from bootstrap). |
| `portal/candidate.html` | Add `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` in baseline order. |
| `portal/core/session-ready.js` (new) | Minimal `getSessionReady()` cached promise for current boot. |
| `portal/core/app-shell.js` | Have auth guard resolve and set session-ready; use it where appropriate. |
| `portal/runtime/page-bootstrap.js` | Reuse session-ready for post-guard steps (avoid extra getSession/checkAuth). |
| `portal/runtime/profile-runtime.js` | Use session-ready in `loadCurrentUserProfile` when available. |
| `portal/docs/BOOTSTRAP-AND-SCRIPTS.md` (new) | Document boot sequence, script baseline, session-ready, layout fix. |

---

## B. Change plan (minimal, low-risk)

1. **Layout (Priority 1)**  
   - In `layout-runtime.js`: add a module-level `layoutInitialized` flag; at the start of `initLayout()` return early if already set; after all setup set the flag.  
   - In `header-runtime.js`: remove the call to `IELayoutRuntime.initLayout()` from the `ie:header-loaded` listener; keep `mountPageHeader()` and profile updates so header content still updates when the fragment loads.

2. **Script baseline (Priority 2)**  
   - Document the baseline in `portal/docs/BOOTSTRAP-AND-SCRIPTS.md` (no code change for baseline itself).

3. **candidate.html (Priority 3)**  
   - Insert `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` after `runtime/job-offer-runtime.js` and before `runtime/page-bootstrap.js`.

4. **Session-ready (Priority 4)**  
   - Add `core/session-ready.js`: expose `getSessionReady()` returning a promise that resolves to `{ data, error }` (same shape as getSession), and `setSessionReady(result)`. Cache the promise per page load (single resolution).  
   - In `app-shell.js`: after guard succeeds (session + checkAuth), call `setSessionReady(await getSession())` (or equivalent) so one session result is stored.  
   - In `page-bootstrap.js`: after awaiting guard, if `getSessionReady` is available, await it and use that for any follow-up that would call getSession/checkAuth again (e.g. pass user to loadCurrentUserProfile; for post-sidebar checkAuth, use cached user/session instead of calling checkAuth again).  
   - In `profile-runtime.js`: if `getSessionReady` is available, use it for `loadCurrentUserProfile` instead of calling `IEAuth.getSession()` again.  
   - Load `session-ready.js` after auth and before app-shell (so guard can set it); ensure it’s loaded on protected pages that use bootstrap.

5. **Documentation (Priority 5)**  
   - Add `portal/docs/BOOTSTRAP-AND-SCRIPTS.md` covering: protected page boot sequence, required script baseline, page-specific scripts, session-ready usage, why duplicate layout init was risky, how to keep new pages aligned.

---

*Implementation completed. Reports below.*

---

## C. Change report

| File | What changed | Why | Risk |
|------|--------------|-----|------|
| `portal/runtime/layout-runtime.js` | Added module-level `layoutInitialized` flag; at start of `initLayout()` early return if true; set true after all listeners/observer attached. | Make initLayout idempotent so duplicate calls do not add duplicate document/window listeners or a second MutationObserver. | Low: pure guard; no behavior change when called once. |
| `portal/runtime/header-runtime.js` | Removed call to `IELayoutRuntime.initLayout()` from the `ie:header-loaded` listener; kept `mountPageHeader()` and profile updates. | Single call site for layout init (bootstrap only); removes second init that caused duplicate listeners. | Low: layout still runs once from bootstrap; header content still updates on event. |
| `portal/candidate.html` | Inserted `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` after `runtime/job-offer-runtime.js`, and `core/session-ready.js` after `core/auth.js`. | Align with protected-page baseline; restore header and entity actions on candidate detail page; enable session-ready for boot. | Low: additive scripts only. |
| `portal/core/session-ready.js` | **New file.** Exposes `IESessionReady.getSessionReady()` — cached promise of one `getSession()` per load. | Single session resolution for boot; reused by guard, bootstrap, and profile to reduce repeated session fetches. | Low: optional use; fallbacks when not loaded. |
| `portal/core/auth.js` | `checkAuth(optionalCachedSession)` — when valid cached session/user provided, return user without calling `requireAuth()`. | Avoid second getSession during guard and bootstrap re-validation when session already resolved. | Low: backward compatible; no argument = same as before. |
| `portal/core/app-shell.js` | Guard: use `IESessionReady.getSessionReady()` when available, then `checkAuth(sessionResult)`; else keep `ensureSupabaseSessionReady()` + `checkAuth()`. | One session fetch for guard when session-ready is present; checkAuth uses cache. | Low: fallback preserves current behavior. |
| `portal/runtime/page-bootstrap.js` | After sidebar (and in catch/else branches): get cached session via `getSessionReady()` when available and pass to `checkAuth(cached)`. | Reuse same session for re-validation instead of extra getSession/checkAuth. | Low: same validation, fewer network calls. |
| `portal/runtime/profile-runtime.js` | `loadCurrentUserProfile()`: use `IESessionReady.getSessionReady()` when available, else `IEAuth.getSession()`. | Avoid duplicate getSession during bootstrap on protected pages. | Low: fallback to getSession when session-ready absent. |
| All other protected HTML pages | Added `core/session-ready.js` after `core/auth.js` (dashboard, candidates, application, applications, job-offers, clients, add-candidate, add-client, add-job-offer, profile, archived). | Ensure session-ready is available on every protected page so guard and bootstrap can reuse one session. | Low: one extra script tag; no logic change. |
| `portal/docs/BOOTSTRAP-AND-SCRIPTS.md` | **New file.** Boot sequence, required script baseline, page-specific scripts, session-ready usage, duplicate layout fix, how to align new pages. | Single developer-facing reference for bootstrap and script loading. | None. |
| `portal/docs/STABILIZATION-FINDINGS.md` | **New file.** Findings summary, change plan, and this change/verification/risk report. | Record of root causes and planned edits. | None. |

---

## D. Verification report

1. **`initLayout()` no longer creates duplicate listeners/observers in the normal boot flow**  
   **Verified.**  
   - Only remaining call site for `initLayout()` in boot is `page-bootstrap.js` (after `ensureSidebarLoaded()`).  
   - The `ie:header-loaded` listener in `header-runtime.js` no longer calls `initLayout()`.  
   - `initLayout()` in `layout-runtime.js` is idempotent: `layoutInitialized` is set to `true` only after all listeners and the MutationObserver are attached; earlier return when `!sidebar` does not set the flag so a later call can still run if needed.  
   - So in normal boot, layout runs once; repeated calls would be no-ops.

2. **Protected pages now have a standardized required runtime baseline**  
   **Verified.**  
   - `portal/docs/BOOTSTRAP-AND-SCRIPTS.md` defines the full baseline (order and set of scripts).  
   - All protected HTML files (dashboard, candidates, candidate, application, applications, job-offers, clients, add-candidate, add-client, add-job-offer, profile, archived) include: header-runtime.js, entity-actions-runtime.js, session-ready.js, and the same core/runtime order up to app-shell.  
   - Deviations are only documented page-specific additions (queries, activity-section, feature scripts).

3. **`candidate.html` includes the missing required scripts**  
   **Verified.**  
   - `candidate.html` now includes `runtime/header-runtime.js` and `runtime/entity-actions-runtime.js` after `runtime/job-offer-runtime.js` and before `runtime/page-bootstrap.js`, matching the baseline.  
   - It also includes `core/session-ready.js` after `core/auth.js`.

4. **Session checks are reduced through the new minimal session-ready abstraction**  
   **Verified.**  
   - Guard: uses `getSessionReady()` (one getSession) then `checkAuth(cachedSession)`; no second getSession in checkAuth when cache is valid.  
   - `loadCurrentUserProfile()`: uses `getSessionReady()` when `IESessionReady` is available instead of calling `IEAuth.getSession()` again.  
   - Bootstrap re-validation (after sidebar and in catch/else): uses `getSessionReady()` and passes result to `checkAuth(cached)` so no extra getSession.  
   - So during a single protected page load, session is resolved once and reused; repeated session fetches in guard/profile/bootstrap are reduced.

5. **Bootstrap / script loading flow is documented in `portal/docs/`**  
   **Verified.**  
   - `portal/docs/BOOTSTRAP-AND-SCRIPTS.md` describes: protected page boot sequence (parse time, guard, DOMContentLoaded, bootstrap, header-loaded), required script baseline with order, page-specific scripts, session-ready abstraction, why duplicate layout init was risky and how it was fixed, and how to keep new pages aligned.  
   - The doc matches the current code: single initLayout call from bootstrap, session-ready used in app-shell and page-bootstrap and profile-runtime, baseline list matches the scripts in the protected HTML files.

---

## E. Architectural risk explanation

These fixes reduce risk without redesigning the system because:

- **Duplicate layout init** is removed by making layout idempotent and using a single call site. That prevents listener and MutationObserver buildup, avoids subtle bugs from multiple handlers firing, and keeps layout ownership clear (bootstrap owns init; header event only updates content).

- **Standardized script baseline and candidate.html** remove page-to-page drift and the class of bug where one page (e.g. candidate detail) misses header or entity-actions because scripts were omitted. New pages can copy a known-good block and stay consistent.

- **Session-ready** gives boot a single resolved session per load and reuses it in guard, profile, and bootstrap. That cuts redundant Supabase session calls during startup, makes auth/session ordering predictable, and avoids future regressions where new code adds more getSession/checkAuth calls without a shared abstraction.

- **Documentation** (BOOTSTRAP-AND-SCRIPTS.md and STABILIZATION-FINDINGS.md) makes the boot model and script contract explicit. Future changes (new pages, new runtimes, or session/layout tweaks) can stay aligned by following the doc, and onboarding is easier with one place to read the flow and baseline.

All changes are small, targeted, and backward compatible: idempotency guard, one call site removed, scripts added, optional use of session-ready with fallbacks, and docs. No refactor of business logic, queries, or overall architecture.
