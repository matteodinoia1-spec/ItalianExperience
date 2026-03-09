# Portal Global Header, Search, and Add — Plan and Implementation Progress

This document is the source of truth for the global header (search + Add dropdown), responsive strategy, and phased implementation. The full audit and phased plan are in the Cursor plan: **Portal Global Header Audit**.

---

## Implementation Progress

### Phase 1 — Header actions shell (DONE)

**Goal:** Introduce a non-breaking global header actions shell (search trigger placeholder + working Add dropdown). No removal of existing nav dropdowns or page-level add buttons.

#### What was implemented

- **Right-side header actions area** (`.portal-header-actions`) in the header, to the left of the user/profile block.
- **Global search trigger:** Button with `data-global-search-trigger`, `aria-label="Search portal"`, icon-only. No real search behavior in this phase; structure ready for a later phase.
- **Global Add control:** “+ Add” button (`data-global-add-trigger`) with a dropdown containing:
  - Add Candidate → `add-candidate.html`
  - Add Job Offer → `add-job-offer.html?mode=create`
  - Add Client → `add-client.html`
- **Add dropdown behavior:** Opens on click, closes on outside click, closes on Escape. Three actions use `IERouter.navigateTo(...)` (same targets as `app-shell` `initButtons`). Available on every page where the shared header loads.
- **Responsive (Phase 1 scope):**
  - **Desktop / tablet:** Header actions sit to the left of the profile/user area.
  - **Mobile (max-width: 768px):** Profile/user area is hidden in the header. Page title remains on the left; search trigger and Add trigger remain on the right. Bottom nav More (Settings, Logout) unchanged.

#### Files changed

| File | Change |
|------|--------|
| `portal/layout/header.html` | Added `.portal-header-actions` with search trigger button and Add trigger + dropdown (3 links). |
| `portal/styles/components/layout.css` | Added `.portal-header-actions` and related classes; mobile: hide `.portal-header-user-area`, 44px min tap targets for action buttons. |
| `portal/runtime/global-header-actions-runtime.js` | **New.** Listens for `ie:header-loaded`, inits Add dropdown (toggle, outside click, Escape), wires menu links to router; search trigger no-op for now. |
| Portal HTML pages (12) | Inserted `<script src="runtime/global-header-actions-runtime.js"></script>` after `header-runtime.js`. |

**Portal pages updated:** `dashboard.html`, `candidates.html`, `clients.html`, `job-offers.html`, `applications.html`, `application.html`, `archived.html`, `add-candidate.html`, `add-job-offer.html`, `add-client.html`, `candidate.html`, `profile.html`.

#### What remains for later phases

- **Global search:** Real search UI and data (panel, input, debounce, Supabase search, grouped results). Search trigger is placeholder only in Phase 1.
- **Nav dropdowns:** Still present (Candidates, Job Offers, Clients submenus). Remove in a later phase after global Add is confirmed.
- **Page-level add buttons:** Still present on candidates, job-offers, clients list pages. Remove or hide in a later phase.
- **Tablet:** Known gap (769–1023px: no nav, no page title in header) unchanged; optional follow-up.

#### Responsive notes from implementation

- Mobile: Hiding `.portal-header-user-area` with `display: none !important` in the same `@media (max-width: 768px)` block where other mobile header rules live keeps behavior consistent. Settings and Logout remain in bottom nav More.
- Add dropdown uses the same component and positioning (right-aligned under the trigger) on desktop and mobile; 44px minimum tap targets added for the action buttons on mobile.

---

### Phase 2 — Remove nav entity dropdowns (DONE)

**Goal:** Remove the nav entity dropdowns (Candidates, Job Offers, Clients) from the header navigation and convert those items into simple links. The global "+ Add" dropdown remains the only header-level entry point for creating entities.

#### What was implemented

- **Header navigation simplified:** The three items that previously used `.portal-header-nav__item-with-sub` and `.portal-header-nav__sub` (each with a single “Add” sublink) are now plain links:
  - **Candidates** → link to `candidates.html`
  - **Job Offers** → link to `job-offers.html`
  - **Clients** → link to `clients.html`
- **Submenu structure removed:** No more wrapper divs or `<ul>` submenus in the nav. Dashboard, Applications, and Archived were unchanged.
- **CSS cleanup:** Styles for `.portal-header-nav__item-with-sub`, `.portal-header-nav__sub`, `.portal-header-nav__sublink`, and related hover/Open states were removed from `portal/styles/components/layout.css` (no longer used).
- **Runtime compatibility:** `portal/runtime/header-runtime.js` was verified; active nav state uses `.portal-header-nav__link[data-nav-group]` and link normalization uses `a[href]` only — no dependency on the old submenu DOM. Add dropdown close-on-outside and user menu behavior unchanged.

#### Files modified

| File | Change |
|------|--------|
| `portal/layout/header.html` | Replaced three nav items (Candidates, Job Offers, Clients) from dropdown structure to simple `<a class="portal-header-nav__link" href="…" data-nav-group="…">` links. |
| `portal/styles/components/layout.css` | Removed nav submenu styles: `.portal-header-nav__item-with-sub`, `.portal-header-nav__sub`, `.portal-header-nav__sublink`, and associated rules. Updated nav comment. |

#### Confirmations

- **Global "+ Add" dropdown:** Unchanged; still the only header-level creation entry point (Add Candidate, Add Job Offer, Add Client).
- **Page-level add buttons:** Still present on candidates.html, job-offers.html, and clients.html (not removed in this phase).
- **Nav dropdowns:** Fully removed for Candidates, Job Offers, and Clients; nav now uses simple links only.
- **Navigation links:** Dashboard, Candidates, Job Offers, Applications, Clients, Archived all work as before; active state and link normalization unchanged.
- **Header layout:** Desktop (≥1024px) and mobile (<768px) layout unchanged; nav alignment and spacing preserved.

#### Responsive validation

- **Desktop (≥1024px):** Nav items align correctly with consistent gap; no submenus.
- **Tablet (769–1023px):** Nav remains hidden (`hidden lg:flex`); behavior unchanged.
- **Mobile (<768px):** Header still shows page title + search + Add; bottom nav unchanged.

---

### Phase 3A — Global Search Shell (DONE)

**Goal:** Implement the global search **interface and interaction only**. No Supabase queries or real data yet; placeholder results only. Search remains a header-attached panel.

#### UI structure

- **Container:** `.portal-header-search-panel` (`#portal-header-search-panel`), inside the header, directly under `.portal-header__inner`. Role `dialog`, `aria-label="Search portal"`, `aria-modal="true"`.
- **Input:** Single text input with `data-global-search-input`, placeholder "Search candidates, clients, job offers...", `autocomplete="off"`.
- **Results container:** `.portal-header-search-results` with three placeholder groups:
  - **Candidates** — `.portal-header-search-group` (aria-label "Candidates")
  - **Job Offers** — idem
  - **Clients** — idem  
  Each group has a title (`.portal-header-search-group__title`) and items (`.portal-header-search-group__items`) containing a single placeholder line: "Start typing to search" (`.portal-header-search-placeholder`). Real result rows and data integration are deferred to Phase 3B.

#### Files added

None (all changes are in existing files).

#### Files modified

| File | Change |
|------|--------|
| `portal/layout/header.html` | Added `.portal-header-search-panel` with input, `.portal-header-search-results`, and three placeholder groups (Candidates, Job Offers, Clients). |
| `portal/styles/components/layout.css` | Added styles for `.portal-header-search-panel`, input, results area, groups, placeholder text; desktop (floating panel ~450px, under header); mobile (full-width panel below header, 16px input font to avoid iOS zoom). |
| `portal/runtime/global-header-actions-runtime.js` | Search panel open/close, toggle on trigger click, focus input on open, close on Escape, close on outside click, `aria-expanded` on trigger. No data queries. |
| `portal/docs/PORTAL-GLOBAL-HEADER-SEARCH-ADD-PLAN.md` | This section and Phase 3A documentation. |

#### Runtime behavior

- **Initialization:** Same as Phase 1 — after `ie:header-loaded` (or on DOM ready if header already present). No new script file; logic lives in `global-header-actions-runtime.js`.
- **Open:** Click on `[data-global-search-trigger]` opens the panel, removes `hidden`, adds `portal-header-search-panel--open`, sets trigger `aria-expanded="true"`, focuses the search input. Add dropdown is closed when opening search.
- **Close:** Panel closes when: (1) clicking the search trigger again, (2) pressing Escape, (3) clicking outside the panel (and not on the trigger). On close, panel gets `hidden`, trigger `aria-expanded="false"`. Escape closes search first if open; otherwise closes Add dropdown.
- **Focus:** Input is focused when the panel opens. No debounce or input handlers yet (Phase 3B).

#### Responsive behavior

- **Desktop (≥769px):** Panel is a floating panel under the header, right-aligned, width ~450px (max), max-height ~420px; results scroll if needed. Glass-style background, subtle border and shadow.
- **Mobile (<768px):** Panel is full width, directly below the header; no overlap with bottom nav. Input has comfortable tap target and 16px font size to avoid iOS zoom. Same close behavior (Escape, outside tap, trigger).

#### Deferred to Phase 3B

- Supabase (or other) search queries.
- Debounced input handling.
- Real result rows and navigation to candidate/client/job-offer pages.
- Any removal of page-level add buttons or changes to nav/routing.

---

### Phase 3B — Global Search Data Integration (DONE)

**Goal:** Connect the global search panel to real data. Single unified result list; no visible fixed category sections. Minimal, premium search experience.

#### Design direction

- **No fixed category sections** — When the panel opens, no "Candidates", "Job Offers", "Clients" headers are shown.
- **Idle:** Input empty → show "Start typing to search".
- **When user types:** Single unified list of relevant results; each row shows primary title and a subtle entity-type subtitle (Candidate, Job Offer, Client).

#### Data sources

| Entity | Source | Notes |
|--------|--------|--------|
| Candidates | `IESupabase.searchCandidatesByName({ term, limit: 5 })` | Existing helper; name search (first/last). |
| Clients | `IESupabase.searchClientsByName({ term, limit: 5 })` | Existing helper; name search. |
| Job Offers | `IESupabase.searchJobOffersByTitle({ term, limit: 5 })` | **New** in Phase 3B (see below). |

#### Job offer search helper

- **Added:** `searchJobOffersByTitle(opts)` in `portal/core/supabase.js`.
- **Signature:** `{ term: string, limit?: number }` → `Promise<{ data: Array<{ id, title, position }>, error }>`.
- **Behavior:** `ilike` on `title` and `position`; excludes archived; limit default 5, max 20. Exported on `window.IESupabase`.

#### Normalization strategy

All results are normalized to a single shape and merged into one array:

- `{ type: "candidate" | "job-offer" | "client", id, title, subtitle, href }`
- **Candidate:** title = full name (first + last), subtitle = "Candidate".
- **Job Offer:** title = offer title (or position fallback), subtitle = "Job Offer".
- **Client:** title = client name, subtitle = "Client".

No visible grouped sections; one list only.

#### Rendered states

1. **Idle** — Input empty; show "Start typing to search".
2. **Loading** — Debounced search in progress; show "Searching...".
3. **Results** — Single unified list; each row: title + subtle subtitle (entity type).
4. **Empty** — Non-empty search returned no results; show "No results found".
5. **Error** — A query failed; show "Search unavailable".

#### Result click behavior

- Each result row is a link. Click navigates via `IERouter.navigateTo(href)` (or `location.href` fallback).
- **Targets:** Candidate → `candidate.html?id=…`; Client → `add-client.html?id=…&mode=view`; Job Offer → `add-job-offer.html?id=…&mode=view`. Uses `window.IEPortal.links` when available.
- After click: search panel closes; navigation proceeds as usual.

#### Runtime (global-header-actions-runtime.js)

- **Debounce:** 280 ms; search only when input has meaningful content (trimmed); clear previous results when input is cleared (restore idle).
- **Input listener:** `input` event → debounce → run search; Escape on input closes panel.
- **Race handling:** When search resolves, compare current input to the term that was searched; only update UI if they match (avoids stale results).
- **Result click:** Delegated on `[data-global-search-results]`; prevent default, navigate, close panel.

#### Files modified

| File | Change |
|------|--------|
| `portal/core/supabase.js` | Added `searchJobOffersByTitle(opts)`; exported. |
| `portal/layout/header.html` | Replaced three category sections with single `.portal-header-search-results` and one placeholder; added `data-global-search-results`, `aria-live="polite"`. |
| `portal/runtime/global-header-actions-runtime.js` | Phase 3B: debounced input, `runGlobalSearch`, normalizers, render states (idle/loading/empty/error/results), result click → navigate + close. |
| `portal/styles/components/layout.css` | Unified result list: `.portal-header-search-list`, `.portal-header-search-result-row`, `__title`, `__subtitle`; `.portal-header-search-placeholder--error`; placeholder horizontal padding in results. |
| `portal/docs/PORTAL-GLOBAL-HEADER-SEARCH-ADD-PLAN.md` | This section. |

#### What remains for later phases

- Bottom navigation unchanged.
- No dedicated search page; no ranking logic beyond per-entity limits (5 per type).
- Optional: keyboard navigation within results (e.g. arrow keys, Enter to open).

---

### Phase 6 — Remove page-level add buttons (DONE)

**Goal:** Make the global "+ Add" dropdown in the header the single primary creation entry point. Remove redundant page-level entity creation buttons from list pages.

#### What was implemented

- **Page-level add buttons removed** from:
  - **Candidates** (`portal/candidates.html`): "Add Candidate" button (`data-action="add-candidate"`) and its `.page-list-actions` wrapper.
  - **Job Offers** (`portal/job-offers.html`): "Create Job Offer" button (`data-action="add-job-offer"`) and its `.page-list-actions` wrapper.
  - **Clients** (`portal/clients.html`): "Add Customer" button (`data-action="add-client"`) and its `.page-list-actions` wrapper.
- **Layout:** The entire `.page-list-actions` block was removed on each page (it contained only the single add button). No empty wrappers left. The next sibling in the main column is `.page-filters-trigger-wrap` (Filters button), so layout and spacing remain stable.
- **No changes to:** Global Add dropdown, global search, bottom navigation, routing, page filters, or any non-add page actions.

#### Files modified

| File | Change |
|------|--------|
| `portal/candidates.html` | Removed `.page-list-actions` block containing Add Candidate button. |
| `portal/job-offers.html` | Removed `.page-list-actions` block containing Create Job Offer button. |
| `portal/clients.html` | Removed `.page-list-actions` block containing Add Customer button. |
| `portal/docs/PORTAL-GLOBAL-HEADER-SEARCH-ADD-PLAN.md` | This section; phases overview and Phase 3B "What remains" updated. |

#### Runtime / JS impact

- **app-shell.js** `initButtons()`: Still queries for `[data-action="add-candidate"]`, `[data-action="add-job-offer"]`, and `[data-action="add-client"]`. On list pages those elements no longer exist, so `querySelector` returns `null` and the existing `if (addCandidateBtn)` (etc.) guards prevent attaching listeners. No errors; behavior is harmless. This shared add-button wiring is **legacy/dead on list pages** and can be cleaned up in a later pass if desired; it remains useful on any other page that might still expose such buttons (e.g. form or detail pages are out of scope for this phase).
- **No other runtime or module** depends on these page-level add buttons being present. Global Add is handled by `global-header-actions-runtime.js`; list pages no longer have a second creation entry point.

#### Confirmations

- **Global "+ Add"** is now the only visible creation entry point for Candidates, Job Offers, and Clients.
- **Candidates, Job Offers, and Clients list pages** still work; filters, tables, and pagination unchanged.
- **Page filters** (filter column, filter drawer, filter trigger) unchanged.
- **Layout** remains stable; no empty wrappers or alignment artifacts.
- **Bottom navigation** unchanged.
- **No new creation entry points** were introduced.

#### Deferred to later cleanup (optional)

- Remove or narrow `initButtons()` add-candidate / add-job-offer / add-client wiring in `app-shell.js` if no other pages use those `data-action` buttons, to avoid dead code.

---

## Phases overview (from audit)

| Phase | Purpose | Status |
|-------|---------|--------|
| 1 | Header actions shell (search trigger + Add dropdown) | **Done** |
| 2 | Validate layout/responsive; hide profile on mobile | Covered in Phase 1 (profile hidden on mobile) |
| 3 | Global Add behavior (navigate to add-* pages) | Done in Phase 1 (dropdown navigates) |
| 4 | Remove nav entity dropdowns | **Done** (Phase 2 implementation) |
| 3A | Global search shell (UI + interaction only) | **Done** |
| 3B | Global search data (Supabase, unified results) | **Done** |
| 6 | Remove page-level add buttons | **Done** |
| 7+ | Polish, QA, tablet gap | Not started |

---

---

## Final QA and Responsive Audit

**Date:** March 2025  
**Scope:** Post–Phase 6 QA; tablet usability; global search and Add validation; layout regression; dead code review; performance check.

### Tablet behavior findings

| Breakpoint | Nav | Page title | Search | + Add | Profile |
|------------|-----|------------|--------|-------|---------|
| **< 768px (mobile)** | Hidden | Visible (left) | Visible (right) | Visible (right) | Hidden |
| **769–1023px (tablet)** | Hidden | **Visible (left)** — *fix applied* | Visible (right) | Visible (right) | Visible (right) |
| **≥ 1024px (desktop)** | Visible (left) | Hidden | Visible (right) | Visible (right) | Visible (right) |

**Tablet gap (769–1023px):** Previously, the header left side was empty: nav uses `hidden lg:flex` (visible at 1024px+), and the page title was only shown at `max-width: 768px`. Tablet users had no visible navigation context in the header.

### Fix applied

**Option A — Show page title in header on tablet (minimal fix):**

- Added `@media (min-width: 769px) and (max-width: 1023px)` in `portal/styles/components/layout.css` to display `.portal-header__page-title` on tablet.
- Reuses the same styling as mobile (font-size, weight, ellipsis).
- No structural changes; no new DOM or JS.

### QA results — Global search

| Check | Result |
|-------|--------|
| Debounce (280 ms) | ✓ Implemented in `onSearchInput()` |
| Unified results list | ✓ Single list; no category headers |
| Idle / loading / empty / error states | ✓ All rendered |
| Click result → navigate | ✓ Delegated on `[data-global-search-results]`; closes panel |
| Outside click closes | ✓ Document listener |
| Escape closes | ✓ Keydown listener; search first, then Add |
| Panel alignment desktop | ✓ Right-aligned, ~450px width |
| Full-width mobile | ✓ `left: 0; right: 0; width: 100%` at max-width 768px |
| No category headers | ✓ Confirmed |
| No visual overflow | ✓ `overflow-y: auto` on results |

### QA results — Global Add

| Check | Result |
|-------|--------|
| Dropdown positioning | ✓ Right-aligned under trigger |
| Outside click closes | ✓ Document listener (close when not inside `.portal-header-actions`) |
| Escape closes | ✓ Keydown listener |
| Navigation to add pages | ✓ All three links use `IERouter.navigateTo` |
| Mobile / tablet usability | ✓ 44px min tap targets on mobile; same dropdown on all breakpoints |
| Only creation entry point | ✓ Page-level add buttons removed in Phase 6 |

### Layout regression check (candidates, job-offers, clients)

| Page | Filters alignment | First content block | Table header | Empty state |
|------|-------------------|---------------------|--------------|-------------|
| candidates | ✓ `.page-filters-trigger-wrap` first in main column | ✓ Direct to table card | ✓ Unchanged | ✓ Unchanged |
| job-offers | ✓ Same structure | ✓ Same | ✓ Unchanged | ✓ Unchanged |
| clients | ✓ Same structure | ✓ Same | ✓ Unchanged | ✓ Unchanged |

No layout issues from removing `.page-list-actions`; `.page-filters-trigger-wrap` is the first sibling in `.page-main-column`.

### Dead code / cleanup opportunities

| Item | Location | Notes |
|------|----------|-------|
| `.page-list-actions` CSS | `layout.css` lines 1051–1057 | Still used by docs/audits; no HTML uses it on list pages. Safe to remove in a later pass if no other pages use it. |
| `initButtons()` add-candidate / add-job-offer / add-client | `app-shell.js` | List pages no longer have those `data-action` elements; `querySelector` returns null, guards prevent errors. Form/detail pages may still use `data-action` (e.g. entity-toolbar). **Do not remove** without verifying all pages. |
| Nav submenu CSS | Already removed in Phase 2 | N/A |
| DOM selectors for removed elements | None found | No orphaned selectors. |

**Recommendation:** Keep `initButtons()` wiring; it is harmless when elements are absent and may be used on form/detail pages. Remove `.page-list-actions` CSS only after confirming no page uses it.

### Performance notes

| Check | Result |
|-------|--------|
| Excessive re-renders | ✓ Single `innerHTML` or `appendChild` per state change |
| Unnecessary DOM rebuilding | ✓ Replaces results container content only when state changes |
| Duplicate query execution | ✓ Race handling: compares `currentTerm` to `lastSearchTerm` before updating UI |
| Debouncing | ✓ 280 ms; clears timer when input cleared |

### Possible cleanup tasks (later maintenance)

1. Remove `.page-list-actions` CSS if no page uses it.
2. Consider narrowing `initButtons()` to only pages that expose add buttons (if any).
3. Optional: keyboard navigation within search results (arrow keys, Enter).

### Recommended next improvements

1. **Tablet:** Current fix (page title) is sufficient. Option B (expose nav earlier) or C (hamburger) could be revisited if user feedback suggests need for nav on tablet.
2. **Search:** Add keyboard navigation (arrow keys, Enter) for accessibility.
3. **Labels:** Ensure "Add Client" is used consistently (clients.html previously used "Add Customer"; now removed).

---

## Related docs

- **LAYOUT-AUDIT.md** — General layout and breakpoints.
- **PORTAL-FRONTEND-ARCHITECTURE-AUDIT.md** — Bootstrap and script order.
- **BOOTSTRAP-AND-SCRIPTS.md** — Script load order; global header actions runtime runs after `ie:header-loaded` (after header-runtime).
