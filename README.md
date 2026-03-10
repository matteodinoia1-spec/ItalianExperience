## Italian Experience Monorepo

Italian Experience is a strategic advisory platform that combines a **public marketing website** with an **operational portal** and a **Supabase‑backed backend**.  
This repository hosts all of those surfaces in a single codebase.

The primary user‑facing experience is the **public website** at `https://www.italianexp.com`, which presents the four pillars:
- **Travel** – bespoke travel, gap year, and culinary academy programs
- **Recruitment** – employer / candidate advisory and staffing
- **Flavors** – gourmet and wholesale food advisory
- **Estates** – asset and heritage advisory

The **portal** and **Supabase** code power authenticated workflows and data persistence behind the scenes.

---

## Repository structure

High‑level layout (paths are relative to the repo root):

- **Public website**
  - `index.html` – public homepage (portal hero)
  - `travel/` – public travel hub and subpages
  - `recruitment/` – public recruitment hub and employer/candidate pages
  - `flavors/` – public flavors hub and subpages
  - `estates/` – public estates page
  - `assets/css/` – shared CSS for the public site (including `site.css`)
  - `assets/js/` – shared JS for the public site, including:
    - `bootstrap.js` – injects shared header/footer from partials and initializes page JS
    - `config.js` – centralized public path configuration (`BASE_PATH`, `PORTAL_PATH`, `SITE_URL`)
    - `cookie-consent.js` – cookie banner behavior on the public site
    - `forms.js` – shared helpers for public forms (e.g., intl‑tel integration)
  - `partials/` – shared HTML partials for header and footer:
    - `partials/header.html`
    - `partials/footer.html`

- **Portal**
  - `portal/` – authenticated portal HTML/JS assets (job offers, candidates, dashboard, applications, etc.)
  - `portal/**` is intentionally **not** modified in Phase 1 and follows its own runtime bootstrap.

- **Supabase backend**
  - `supabase/` – Supabase project directory (SQL migrations, policies, configuration, etc.).
  - Used by both the portal and other backend tasks; not modified in Phase 1 UI work.

- **Documentation**
  - `docs/` – internal design and migration docs for the public UI, including:
    - `PUBLIC-UI-STEP-1-CURRENT-DUPLICATION.md`
    - `PUBLIC-UI-STEP-2-LAYERED-ARCHITECTURE.md`
    - `PUBLIC-UI-STEP-3-GLOBAL-VS-LOCAL.md`
    - `PUBLIC-UI-STEP-4-CANONICAL-SYSTEMS.md`
    - `PUBLIC-UI-STEP-5-TEMPLATE-MAPPING.md`
    - `PUBLIC-UI-STEP-6-MIGRATION-PLAN.md`

- **Tooling / configuration**
  - `_headers` – extra Netlify‑style or CDN header configuration for the public site.
  - `node_modules/` – Node.js dependencies for build tooling (e.g., Tailwind CSS).
  - Misc root configuration files (e.g., `.gitignore`, package manager files if present).

---

## Public website

The public website is a set of static HTML files that share:
- A **glass header/navigation** injected via `partials/header.html` into `#site-header`
- A **shared footer** injected via `partials/footer.html` into `#site-footer`
- Shared CSS tokens, hero systems, cards, and disclosure/legal systems in `assets/css/site.css`
- Shared JavaScript behaviors in `assets/js/*`

Key runtime pieces:
- `assets/js/config.js` – defines `window.IEConfig`:
  - `BASE_PATH` – base path for the public site (e.g., `/ItalianExperience`)
  - `PORTAL_PATH` – base path for the portal (currently the same as `BASE_PATH`)
  - `SITE_URL` – canonical production URL (`https://www.italianexp.com`)
- `assets/js/bootstrap.js` – on DOM ready:
  - Loads `partials/header.html` and `partials/footer.html` into `#site-header` / `#site-footer`
  - Loads `assets/js/site.js`
  - Runs `window.IEInit(document)` if defined
- `assets/js/cookie-consent.js` – handles lazy loading and user interaction for the cookie banner.

Each public page:
- Includes `config.js` **before** `bootstrap.js` and `cookie-consent.js`
- Uses `#site-header` and `#site-footer` as injection mounts
- May include local inline CSS/JS for hero or section‑specific visuals, while deferring shared systems to `assets/css/site.css`.

---

## Portal

The `portal/` directory contains the operational portal front‑end:
- HTML pages for employers, candidates, job offers, profiles, dashboards, etc.
- A separate JS bootstrap (`runtime/page-bootstrap.js`) wired for authenticated flows.
- Integration with Supabase for persistence and authentication.

The portal is intentionally **out of scope** for Phase 1 public‑site normalization, but it lives in the same repo for easier deployment and shared assets.

---

## Supabase backend

The `supabase/` directory contains:
- SQL migrations and schema definitions
- Configuration for Supabase auth, storage, and database policies
- Any Supabase‑specific functions or triggers

This backend is consumed primarily by the portal, and potentially by future APIs or services.

---

## Deployment

The project is designed to be deployed as a static frontend (public website + portal) plus a Supabase backend:
- **Public website**:
  - Served from the built/static contents of this repo (e.g., via a static host such as Netlify, Vercel, or an S3/CDN bucket).
  - `_headers` and the partials system (`partials/header.html`, `partials/footer.html`) are leveraged by `bootstrap.js` for consistent navigation and footer across pages.
- **Portal**:
  - Served alongside the public site under `/portal/`, using its own JS bootstrap and Supabase integration.
- **Supabase**:
  - Managed via the `supabase/` directory and deployed/configured following Supabase documentation.

Exact deployment commands and CI setup will depend on your hosting provider and are expected to be maintained outside the scope of Phase 1.

---

## Main documentation references

The `docs/` directory contains a stepwise description of the public UI refactor and architecture. The most relevant documents are:

- **Step 1 – Current duplication**
  - `docs/PUBLIC-UI-STEP-1-CURRENT-DUPLICATION.md`
  - Describes where header/footer, hero, disclosure, and other UI patterns were historically duplicated across pages.

- **Step 2 – Layered architecture**
  - `docs/PUBLIC-UI-STEP-2-LAYERED-ARCHITECTURE.md`
  - Defines the layered approach (global systems vs. template vs. page‑local overrides).

- **Step 3 – Global vs local**
  - `docs/PUBLIC-UI-STEP-3-GLOBAL-VS-LOCAL.md`
  - Clarifies which components and styles should be global/canonical vs page‑local.

- **Step 4 – Canonical systems**
  - `docs/PUBLIC-UI-STEP-4-CANONICAL-SYSTEMS.md`
  - Documents the shared design systems: header, hero, card systems, disclosure/legal styles, etc.

- **Step 5 – Template mapping**
  - `docs/PUBLIC-UI-STEP-5-TEMPLATE-MAPPING.md`
  - Maps each public page to the templates and systems it should use.

- **Step 6 – Migration plan**
  - `docs/PUBLIC-UI-STEP-6-MIGRATION-PLAN.md`
  - Provides a phased migration guide, including the Phase 1 tasks implemented so far (disclosure consolidation, homepage normalization, header/footer wiring, config centralization).

If you are onboarding to this project, reading steps 2–4 gives a good mental model for the current public UI architecture.

---

## Phase 1 summary (public website)

Phase 1 focused on **non‑breaking normalization** of the public site:
- Centralized disclosure/legal styles in `assets/css/site.css` and aligned Flavors/Estates to the shared system.
- Normalized the homepage to use shared header/footer injection and removed duplicate mobile footer markup.
- Introduced `assets/js/config.js` and wired all public pages that load `bootstrap.js` / `cookie-consent.js` to use it.
- Preserved portal, Supabase, and overall visual behavior while improving maintainability.

Subsequent phases can build on this by further consolidating hero layouts, card systems, and forms while keeping the architecture described above.

