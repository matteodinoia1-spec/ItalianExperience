## Target repository layout

This document defines the **canonical future structure** of the ItalianExperience repository. It is **documentation only** and does not imply any immediate file moves, refactors, or renames.

---

### 1. Current high‑level systems

- **Site (public marketing)**
  - Root HTML and section folders: `index.html`, `404.html`, `contact/`, `travel/`, `recruitment/`, `flavors/`, `estates/`, `privacy/`.
  - Site‑only assets and partials under `assets/`, `partials/`, and `scripts/` that serve the public website.
- **Portal (Strategic Advisory / ATS)**
  - Entire `portal/` tree, including HTML entry points, `core/`, `runtime/`, `features/`, `shared/`, `styles/`, `docs/`, and `migrations/`.
- **Future Head dashboard**
  - Planned global management interface (not yet present) that will sit alongside `site` and `portal` as its own system, consuming shared runtime/config where appropriate.
- **Shared infrastructure**
  - Global configuration and runtime helpers (for example `IEConfig`, IEStatusRuntime, IEFormatters, IEListsSharedHelpers, IEListsRuntime) and any future cross‑system utilities.
- **Docs**
  - `docs/architecture/`, `docs/refactor/`, `docs/ai/`, and related trees that describe structure, ownership, and migration plans.
- **Scripts**
  - `scripts/` and related tooling focused today on static‑site workflows (link checking, image transforms, AVIF generation).
- **Archive**
  - `archive/website/` and any future archived material that should be clearly separated from active runtime trees.

---

### 2. Proposed target repository layout

This is the **target logical layout** for the repo. It reflects boundaries already described in architecture docs and the portal refactor plans.

- `/site`
  - `/site/pages` – public HTML and section trees (today’s root and `travel/`, `recruitment/`, `flavors/`, `estates/`, `contact/`, `privacy/`).
  - `/site/assets` – site‑only JS, CSS, and marketing images.
  - `/site/partials` – site layout fragments such as header, footer, cookie banner.
  - `/site/scripts` – site‑focused tooling (link checker, image utilities, AVIF generators).
- `/portal`
  - `/portal/core` – app shell, router, session, auth, and data modules.
  - `/portal/runtime` – per‑page runtime and list initialization logic.
  - `/portal/features` – feature‑level modules for candidates, applications, job offers, clients, etc.
  - `/portal/styles` and `/portal/components` – portal UI styles and components.
  - `/portal/docs` – portal‑specific audits, navigation rules, security docs, and refactor notes.
  - `/portal/migrations` – Supabase/ATS schema migrations and related backend SQL.
- `/head`
  - `/head/pages` – head dashboard HTML/entry points.
  - `/head/runtime` and `/head/core` – head‑specific runtime, routing, and management logic.
  - `/head/styles` – dashboard visual system, independent from site and portal layout.
- `/shared`
  - `/shared/config` – single source of truth for `IEConfig` and any base‑path, portal‑path, or site‑URL helpers.
  - `/shared/runtime` – cross‑system runtime modules (IEStatusRuntime, IEFormatters, IEListsSharedHelpers, IEListsRuntime, and similar).
  - `/shared/ui` – optional, for truly shared visual tokens (logos, design tokens, icon sets) that are reused across systems without leaking layout.
- `/docs`
  - `/docs/site` – site‑specific structure and migration docs (including the existing WEBSITE‑* documents).
  - `/docs/portal` – portal architecture, refactor master plan, roadmap, and audits.
  - `/docs/head` – future head dashboard architecture.
  - `/docs/shared` – shared runtime/config contracts and global rules.
  - `/docs/ai` – AI‑assisted development guidance and constraints.
- `/scripts`
  - `/scripts/site` – static‑site tooling.
  - `/scripts/portal` – portal‑specific scripts and automation (for example, schema snapshots, data checks) when introduced.
  - `/scripts/shared` – scripts that operate on shared runtime or configuration across systems.
- `/archive`
  - `/archive/site` – archived marketing site assets and historic snapshots (for example, current `archive/website/`).
  - `/archive/portal` – archived portal assets or historic runtime.
  - `/archive/head` – future head dashboard archives.
  - `/archive/shared` – optional cross‑system archived configuration or schemas.

This layout is intentionally **forward‑looking**; it should guide where new code, assets, and docs are created, even before any existing files are physically moved.

---

### 3. Ownership rules

- **Site ownership**
  - Owns all public‑facing marketing pages and sections, plus their HTML, CSS, JS, images, and partials.
  - Owns `site/scripts` and any deployment configuration focused on the static website.
  - Must **not depend on portal or head runtime**; site pages do not import `portal/*` or `head/*` code.
- **Portal ownership**
  - Owns everything under `/portal`, including runtime, features, Supabase migrations, and portal‑specific docs.
  - Must **not import site partials or site‑only JS/CSS**; portal uses its own layout and styles.
  - Must use shared config/runtime **only via `/shared`** (for example `shared/config` and `shared/runtime` helpers).
- **Head dashboard ownership**
  - Will own everything under `/head` and its internal runtime, routing, and styles.
  - Must **not reuse site or portal layout**; it may reuse brand tokens and shared runtime/config only.
- **Shared ownership**
  - Owns `IEConfig` and base‑path/URL helpers, shared runtime modules, and any cross‑system UI tokens.
  - Must **not depend on site, portal, or head DOM/layout details**; dependencies flow from systems **to** shared, not the other way around.

These rules should be treated as **hard boundaries** for new work: when in doubt, prefer placing new logic under `portal/`, `site/`, or `head/` and only promoting it into `shared/` when it is intentionally cross‑system.

---

### 4. Migration principles

- **No mixing site partials with portal or head layout**
  - `site/partials` are strictly for the public site; portal and head own their own shells and navigation.
- **No new shared code hidden inside site assets**
  - Shared runtime/config must live under `/shared`; do not introduce cross‑system logic inside `site/assets` or `site/scripts`.
- **Explicit shared runtime/config usage**
  - Portal and head may use `/shared/config` and `/shared/runtime` only where **explicitly intended** and documented; ad‑hoc reuse from other trees is not allowed.
- **Docs lead, moves follow**
  - Architectural docs (including this one) must describe ownership and boundaries **before** any physical reorganization.
- **Preserve external behavior**
  - When physical moves eventually occur, deployment configuration and base‑path rules must ensure public URLs and portal routes remain stable.

---

### 5. Migration phases

These phases are intentionally **documentation‑first** and should be executed over time without rushing physical changes.

1. **docs/ownership first**
   - Tag existing folders and key files as **site**, **portal**, **head (future)**, **shared**, **scripts**, or **archive** in architecture and refactor docs.
   - Ensure this TARGET‑REPO‑LAYOUT document is referenced as the single source of truth for future placement decisions.
2. **Shared runtime normalization**
   - Define the canonical set of shared modules (IEConfig, status, formatters, list helpers) and their intended `/shared` locations.
   - Normalize portal (and later head) runtime to consume these helpers instead of duplicating logic, without moving files yet.
3. **Archive/docs cleanup**
   - Organize archives under `/archive/site`, `/archive/portal`, `/archive/head`, and `/archive/shared` concepts in documentation, then physically when safe.
   - Group docs under `/docs/site`, `/docs/portal`, `/docs/head`, `/docs/shared`, and `/docs/ai` to match this layout.
4. **Future physical moves**
   - In planned, low‑risk waves, use `git mv` to reshape the tree towards `/site`, `/portal`, `/head`, `/shared`, `/scripts`, and `/archive`, with deployment and tooling updated in lockstep.
5. **Static HTML normalization later**
   - In a dedicated phase, normalize hardcoded static HTML paths to follow the shared base‑path rules, after runtime and layout boundaries are stable.

---

### 6. Source of truth

This document is the **authoritative source of truth** for the future repository layout and ownership model. New systems, folders, and modules should be aligned with this layout, and any significant deviation should be documented here before being implemented in code.

