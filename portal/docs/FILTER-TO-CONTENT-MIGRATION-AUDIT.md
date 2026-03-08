# Filter-to-Content Migration — Audit & Plan

**Goal:** Gradually remove the old top toolbar-based filter layout and move filters into the page content area (desktop: left column; mobile: TBD). This document is **audit + plan only** — no implementation.

---

## 1. Pages audited

| Page | Toolbar filters? | Toolbar actions? | Content structure |
|------|------------------|------------------|-------------------|
| **candidates.html** | Yes | Add Candidate | Table + offer-filter banner + pagination |
| **job-offers.html** | Yes | Create Job Offer | Table + client-filter banner + pagination |
| **applications.html** | Yes | List/Pipeline toggle (no Add) | Pipeline bar + list/pipeline views + pagination |
| **clients.html** | Yes | Add Customer | Table + pagination |
| **archived.html** | No (empty) | None | Per-section filters in content (search by id) + 3 tables |
| **application.html** (detail) | No (empty filters div) | Entity actions (id=applicationActions) | Header card + pipeline + content |
| **dashboard.html** | No | None | Cards + recent table + sources |
| **add-candidate.html** | No | Back / entity actions | Form |
| **add-job-offer.html** | No | Back / entity actions | Form |
| **add-client.html** | No | Back / entity actions | Form |
| **candidate.html** (profile) | No | Entity actions | Profile + activity |
| **profile.html** | No | None | Profile content |

**Relevant for filter migration (toolbar filters today):**

- `candidates.html`
- `job-offers.html`
- `applications.html`
- `clients.html`

**Not relevant (no list filters in toolbar):** archived (filters already in content), dashboard, add-*, candidate profile, application detail, profile.

---

## 2. Current filter map by page

### A. candidates.html

| Where | What | data-filter / id | Wired in JS |
|-------|------|-------------------|-------------|
| Toolbar left | Search by name | `data-filter="candidate-name"` | `lists-runtime.js` initCandidatesPage: `document.querySelector('[data-filter="candidate-name"]')` + input → `filters.name`, `renderCandidates()` |
| Toolbar left | Availability | `data-filter="candidate-status"` | Same: statusSelect → `filters.status` |
| Toolbar left | Source | `data-filter="candidate-source"` | Same: sourceSelect → `filters.source` |
| Toolbar right | Add Candidate | `data-action="add-candidate"` | entity-actions / app-shell (navigation) |

**Optional in JS but not in HTML:** `candidate-position`, `candidate-address`, `candidate-archived` — code checks for elements and skips if missing.

**Content:** Offer filter banner `[data-ie-offer-filter-banner]`, `[data-action="clear-offer-filter"]`; table `[data-ie-candidates-body]`; pagination `[data-ie-pagination]` inside same `.glass-card`.

---

### B. job-offers.html

| Where | What | data-filter / id | Wired in JS |
|-------|------|-------------------|-------------|
| Toolbar left | Search title | `data-filter="offer-title"` | `lists-runtime.js` initJobOffersPage: titleInput → `filters.title` |
| Toolbar left | Client / Company | `data-filter="offer-client"` | clientSelect (populated by fetchClientsPaginated) → `filters.clientId` |
| Toolbar left | Offer status | `data-filter="offer-status"` | statusSelect → `filters.offerStatus` |
| Toolbar right | Create Job Offer | `data-action="add-job-offer"` | entity-actions |

**Optional in JS but not in HTML:** `offer-city`, `offer-state`, `offer-contract`, `offer-archived`.

**Content:** Client filter banner `[data-ie-client-filter-banner]`, `[data-action="clear-client-filter"]`; table `[data-ie-joboffers-body]`; pagination.

---

### C. applications.html

| Where | What | data-filter / id | Wired in JS |
|-------|------|-------------------|-------------|
| Toolbar left | Status | `data-filter="application-status"` | `lists-runtime.js` initApplicationsPage: statusSelect → `filters.status` |
| Toolbar left | Job Offer | `data-filter="application-offer"` | offerSelect (populated) → `filters.job_offer_id` |
| Toolbar left | Client | `data-filter="application-client"` | clientSelect (populated) → `filters.client_id` |
| Toolbar left | Candidate (search) | `data-filter="application-candidate"` | candidateInput → `filters.candidate_name` (client-side filter on result set) |
| Toolbar left | From date | `data-filter="application-date-from"` | dateFromInput → `filters.date_from` |
| Toolbar left | To date | `data-filter="application-date-to"` | dateToInput → `filters.date_to` |
| Toolbar right | List / Pipeline | `data-view-mode="list"` / `data-view-mode="pipeline"` | `features/applications/applications.js`: click on `[data-view-mode]`, toggles `[data-ie-applications-view="list"]` / `[data-ie-applications-view="pipeline"]` |

**Content:** Pipeline summary bar `[data-ie-applications-pipeline-bar]`, pipeline buttons `[data-pipeline-status]`; list view table; pipeline board; pagination.

---

### D. clients.html

| Where | What | data-filter / id | Wired in JS |
|-------|------|-------------------|-------------|
| Toolbar left | Search company | `data-filter="client-name"` | `lists-runtime.js` initClientsPage: nameInput → `filters.name` |
| Toolbar left | City | `data-filter="client-city"` | cityInput → `filters.city` |
| Toolbar left | State / Region | `data-filter="client-state"` | stateInput → `filters.state` |
| Toolbar right | Add Customer | `data-action="add-client"` | entity-actions |

**Optional in JS but not in HTML:** `client-country`, `client-archived`.

**Content:** Table `[data-ie-clients-body]`; pagination.

---

### E. archived.html (reference — filters already in content)

- Toolbar: `.portal-toolbar__filters` is empty.
- Filters live **in content** per section: `#search-candidates`, `#search-jobs`, `#search-clients` (no `data-filter`). Wired in `features/archived/archived.js` by id and `state.*.search`.

---

## 3. JS coupling summary

- **Filter wiring:** All list pages use **document-level** `document.querySelector('[data-filter="..."]')` in `core/lists-runtime.js`. There is **no** dependency on the toolbar DOM hierarchy. Moving the same elements into a left column (or a drawer) and keeping the `data-filter` attributes will work without changing JS.
- **Actions:** Buttons use `data-action` and are handled by entity-actions and app-shell; they are bound by delegation or by selector on the document. As long as the buttons remain in the DOM (e.g. in a slim toolbar or in content), behavior is unchanged.
- **Forms / entity toolbars:** `runtime/forms-runtime.js` uses `document.querySelectorAll(".portal-toolbar")` in `initEditToolbars()` to find cancel/save and entity-mode-indicator. That only requires **a** `.portal-toolbar` to exist on entity pages; it does not require filters to be inside it. So a reduced toolbar (actions only) still works.
- **Applications view toggle:** `features/applications/applications.js` uses `document.querySelector("[data-view-mode]")` and view containers; no dependency on toolbar structure.

**Conclusion:** No JS changes are strictly required for moving filter markup from toolbar to content, as long as `data-filter` and `data-action` attributes and element ids are preserved. Optional: scope selectors to a container (e.g. `contentArea.querySelector(...)`) for robustness if multiple instances ever exist.

---

## 4. Shared styles and layout

- **Toolbar:** `styles/components/toolbar.css` (flex for left/center/right, gaps). `styles/components/layout.css`: `.portal-toolbar` (sticky, `top: calc(header-height + safe-top)`), `.toolbar-inner` (flex, padding), `.toolbar-left` / `.toolbar-right`.
- **Filters:** `styles/components/filters.css`: `.filter-bar` (flex, wrap), `.filter-group`, `.filter-label`, `.filter-input`, `.filter-select`. Mobile: column layout, full width.
- **Content:** `.portal-content` (padding), `.page-container` (max-width, horizontal padding). Content is full width of container; no existing “sidebar + main” layout.

Important: **Sticky** is on `.portal-toolbar` relative to viewport (body scroll). The layout doc notes: avoid overflow/transform on the sticky element so stickiness is not broken. Any new sticky filter column must live in a scroll context that does not clip it (e.g. main content area with overflow visible or body as scroll container).

---

## 5. Recommended desktop layout pattern

### Structure

- **Introduce a two-column layout inside the content area** (inside `.page-container` / `.portal-content`), only for list pages that have filters:
  - **Left column (filter sidebar):** Fixed width (e.g. 260–280px), visually distinct (background, border or card), **sticky** within the content scroll so it stays visible while the list scrolls.
  - **Right column (main):** Remaining width; table/cards + pagination.

### CSS / layout approach

- Use a **wrapper** that exists only on “list with filters” pages, e.g.:
  - `.portal-content-with-filters` or `.page-layout-with-sidebar` wrapping:
    - `.page-filters-column` (left, fixed width, sticky)
    - `.page-main-column` (flex: 1, min-width: 0)
- **Sticky:** Apply `position: sticky; top: calc(var(--portal-header-height) + var(--portal-safe-top) + 0px);` (or a small offset if you keep a slim toolbar) to `.page-filters-column`. Ensure no ancestor between this column and the viewport has `overflow: hidden` or `overflow: auto` that would create a scroll container and break stickiness. Currently `portal-main` and body are set up so the viewport is the scroll container; the new layout should stay within that (e.g. content area is not a separate scroll region).
- **Width:** Left column `flex: 0 0 280px` (or similar); right `flex: 1 1 0; min-width: 0`. Use a single shared class so every list page uses the same layout.
- **Visual separation:** Light background (e.g. `bg-gray-50/80` or `glass-card`), border-right, padding, optional “Filters” heading. Reuse `.filter-bar` and `.filter-group` inside this column (stack vertically instead of horizontal wrap if desired).

### Reusable component / class

- **Shared class:** e.g. `.page-layout-with-filters` on a wrapper div that contains:
  - `.page-filters-column` (sticky, contains `.filter-bar` or stacked filter groups)
  - `.page-main-column` (table/cards)
- No new “component” JS is required: keep existing filter markup and `data-filter` attributes; only move the DOM and wrap with the new layout classes. Optionally add a small CSS-only “Filters” label in the left column.

### Toolbar after migration

- **Phase 1–3:** Keep the toolbar; put only **actions** in it (Add Candidate, Create Job Offer, List/Pipeline, Add Customer). Toolbar becomes a single row with no filters (or a “Filter” toggle on mobile only, see below). Height can be reduced (less padding) so it takes less space.
- **Phase 4:** Optionally remove the toolbar on list pages and move the primary action (e.g. “Add Candidate”) into the content (e.g. top-right of the main column or next to a page title). Then the toolbar can be removed or reserved for entity pages (edit/save/cancel).

---

## 6. Recommended mobile pattern

**Recommendation: Filter drawer / sheet (slide-up or slide-in).**

- **Do not** use a fixed left filter column on mobile (as requested).
- **Preferred:** A **drawer/sheet** that opens from the bottom (or from the side) when the user taps a “Filters” control. Inside the drawer: same filter fields (stacked), plus “Apply” / “Clear” and a way to close. List stays full width; filters are hidden until opened.
- **Why drawer over collapsible in-content panel:**
  - **Space:** Applications (and possibly others) have many filters; a collapsible panel would push the list down and still consume vertical space when “collapsed” (e.g. one line “Filters (3 active)”). A drawer keeps the list full screen and uses overlay/sheet space.
  - **Consistency:** One pattern for all list pages: “Filters” button → open drawer → change filters → apply/close. Collapsible panels can feel different per page (above table vs beside table).
  - **Existing precedent:** The portal already uses a “More” bottom sheet on mobile (`portal-bottom-nav__more`). A filter sheet would feel consistent and keeps implementation patterns (open/close, overlay, safe area) similar.
- **Implementation note (later):** One “Filters” button in the content area (or in a minimal toolbar row) that toggles visibility of a full-width sheet. Sheet content is the same filter form; JS stays the same (`data-filter` selectors). Optionally hide the desktop left column on small breakpoints and show the sheet instead.

**Alternative (if you prefer in-content):** A **collapsible filter card** at the top of the content (e.g. “Filters (3 active)” with chevron; expand to show all fields). Prefer this only if you want to avoid overlay UX or want filters always “on the page” for accessibility. It uses more vertical space when expanded.

---

## 7. Migration phases

### Phase 1 — First page to migrate (pilot)

- **Target: `clients.html`** (simplest: 3 filters + Add Customer).
- Tasks:
  - Add layout wrapper in content: e.g. `.page-layout-with-filters` with `.page-filters-column` and `.page-main-column`.
  - Move the three filter groups (company, city, state) from `.portal-toolbar__filters` into `.page-filters-column`. Keep all `data-filter` attributes.
  - Leave “Add Customer” in the toolbar (or move to main column header; your choice).
  - Add CSS for the two-column layout and sticky sidebar (desktop only).
  - On mobile (e.g. `max-width: 768px`): do **not** render the left column; show a “Filters” button that opens a drawer/sheet containing the same filter form (Phase 1 can implement a simple inline collapsible “Filter” block if you want to defer the drawer to Phase 3).
  - Verify: `initClientsPage()` runs without change; list and pagination update correctly.

### Phase 2 — Reusable layout pattern

- Extract the layout into a **shared pattern** used by all list pages:
  - Shared CSS classes (and optionally a small snippet or partial) for `.page-layout-with-filters`, `.page-filters-column`, `.page-main-column`, sticky rules, and mobile behavior.
  - Document the pattern (e.g. in this doc or in LAYOUT-AUDIT.md) and optionally add a minimal “layout” partial or component that list pages include.
  - Apply this layout to **candidates** and **job-offers** (and later applications): move filter markup from toolbar to left column; keep actions in toolbar.
  - Confirm sticky behavior with the current header (and optional slim toolbar) and no overflow issues.

### Phase 3 — Other pages + mobile drawer

- **applications.html:** Move the 6 filter fields into the left column; keep List/Pipeline toggle in the toolbar (or move to content near pipeline bar).
- **Mobile:** Implement the chosen pattern (recommended: filter drawer/sheet). Ensure all list pages use it: “Filters” opens the same filter form in the sheet; `data-filter` selectors still work.

### Phase 4 — Toolbar simplification / removal

- Reduce toolbar height or content on list pages (e.g. only primary action, or move action into content).
- Optionally remove `.portal-toolbar` from list pages and place the single primary action (e.g. “Add Candidate”) in the content (e.g. top of `.page-main-column`).
- Keep toolbar on entity/edit pages (add-candidate, add-client, add-job-offer, candidate, application) for Edit/Save/Cancel and entity lifecycle actions (forms-runtime and entity-toolbar.js depend on it).

---

## 8. Risks and implementation notes

### JS coupling

- **Risk:** Low. All filter bindings use `document.querySelector('[data-filter="..."]')`; no reliance on toolbar DOM. Moving nodes preserves behavior.
- **Caveat:** If any future code assumes filters are inside `.portal-toolbar`, it could break. Prefer keeping a single place for filter form (either toolbar or content) per page so duplicate elements are not introduced.

### Sticky layout

- **Risk:** Sticky filter column must stick within the viewport scroll. Any parent with `overflow: hidden` or `overflow: auto` between the sticky column and the body will prevent correct stickiness.
- **Mitigation:** Keep the scroll container as the body (current setup). Do not add `overflow: auto` to `.portal-content` or the new layout wrapper. Document that the filter column’s sticky context is the viewport.

### Width / layout

- **Risk:** Very narrow viewports or many filter fields could make the left column too wide or the main column too narrow.
- **Mitigation:** Cap the sidebar width (e.g. 280px) and use `min-width: 0` on the main column so flex doesn’t overflow. On mobile, hide the sidebar and use the drawer so width is not an issue.

### Page-specific exceptions

- **applications.html:** List/Pipeline toggle is in the toolbar right. Decide: keep in toolbar or move to content (e.g. next to pipeline summary). No filter-specific risk.
- **archived.html:** No toolbar filters; each section has its own search in content. No migration needed for filters; only consider reusing the same desktop/mobile layout pattern if you add a unified “archived” filter later.
- **application.html (detail):** Toolbar has empty filters and entity actions; no change for filter migration. Entity toolbar (applicationActions) should remain in toolbar or in a clear “actions” area.

### URL / state

- **Candidates:** `?offer=` and `?status=` are read on load and applied to filters; clear-offer-filter updates URL. Moving filters to content does not change this; keep the same URL handling in lists-runtime.
- **Job offers:** `?client=` is read and applied; clear-client-filter updates URL. Same as above.

### Testing checklist (when implementing)

- Desktop: filters in left column; sticky while scrolling; list and pagination update on change.
- Mobile: no fixed left column; filters in drawer or collapsible; list full width.
- All four list pages: candidates, job-offers, applications, clients — same behavior as today, only layout changed.
- Entity pages: toolbar still works for Edit/Save/Cancel and lifecycle actions.
- Forms runtime: `initEditToolbars()` still finds `.portal-toolbar` on add-* and entity view pages.

---

## Summary

| Item | Result |
|------|--------|
| **Pages with toolbar filters** | candidates, job-offers, applications, clients |
| **Filter wiring** | `data-filter` + `document.querySelector` in `core/lists-runtime.js`; no toolbar DOM dependency |
| **Actions** | `data-action` in toolbar right; can stay in toolbar or move to content |
| **Desktop pattern** | Left filter column (sticky) + right main content; shared CSS classes |
| **Mobile pattern** | Filter drawer/sheet (recommended); no fixed left column |
| **Phases** | 1: clients pilot → 2: shared layout + candidates/job-offers → 3: applications + mobile drawer → 4: toolbar slim/removal on list pages |
| **Main risk** | Sticky context (no overflow on ancestors); otherwise low coupling risk |

No implementation was done in this step; this document is audit and plan only.
