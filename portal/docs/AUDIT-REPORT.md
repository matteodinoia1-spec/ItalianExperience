# ATS Portal – UI, Layout, and Security Audit Report

**Date:** February 27, 2025  
**Scope:** Portal (HTML, Tailwind, Vanilla JS, Supabase)  
**Goal:** Consistency, responsiveness, access control – audit only (no UI design changes).

**Note (post bottom-nav refactor):** The shell is header + bottom nav + footer. No sidebar or hamburger. Header: full width; nav left (shell padding), user right. Desktop/tablet: header nav and user menu; footer full width with shell padding, breadcrumbs left aligned and vertically centered. Mobile: header shows page title; bottom nav primary; footer hidden (breadcrumbs not shown). See `BOOTSTRAP-AND-SCRIPTS.md` and `LAYOUT-AUDIT.md` for current architecture.

---

## 1. Shell and bottom nav (post refactor)

- **Header** (`#portal-header`), **bottom nav** (`#portal-bottom-nav`), and **footer** (`#portal-footer`) are mounted by `header-loader.js` (layout/header.html, layout/bottom-nav.html, layout/footer.html). DOM order inside `.portal-main`: content, then `#portal-bottom-nav`, then `#portal-footer`. Header is full width (nav left with shell padding, user right). Footer is full width with shell padding; breadcrumbs left aligned, vertically centered; on mobile the footer is hidden and the page title is shown in the header.
- **No sidebar:** There is no `#sidebar`, `layout/sidebar.html`, or `sidebar-runtime.js`. Mobile navigation is the bottom nav and the More panel.
- **index.html** (login): no portal shell (header/footer/bottom-nav are for protected app pages).

---

## 2. Layout Consistency

### 2.1 Structure (Header-first, post refactor) — **PASS**

All portal pages follow:

1. Header: `#portal-header` (full width; primary nav, user menu)
2. Main: `<main class="portal-main ...">` with content, then `#portal-bottom-nav` (mobile), then `#portal-footer` (desktop/tablet only; breadcrumbs). No top toolbar; actions and filters are in content.
3. No sidebar (removed)

### 2.2 Inconsistencies

| Issue | Location | Detail |
|-------|----------|--------|
| **Main overflow** | **archiviati.html** | `<main>` has `overflow-y-auto`; other pages do not. Can cause slight behavioral difference (e.g. scroll context). |
| **Content max-width** | **profile.html**, **add-candidato.html**, **add-offerta.html** | Use `max-w-[1000px]`; others use `max-w-[1600px]`. Intentional for forms is fine; document or align with a shared convention. |
| **Header user block** | **archiviati.html** | Uses an empty `<div data-ie-header-user></div>`. `app.js`’s `updateHeaderUserBlock()` only updates existing `.text-right` and avatar `img`; it does **not** inject into `[data-ie-header-user]`. So the archiviati header shows **no** user name or avatar, unlike all other pages. |
| **Typo** | **clienti.html** | Pagination span has `tracking-titter` instead of `tracking-tighter`. |

**Suggestions:**

- Either give **archiviati.html** the same header structure as other pages (e.g. copy the header user block from **dashboard.html** / **candidati.html**) so `updateHeaderUserBlock()` and `ensureHeaderAvatarLinksToProfile()` work, **or** extend `updateHeaderUserBlock()` to populate `[data-ie-header-user]` when present (and keep layout/alignment consistent).
- Align **main**: remove `overflow-y-auto` from **archiviati.html**’s `<main>` unless required for a specific scroll behavior; if required, add a short comment.
- Fix **clienti.html** typo: `tracking-titter` → `tracking-tighter`.
- Optionally define in a short layout doc: “list/dashboard pages use `max-w-[1600px]`, form/profile pages use `max-w-[1000px]`” to avoid drift.

---

## 3. Responsive Design

### 3.1 Desktop / tablet / mobile — **PASS in principle**

- **Desktop/tablet (e.g. ≥ 1025px):** Header is primary navigation; footer shows breadcrumbs (full width, shell padding). Bottom nav is hidden. Full-width main content.
- **Mobile:** Footer is hidden; page title in header. Bottom nav is visible (fixed); `layout.css` uses `@media (max-width: 768px)` to show `#portal-bottom-nav`. More panel opens above the bottom nav; safe-area insets applied (e.g. `--portal-safe-bottom`).
- Tables are wrapped in `overflow-x-auto` so horizontal scroll is contained.

### 3.2 Navigation — **PASS** *(post bottom-nav refactor)*

- **Desktop/tablet:** Header nav and user menu; no sidebar.
- **Mobile:** Bottom nav (Dashboard, Candidates, Job Offers, Applications, More); More contains Clients, Archived, Settings, Logout. No hamburger or off-canvas sidebar.

### 3.3 Gaps / risks

- Tables use `overflow-x-auto` but no responsive table pattern (e.g. card layout on small screens). Acceptable; consider card layout in a future iteration.


---

## 4. Mobile Optimization

### 4.1 Horizontal scrolling — **PASS**

- **body** has `overflow-x: hidden` (style.css and profile.html).
- Main content uses `min-w-0` to avoid flex overflow.
- Tables are inside `overflow-x-auto` divs, so horizontal scroll is confined to the table, not the whole page.

### 4.2 Touch and readability — **PARTIAL**

- Buttons and inputs use Tailwind padding (e.g. `py-2.5`, `px-4`, `p-2`); no explicit minimum touch target (e.g. 44px) is set in the audited files. Small controls (e.g. pagination icons) may be below recommended size.
- Font sizes are relative (e.g. `text-sm`, `text-xs`); no obvious too-small fixed sizes. Readability on small screens is reasonable.

### 4.3 Header and avatar alignment — **FAIL on archiviati**

- On **archiviati.html**, the header user block is empty (`data-ie-header-user` is never filled), so the right side of the header has no name/avatar. Other pages keep name + avatar aligned in the header.

**Suggestions:**

- Add a minimum touch target for primary interactive elements (e.g. `min-h-[44px] min-w-[44px]` or equivalent) for toggle, pagination, and main CTAs.
- Fix archiviati header so the user block is present and aligned (see Section 2.2).

---

## 5. Security & Access Control

### 5.1 Protected pages — **PASS**

- **app.js** defines:
  - `protectedPages = ["dashboard", "candidati", "offerte", "clients", "archiviati", "add-candidato", "add-offerta", "profile"]`.
  - `getCurrentPageKey()` maps:
    - `clienti.html` and `clients.html` → `"clients"`,
    - other filenames (dashboard, candidati, offerte, archiviati, add-candidato, add-offerta, profile) to the same keys as in `protectedPages`.
- On **DOMContentLoaded**, for any of these keys, `window.IESupabase.requireAuth()` is called **before** shell load and bootstrap. If the user is not authenticated, **supabase.js**’s `requireAuth()` calls `redirectToLogin()` (index.html), so protected content is not shown.

### 5.2 Login page — **PASS**

- **index.html** does not use the protected-pages logic; it runs `redirectToDashboardIfAuthenticated()` so logged-in users are sent to the dashboard. Login page is the only intended “public” page.

### 5.3 Auth before content — **PASS**

- Protected flow is: auth guard (session check) → then `loadCurrentUserProfile()` and `initInactivityTimer()` → then header init and page initializers → then bottom-nav load/init. Redirect happens when there is no session, so page content is not rendered for unauthenticated users.

### 5.4 Sensitive data in HTML — **CAUTION**

- **supabase.js** contains the Supabase URL and the **publishable (anon) key** in the front-end bundle. This is normal for Supabase and is intended to be public; security relies on **RLS (Row Level Security)** and backend config. No secrets were found in HTML.
- No sensitive user data (tokens, passwords) is embedded in static HTML.

**Suggestions:**

- Rely on Supabase RLS and avoid exposing sensitive operations to the anon key. No change required in the audited files for “no sensitive data in public HTML.”
- If new pages are added, ensure their pathname is mapped in `getCurrentPageKey()` and the corresponding key is added to `protectedPages` so they are not publicly accessible.

---

## 6. Performance & Clean Code

### 6.1 Duplicate layout code — **ISSUES**

- **profile.html**: If it still contains inline layout/sidebar-related styles that duplicate **style.css** or **layout.css**, prefer a single source. (Sidebar and toolbar have been removed; any remaining sidebar/toolbar rules are obsolete.)
- Sidebar and SIDEBAR_FALLBACK_HTML have been removed; no action needed.

### 6.2 Unused / redundant HTML — **MINOR**

- No full duplicate layout sections were found. Some pages have slightly different class sets (e.g. main with/without `overflow-y-auto`) as noted in Section 2.

### 6.3 Structural pattern — **PASS**

- All portal pages (except index) use the same pattern: header, main (content, bottom-nav container, footer). No top toolbar; script order is documented in BOOTSTRAP-AND-SCRIPTS.md.

**Suggestions:**

- Remove or reduce duplicate layout styling in **profile.html** and use **style.css** only.

---

## 7. Summary of Fixes and Recommendations

### 7.1 Pages with issues (by category)

| Category | Pages |
|----------|--------|
| **Duplicate / redundant layout styling** | profile.html (if inline styles duplicate style.css/layout.css) |
| **Layout / structure inconsistency** | archiviati.html (main overflow; empty header user block) |
| **Typo** | clienti.html (tracking-titter) |

### 7.2 Shell (post refactor)

- Shell is header + bottom nav + footer; no sidebar. Desktop: header nav + user menu, footer breadcrumbs (full width, shell padding). Mobile: header page title, bottom nav, no footer.

### 7.3 Layout inconsistencies (recap)

- **archiviati.html**: `main` has `overflow-y-auto`; header user block empty.
- **profile.html**: Duplicate layout CSS in page (if any; sidebar removed).
- **clienti.html**: Typo in pagination span class.
- **profile / add-* pages**: Different content max-width (1000px vs 1600px) — document if intentional.

### 7.4 Mobile responsiveness (recap)

- Bottom nav and main layout behave correctly on mobile; header on desktop/tablet.
- Tables scroll horizontally; no horizontal scroll on body.
- **archiviati.html**: Header/avatar not shown (empty user block).
- Touch targets not explicitly sized to 44px minimum.

### 7.5 Public access (recap)

- **Only index.html (login)** is intended to be reachable without authentication. All other audited pages (dashboard, candidati, offerte, clienti, archiviati, profile, add-candidato, add-offerta) are protected via `requireAuth()` before content load. **No page is incorrectly publicly accessible.**

### 7.6 Suggested fix list (no UI design change)

1. **archiviati.html**
   - Replace empty `<div data-ie-header-user></div>` with the same header user block structure as dashboard/candidati so the header shows user name and avatar.
   - Consider removing `overflow-y-auto` from `<main>` unless required for scroll behavior (and add a comment if kept).

2. **clienti.html**
   - Fix class: `tracking-titter` → `tracking-tighter` on the pagination text span.

3. **profile.html**
   - Remove any obsolete inline sidebar/layout rules and rely on **style.css** / **layout.css**.

4. **Optional (mobile)**
   - Add minimum touch target size (e.g. 44px) for bottom-nav items, pagination buttons, and primary form buttons in **style.css** or Tailwind classes.

5. **Optional (documentation)**
   - Short note: list/dashboard pages use `max-w-[1600px]`, form/profile pages use `max-w-[1000px]`.

---

**End of audit.** No UI design changes were made; this report only identifies issues and suggests fixes for consistency, responsiveness, and access control.
