# Post-stabilization verification and hardening review

**Date:** March 7, 2025  
**Scope:** Strict verification of the frontend stabilization pass; no refactor.

**Note (post bottom-nav refactor):** The shell no longer uses layout or sidebar. `header-loader.js` mounts header, bottom nav, and footer; `ie:header-loaded` fires when all three are in place. Page-bootstrap runs header init, page initializers, then dynamically loads and runs `bottom-nav-runtime.js`. There is no `layout-runtime.js` or `sidebar-runtime.js`. Bottom-nav-runtime is loaded by page-bootstrap, not in the static script baseline.

---

## A. Verification summary

**Verdict: Safe with minor issues (addressed by small hardening fixes).**

*(Historical:)* The stabilization pass addressed duplicate layout init and script baseline; later the bottom-nav refactor removed layout-runtime and sidebar-runtime. Current state: shell = header + bottom nav + footer; bottom-nav loaded by page-bootstrap.

Checks: session-ready lifecycle is safe, protected-page baseline is compliant (see BOOTSTRAP-AND-SCRIPTS.md), load order is correct.

---

## B. Detailed verification table

| Area | Status | Evidence | Issue found |
|------|--------|----------|-------------|
| **1. Shell / layout** | N/A (obsolete) | layout-runtime and sidebar-runtime were removed. Shell = header + bottom nav + footer; no layout init. | — |
| **2. Header and bottom nav** | Pass | Header-runtime handles breadcrumbs and header nav on `ie:header-loaded`. Bottom-nav-runtime is loaded by page-bootstrap and runs `initBottomNav(pageKey)`. | — |
| **3. Protected-page baseline compliance** | Pass | See Table C. All 12 protected HTML pages include the required baseline in correct order; candidate.html has header-runtime and entity-actions-runtime; all have session-ready.js after auth. | None. |
| **4. Session-ready lifecycle safety** | Pass | session-ready.js: single `cachedPromise` per page load; no reset. Logout redirects to index.html (full reload), so cache does not persist across auth change. checkAuth(undefined) falls through to requireAuth(). App-shell and page-bootstrap use getSessionReady() when available and pass result to checkAuth(); profile uses getSessionReady() then fallback getSession(). | None. |
| **5. Load-order dependency safety** | Pass | session-ready.js loads after auth.js and before router.js on all protected pages. header-runtime and entity-actions-runtime load after job-offer-runtime and before page-bootstrap everywhere. No undocumented order exceptions. | None. |
| **6. Documentation truthfulness** | Pass | BOOTSTRAP-AND-SCRIPTS.md: header-runtime does **not** call initLayout() on ie:header-loaded; layout init is solely from page-bootstrap. STABILIZATION-FINDINGS.md: section A is pre-change findings; authoritative baseline is BOOTSTRAP-AND-SCRIPTS.md. | Phase 6 state. |

---

## C. HTML baseline compliance table

| Page | Matches baseline | Missing scripts | Extra scripts | Order issues |
|------|------------------|-----------------|---------------|--------------|
| dashboard.html | Yes | None | None | None |
| candidates.html | Yes | None | None | None |
| candidate.html | Yes | None | features/candidates/candidate.js (page-specific, allowed) | None |
| applications.html | Yes | None | queries (3), features/applications/applications.js (allowed) | None |
| application.html | Yes | None | queries/applications.queries.js, activity-section, application-detail (allowed) | None |
| job-offers.html | Yes | None | None | None |
| clients.html | Yes | None | None | None |
| add-candidate.html | Yes | None | activity-section (allowed) | None |
| add-client.html | Yes | None | activity-section (allowed) | None |
| add-job-offer.html | Yes | None | activity-section (allowed) | None |
| profile.html | Yes | None | features/profile/profile.js (allowed) | None |
| archived.html | Yes | None | queries/applications.queries.js, features/archived/archived.js (allowed) | None |

**Baseline requirements checked:** header-loader, debug, supabase CDN, supabase.js, auth.js, **session-ready.js**, router.js, router-runtime, forms, modals, profile, status, associations, candidate-profile, candidate-runtime, client-runtime, job-offer-runtime, **header-runtime**, **entity-actions-runtime**, page-bootstrap, page-header, entity-toolbar, lists-runtime, session/session.js, ui/modals, ui/previews, app-shell. No layout-runtime or sidebar-runtime (removed). Bottom-nav-runtime is loaded dynamically by page-bootstrap. candidate.html is aligned (includes header-runtime and entity-actions-runtime).

---

## D. Small hardening fixes applied (historical)

*(Phase 6 sidebar cleanup reversed the initLayout call in header-runtime. Current state: layout init is solely from page-bootstrap.)*

| File | Historical issue | Current state |
|------|------------------|---------------|
| portal/runtime/layout-runtime.js | — | Removed in bottom-nav refactor. |
| portal/runtime/sidebar-runtime.js | — | Removed in bottom-nav refactor. |
| portal/docs/BOOTSTRAP-AND-SCRIPTS.md | — | Docs reflect current shell: header + bottom nav + footer; no layout/sidebar runtime. |

---

## E. Final verdict

**This stabilization step can be considered complete.**

- Shell is header + bottom nav + footer; no layout or sidebar runtime. Bottom-nav-runtime is loaded by page-bootstrap.
- Protected pages share a single script baseline (see BOOTSTRAP-AND-SCRIPTS.md); candidate.html is aligned; session-ready is used consistently.
- Documentation now matches the implementation (post bottom-nav refactor).

No further refactors or speculative improvements were applied; the verification and hardening pass is complete.
