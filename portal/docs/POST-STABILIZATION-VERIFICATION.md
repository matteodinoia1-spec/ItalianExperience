# Post-stabilization verification and hardening review

**Date:** March 7, 2025  
**Scope:** Strict verification of the frontend stabilization pass; no refactor.

---

## A. Verification summary

**Verdict: Safe with minor issues (addressed by small hardening fixes).**

One edge case was found and fixed: the sidebar toggle in the header (`layout/header.html`) is injected after bootstrap runs, so when `initLayout()` was only called once from page-bootstrap, the header hamburger could load after layout init and never get bound. A minimal hardening change was applied: `initLayout()` when already initialized now only binds any new toggle buttons (no duplicate listeners/observers), and the `ie:header-loaded` listener again calls `initLayout()` so the header toggle is bound when the header fragment loads. Documentation was updated to match.

All other checks passed: layout idempotency is correct, session-ready lifecycle is safe, protected-page baseline is compliant, load order is correct, and docs match the code (after the doc updates above).

---

## B. Detailed verification table

| Area | Status | Evidence | Issue found |
|------|--------|----------|-------------|
| **1. Layout idempotency safety** | Pass (after hardening) | `layout-runtime.js`: `layoutInitialized` guard; when `true`, only `headerToggleButtons.forEach` runs (bind new toggles), then return. Single full init from page-bootstrap; second call from `ie:header-loaded` only binds header button. No duplicate document/window/overlay listeners or MutationObserver. | **Edge case (fixed):** Toggle lives in header; header loads async. If initLayout ran only once (before header), the hamburger was never bound. Fix: when already initialized, initLayout still binds new toggles; header-runtime calls initLayout on `ie:header-loaded`. |
| **2. Header and layout interaction** | Pass (after hardening) | Layout does not depend on header for sizing/offset/sticky; it only needs sidebar + overlay + toggle buttons. Toggle buttons are in header; without re-calling initLayout on header-loaded, the header toggle was not bound. Fix restores that without duplicating listeners. No other header-dependent layout logic found. | See above; fixed. |
| **3. Protected-page baseline compliance** | Pass | See Table C. All 12 protected HTML pages include the required baseline in correct order; candidate.html has header-runtime and entity-actions-runtime; all have session-ready.js after auth. | None. |
| **4. Session-ready lifecycle safety** | Pass | session-ready.js: single `cachedPromise` per page load; no reset. Logout redirects to index.html (full reload), so cache does not persist across auth change. checkAuth(undefined) falls through to requireAuth(). App-shell and page-bootstrap use getSessionReady() when available and pass result to checkAuth(); profile uses getSessionReady() then fallback getSession(). | None. |
| **5. Load-order dependency safety** | Pass | session-ready.js loads after auth.js and before router.js on all protected pages. header-runtime and entity-actions-runtime load after job-offer-runtime and before page-bootstrap everywhere. No undocumented order exceptions. | None. |
| **6. Documentation truthfulness** | Pass (after updates) | BOOTSTRAP-AND-SCRIPTS.md: updated to state that ie:header-loaded calls initLayout() again (to bind header toggle) and that initLayout when already initialized only binds new buttons. STABILIZATION-FINDINGS.md: section A is pre-change findings; authoritative baseline is BOOTSTRAP-AND-SCRIPTS.md. | Doc previously said "does not call initLayout() again"; updated to match actual behavior (call again for button binding). |

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

**Baseline requirements checked:** header-loader, debug, supabase CDN, supabase.js, auth.js, **session-ready.js**, router.js, router-runtime, layout-runtime, sidebar-runtime, forms, modals, profile, status, associations, candidate-profile, candidate-runtime, client-runtime, job-offer-runtime, **header-runtime**, **entity-actions-runtime**, page-bootstrap, page-header, entity-toolbar, lists-runtime, session/session.js, ui/modals, ui/previews, app-shell. All pages have these in the documented order. candidate.html is aligned (includes header-runtime and entity-actions-runtime).

---

## D. Small hardening fixes applied

| File | Exact issue | Why necessary | Why low risk |
|------|-------------|---------------|--------------|
| portal/runtime/layout-runtime.js | When `layoutInitialized` was true, initLayout returned immediately, so toggle buttons injected later (in header) were never bound. | The sidebar hamburger lives in `layout/header.html`, which loads async. Bootstrap runs initLayout before header is guaranteed to be in the DOM, so the header toggle could be missing at bind time. | When already initialized we only run the same toggle-binding forEach (with __ieSidebarToggleBound guard); we do not re-add overlay/document/window listeners or MutationObserver. |
| portal/runtime/header-runtime.js | initLayout() had been removed from ie:header-loaded to avoid duplicate init; that left the header toggle unbound when header loads after bootstrap. | Restore calling initLayout() when header loads so the newly injected button gets bound. | initLayout is idempotent: second call only binds new buttons and returns; no duplicate listeners. |
| portal/docs/BOOTSTRAP-AND-SCRIPTS.md | Section 1 said header-runtime "does not call initLayout() again"; Section 5 said the second call site was removed. | Docs must match code after restoring the initLayout call for header toggle binding. | Text-only update; no behavior change. |

---

## E. Final verdict

**This stabilization step can be considered complete.**

- Layout init is idempotent and safe: one full run from bootstrap, optional second run on header-loaded that only binds new toggle buttons. No duplicate listeners or observers.
- Protected pages share a single script baseline; candidate.html is aligned; session-ready is used consistently and safely.
- One real edge case (header toggle not bound) was found and fixed with minimal, low-risk changes. Documentation now matches the implementation.

No further refactors or speculative improvements were applied; the verification and hardening pass is complete.
