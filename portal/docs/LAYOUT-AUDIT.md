# Portal layout audit — global page header refactor

## Current architecture (post bottom-nav refactor)

### Shared shell

- **Header** (`#portal-header`) — Full-width; navigation aligned left (shell padding), user/profile area right. No max-width container. Primary global navigation. Filled by `shared/header-loader.js` with `layout/header.html`. Desktop/tablet: primary nav in header (hover submenus), user area (Settings, Logout) in header; no page title in header. On mobile, the page title is displayed in the header.
- **Bottom nav** (`#portal-bottom-nav`) — Mobile only. Filled by `header-loader.js` with `layout/bottom-nav.html`. Fixed bar; primary items: Dashboard, Candidates, Job Offers, Applications, More. More panel contains: Clients, Archived, Settings, Logout. `bottom-nav-runtime.js` handles active state, link normalization, More open/close, and mobile logout.
- **Footer** (`#portal-footer`) — Desktop/tablet only. Full width; uses the same shell padding as the header. `.portal-footer__inner` is full width (no max-width, no margin auto). Fixed glass-style footer with breadcrumbs only. Contains `#page-breadcrumbs`; breadcrumbs are left aligned and vertically centered in the footer bar; they align with the header navigation start line. `header-runtime.js` renders breadcrumbs on `ie:header-loaded` and when `mountPageHeader()` is called. **On mobile the footer is completely hidden;** breadcrumbs are not shown; the page title appears in the header instead.
- **No sidebar** — Sidebar and hamburger have been removed. No `#sidebar`, no off-canvas overlay.
- **Page titles** — Not part of the shared shell for now.

### Navigation model

- **Desktop/tablet:** Header nav and user menu; footer shows breadcrumbs (left aligned, vertically centered in footer bar).
- **Mobile:** Header shows page title. Bottom nav is primary navigation; More panel contains Clients, Archived, Settings, Logout. Footer is hidden; breadcrumbs are not shown. No sidebar or hamburger.

### DOM structure

- **portal-header** → **portal-toolbar** → **portal-content** → **portal-bottom-nav** → **portal-footer**. Footer and bottom-nav containers are get-or-create by `header-loader.js` inside `.portal-main`; DOM order is content, then `#portal-bottom-nav`, then `#portal-footer`. On mobile the footer is hidden (not displayed); main padding reserves space for bottom nav only.
- **portal-toolbar** (`.portal-toolbar`) — Page actions (filters, Add X, entity Edit/Save/Cancel). Static HTML per page.
- **portal-content** (`.portal-content`) — Tables, cards, forms.
- Layout spacing: header, toolbar, content, bottom nav (mobile), and footer (desktop/tablet) use design tokens; iOS/safe-area insets applied (e.g. `--portal-safe-top`, `--portal-safe-bottom`). Main padding-bottom reserves space for footer on desktop/tablet and for bottom nav on mobile.

---

## Phase 1 — Layout audit (historical)

### DOM structure (intended at time of audit)

- **portal-header** (`#portal-header`) — Global navigation. Filled by `shared/header-loader.js` with `layout/header.html`. Contains primary nav (desktop) and user block. Does **not** contain `.page-title` or `.page-subtitle` (no placeholders in `header.html`).
- **portal-page-header** (`#portal-page-header`) — *(Superseded: current architecture uses footer for breadcrumbs; page titles not in shared shell.)*
- **portal-toolbar** (`.portal-toolbar`) — Page actions (filters, Add X, entity Edit/Save/Cancel). Rendered by each page’s HTML or by entity scripts into `.portal-toolbar__actions`.
- **portal-content** (`.portal-content`) — Tables, cards, forms. Must **not** contain its own page header block.

### Where the page header is mounted

- **mountPageHeader()** in `app-shell.js` (lines 368–374):
  - Reads `window.pageMeta`.
  - Targets `#portal-page-header`.
  - Calls global `renderPageHeader(meta)` (from `page-header.js`). If `meta` is falsy, `renderPageHeader` returns `""`, so the container is left empty.

### When mountPageHeader() runs

1. **First run** — During bootstrap on `DOMContentLoaded`. At this point `window.pageMeta` is usually **not** set (only candidate profile sets it later after data load). So the first run often renders nothing into `#portal-page-header`.
2. **Second run** — On `ie:header-loaded` (after `loadPortalHeader()` finishes and injects `layout/header.html` into `#portal-header`). Same `window.pageMeta` issue: still undefined on most static pages.
3. **Extra run** — On candidate profile, `features/candidates/candidate.js` sets `window.pageMeta` and then calls `IEPortal.mountPageHeader()` after data load. Only then does `#portal-page-header` get title + breadcrumbs on that page.

### When the toolbar renders

- The toolbar is **static HTML** in each page (e.g. `dashboard.html`, `candidates.html`): a `<div class="portal-toolbar">` with inner structure and empty `.portal-toolbar__actions` (or with buttons). No separate “mount” step; it’s already in the DOM. Entity toolbars (Edit/Save/Cancel) are rendered by `entity-toolbar.js` into a container identified by `config.containerId` (e.g. `candidateActions`).

### When page content renders

- Page content is the rest of the HTML inside `.portal-content`. On every portal page, the **first** block inside `.portal-content` is a **duplicate** header: `<div class="ie-page-header">` with `.ie-page-header__title`, `.ie-page-header__subtitle`, and `.ie-page-header__actions`. So content “renders” with this block from the start.

### Lifecycle conflict and duplicated containers

- **Two header systems run in parallel:**
  1. **New:** `#portal-page-header` + `renderPageHeader(window.pageMeta)`. Only shows something when `pageMeta` is set (e.g. candidate profile after load).
  2. **Legacy:** Each page still has `.ie-page-header` inside `.portal-content`. On `ie:header-loaded`, **movePageHeaderToHeader()** runs (app-shell.js 440–470):
     - Finds `.ie-page-header` in the document.
     - Tries to copy title/subtitle into `header.portal-header` using `.page-title` and `.page-subtitle` — but **layout/header.html** does not contain those elements, so the copy does nothing.
     - Moves `.ie-page-header__actions` into `.portal-toolbar .portal-toolbar__actions` (this part works).
     - **Removes** `.ie-page-header` from the DOM.
- **Result:** The in-content title and subtitle are removed and never shown anywhere (global header has no placeholders). So on all pages that **don’t** set `window.pageMeta` (dashboard, candidates, clients, job-offers, archived, profile, add-*), the user sees **no page title** in the shell. Only the candidate profile page shows a title (after it sets `pageMeta` and calls `mountPageHeader()`).

### Breadcrumbs timing (current)

- **setPageBreadcrumbs(segments)** in `header-runtime.js` writes into `#page-breadcrumbs`.
- `#page-breadcrumbs` lives in the **footer** (`layout/footer.html`), which is loaded by `header-loader.js` together with the header.
- On `ie:header-loaded`, header-runtime runs `mountPageHeader()` which calls `setPageBreadcrumbs()` with defaults or `window.pageMeta.breadcrumbs` when set.
- Entity pages (e.g. candidate profile) can call `IEPortal.mountPageHeader()` after setting `window.pageMeta` to update breadcrumbs.

### Summary: DOM order, lifecycle, duplications

| Issue | Detail |
|-------|--------|
| **DOM order** | Correct in HTML: `portal-header` → `portal-page-header` → `portal-toolbar` → `portal-content`. But `.portal-content` still starts with `.ie-page-header`, which is then removed. |
| **Lifecycle** | `mountPageHeader()` runs before `window.pageMeta` is set on most pages, and before the breadcrumb container exists when meta is absent. `movePageHeaderToHeader()` runs on `ie:header-loaded` and removes the only visible header (`.ie-page-header`) without putting title/subtitle anywhere. |
| **Duplicated containers** | Every page has both (1) `#portal-page-header` (shell, often empty) and (2) `.ie-page-header` inside content (legacy). The legacy one is removed; the shell one stays empty unless the page sets `pageMeta` later. |
| **Pages not respecting shell** | All pages still render their own `.ie-page-header` inside `.portal-content`. They do not “rely on the shell” for the header; they rely on the old move logic, which no longer works for title/subtitle because the global header has no placeholders. |

---

## Phase 2 — Regression source

The layout broke because:

1. **Header mounted in wrong lifecycle stage** — Partially. `mountPageHeader()` runs during bootstrap and again on `ie:header-loaded`, but `window.pageMeta` is usually undefined at those times. So the shell header is often empty.
2. **Toolbar mounted before header** — No. Toolbar is static HTML; order is correct (header → page-header → toolbar → content).
3. **Container nesting changed** — No. Nesting is unchanged; the problem is that the **global** header HTML (`layout/header.html`) was never given `.page-title` / `.page-subtitle` placeholders, while the refactor added a **separate** `#portal-page-header` and relied on `pageMeta` for its content. So we now have two concepts (global header vs. page header) but only one of them is ever filled, and only when `pageMeta` is set.
4. **Pages still contain old header markup** — **Yes.** Every page still has `.ie-page-header` inside `.portal-content`. The old behavior was: “move that block into the global header.” The global header never had the right placeholders, so the move only moved actions and removed the title block. After the refactor, the intended behavior is “shell fills `#portal-page-header` from `pageMeta`; pages must not render headers.” So the regression is: we kept the move and the in-content header; the move removes the only visible title and the shell header is empty on most pages.
5. **window.pageMeta timing causing layout shifts** — **Yes.** On static pages `pageMeta` is never set, so the shell never fills the page header. On the candidate page, `pageMeta` is set after async load, so `mountPageHeader()` runs late and the header appears after a delay (layout shift). Breadcrumbs are set once on `ie:header-loaded` using defaults and never updated from `pageMeta.breadcrumbs`.

**Root cause:** Mixing two models — (A) “page header in content, then move into global header” and (B) “shell renders page header from `pageMeta`” — without completing (B). The move logic was left in place, global header was never given title placeholders, and pages were not updated to stop rendering `.ie-page-header` and to set `pageMeta` instead. Result: title disappears on most pages, breadcrumbs missing when `#portal-page-header` is empty, and layout shifts on entity pages when `pageMeta` is set late.

---

## Phase 3–4 (implementation, historical)

Shell owns the single hierarchy; `mountPageHeader()` renders breadcrumbs into the footer; `movePageHeaderToHeader()` removed; list primary actions moved into toolbar markup; breadcrumbs use `pageMeta.breadcrumbs` when present. Page titles are not in the shared shell (to be repositioned later).

---

## Phase 5 — Verification checklist (historical)

- [ ] Dashboard: one page header (title + breadcrumbs), no duplicate, toolbar stable.
- [ ] Candidates: same; “Add Candidate” in toolbar; breadcrumbs clickable.
- [ ] Candidate profile: dynamic title and breadcrumbs from `pageMeta`, toolbar stable.
- [ ] Clients: same as candidates.
- [ ] Job offers: same.
- [ ] Add forms (candidate, client, job offer): correct title/breadcrumbs, toolbar with Cancel/Save.
- [ ] Archived: header and toolbar correct.
