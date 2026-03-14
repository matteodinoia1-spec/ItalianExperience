## Repository ownership and migration inventory

This document maps the **current** ItalianExperience repository layout to the **future target layout** described in `TARGET-REPO-LAYOUT.md`, classifies migration risk, and identifies shared runtime infrastructure candidates. It is **documentation only** and does **not** imply any immediate file moves or refactors.

---

### 1. System ownership map

**Legend**

- **Site** – public static marketing site at the repo root.
- **Portal** – recruitment / Strategic Advisory portal application under `portal/`.
- **Head** – future head dashboard (not yet present).
- **Shared** – cross-system configuration and runtime helpers.
- **Docs** – architecture, refactor, and AI docs.
- **Scripts** – tooling and automation.
- **Archive** – archived, non-runtime assets.
- **Tooling** – package/build tooling and dependencies.

**Table – current paths → system ownership and future logical location**

Current Path | System Owner | Future Location (logical) | Notes
-------------|--------------|---------------------------|------
`index.html`, `404.html` | Site | `/site/pages` | Root marketing entry points under `/ItalianExperience` base path.
`contact/` | Site | `/site/pages/contact` | Static contact section HTML.
`estates/` | Site | `/site/pages/estates` | Static estates section HTML.
`flavors/` | Site | `/site/pages/flavors` | Static flavors section HTML and subpages.
`recruitment/` (static site) | Site | `/site/pages/recruitment` | Static recruitment marketing pages (employer / candidate).
`travel/` | Site | `/site/pages/travel` | Static travel section HTML and subpages.
`assets/css/` | Site | `/site/assets/css` | Site stylesheets (`site.css`, Tailwind artifacts).
`assets/js/site.js` | Site | `/site/assets/js/site.js` | Site-only JS runtime for static pages.
`assets/js/cookie-consent.js` | Site | `/site/assets/js/cookie-consent.js` | Cookie banner / consent logic for marketing pages.
`assets/js/bootstrap.js` | Site | `/site/assets/js/bootstrap.js` | Static-site bootstrap (partials, section wiring).
`assets/js/config.js` | Shared | `/shared/config/ie-config.js` (conceptual) | Defines `window.IEConfig` and base-path / URL config for both site and portal.
`assets/img/` | Site | `/site/assets/img` | Live marketing images for all sections.
`partials/` | Site | `/site/partials` | Shared static-site header/footer fragments.
`scripts/` | Scripts | `/scripts/site` | Static-site tooling (link checker, AVIF generators, image dimension injector).
`netlify.toml` | Site | `/site/deploy/netlify.toml` (conceptual) | Static-site deployment config and headers.
`portal/` (overall) | Portal | `/portal` | Entire portal app: HTML entry, core, runtime, features, shared, styles, docs, migrations.
`portal/core/` | Portal | `/portal/core` | App shell, router, Supabase client, list runtime orchestration.
`portal/runtime/` | Portal | `/portal/runtime` | Page-level runtime, bootstrap, list runtimes and shared list helpers.
`portal/features/` | Portal | `/portal/features` | Feature modules (candidates, applications, job offers, clients, external submissions, archived, etc.).
`portal/styles/` | Portal | `/portal/styles` | Portal CSS and layout styles.
`portal/components/` (if present) | Portal | `/portal/components` | Reusable portal UI components.
`portal/shared/` (if present) | Portal | `/portal/shared` | Portal-only shared utilities (non cross-system yet).
`portal/docs/` | Docs (Portal) | `/docs/portal` | Portal-specific audits and architecture docs.
`portal/migrations/` (if present) | Portal | `/portal/migrations` | Portal / Supabase migrations and schema changes.
`supabase/` | Portal | `/portal/migrations` and `/portal/backend` (conceptual) | Supabase edge functions and config backing the portal.
`docs/architecture/` | Docs | `/docs/shared` + `/docs/site` + `/docs/portal` | Global architecture docs and website architecture docs.
`docs/refactor/` | Docs | `/docs/portal` | Portal refactor master plan, audits, execution log.
`docs/ai/` | Docs | `/docs/ai` | AI-assisted development rules and guidance.
`archive/site/` | Archive | `/archive/site` | Archived static-site backups and unused images (renamed from `archive/website/`).
`archive/site/assets-img-stage1/` | Archive | `/archive/site/assets-img-stage1` | Legacy `_stage1_backup` HTML/image snapshots; non-runtime.
`archive/site/assets-unused/` | Archive | `/archive/site/assets-unused` | Confirmed-unused images removed from `assets/img/`; non-runtime.
`node_modules/` | Tooling | (stays tooling) | Package dependencies for build and tooling only.
`package.json`, `package-lock.json` | Tooling | `/scripts/shared/package.{json,lock}` (conceptual) | Node tooling config shared across site and portal.
`tailwind.config.*`, `postcss.config.*` | Tooling | `/scripts/site` and `/scripts/shared` | Build-time styling and PostCSS/Tailwind config.
`.gitignore`, `.editorconfig`, `.prettierrc*` | Tooling | repo root | Version control and editor tooling.
`README.md`, `docs/README.md` | Docs | `/docs/shared` | Top-level documentation and contributor guidance.

This table is intentionally **high level**: it focuses on major directories and file groups that matter for migration planning, not every individual file.

---

### 2. Migration safety classification

**Risk level definitions**

- **SAFE MOVE** – Can be moved or renamed with no runtime behavior impact (docs, archives, dev-only scripts), assuming references are updated in a controlled way.
- **LOW RISK MOVE** – Primarily static or asset paths; requires careful path updates but no runtime JS/portal routing changes.
- **HIGH RISK MOVE** – Tied to runtime behavior, routing, deployment config, or external URLs; moves must be coordinated with config and router updates.

**Table – folders and groups by migration risk**

Folder / Group | Risk Level | Reason
---------------|-----------|-------
`docs/architecture/` | SAFE MOVE | Architecture-only docs; not loaded by runtime or build tooling.
`docs/refactor/` | SAFE MOVE | Refactor planning docs; not referenced at runtime.
`docs/ai/` | SAFE MOVE | AI workflow docs; not imported by JS/HTML.
`archive/site/` | SAFE MOVE | Explicitly non-runtime backups and unused assets; tooling already skips these paths.
`scripts/` | SAFE MOVE | Dev tooling only (link checker, AVIF generators, image utilities); not imported by site or portal runtime.
`node_modules/` | SAFE MOVE | Tooling dependencies; can be recreated by reinstalling packages after moves.
`README.md`, `docs/README.md` | SAFE MOVE | Pure documentation, not referenced by runtime.
`assets/img/` | LOW RISK MOVE | Image assets referenced by static HTML and CSS; moves require updating asset paths in HTML/CSS but no JS runtime changes.
`assets/css/` | LOW RISK MOVE | Stylesheets referenced by static HTML; moves require updating `<link>` paths and build config.
`assets/js/site.js` | LOW RISK MOVE | Included from static HTML; move requires updating `<script>` references only.
`assets/js/cookie-consent.js` | LOW RISK MOVE | Static-site behavior script; referenced from HTML and potentially `bootstrap.js`.
`assets/js/bootstrap.js` | LOW RISK MOVE | Static-site bootstrap logic; referenced from HTML; moves require script tag updates only.
`partials/` | LOW RISK MOVE | Referenced by bootstrap/static pipeline; reorganization impacts how partials are resolved but does not affect portal runtime.
`archive/` (other future archives) | LOW RISK MOVE | Not runtime, but moves must preserve any explicit ignore rules or tooling filters.
`tailwind.config.*`, `postcss.config.*` | LOW RISK MOVE | Build-time tooling; moves require build script/config updates.
`netlify.toml` | HIGH RISK MOVE | Deployment routing, headers, and caching; moves can break production routing if not coordinated.
Root HTML pages (`index.html`, `404.html`) | HIGH RISK MOVE | Public entry points tied to `/ItalianExperience` deployment paths.
Section folders (`contact/`, `estates/`, `flavors/`, `recruitment/`, `travel/`) | HIGH RISK MOVE | Public-facing routes; moves affect live URLs and SEO; must be coordinated with BASE_PATH rules and Netlify config.
`assets/js/config.js` | HIGH RISK MOVE | Defines `window.IEConfig` for both static site and portal; tightly coupled to runtime URL construction.
`portal/` (overall) | HIGH RISK MOVE | App-like runtime with routing, Supabase client, and IE runtime modules; moves impact portal routes and internal imports.
`portal/core/` | HIGH RISK MOVE | Router, app shell, and list runtime orchestration; moves require widespread import and routing updates.
`portal/runtime/` | HIGH RISK MOVE | Page bootstrap, status runtime, formatters, and list runtimes; central to portal behavior.
`portal/features/` | HIGH RISK MOVE | Feature-specific runtime and view logic; moves affect route handlers, component imports, and list keys.
`portal/styles/` | HIGH RISK MOVE | Portal styling; moves affect CSS imports and potentially HTML layouts.
`supabase/` | HIGH RISK MOVE | Backend functions and schema operations; moves impact deployment and portal integration.

This classification is intentionally conservative; actual risk can be reduced with automated refactors and strong test coverage, but planning should assume the levels above.

---

### 3. Shared runtime inventory

This section lists **logically shared infrastructure** that either already serves multiple systems (site + portal) or is intended to be cross-system in the target layout.

#### 3.1 Current shared runtime and config candidates

Current File / Group | Role Today | Target Ownership | Future Location (logical)
---------------------|-----------|------------------|---------------------------
`assets/js/config.js` | Defines `window.IEConfig` (BASE_PATH, PORTAL_PATH, SITE_URL) used by static HTML and portal runtime. | Shared config | `/shared/config/ie-config.js` (or equivalent shared config module).
`portal/runtime/status-runtime.js` | IEStatusRuntime: centralized status normalization and labels for core entities (candidates, applications, job offers, etc.). | Shared runtime | `/shared/runtime/status-runtime.js` (consumed by portal and any future head dashboard).
`portal/runtime/shared-formatters-runtime.js` | IEFormatters: shared formatting helpers (escaping, dates, display formatting). | Shared runtime | `/shared/runtime/formatters-runtime.js`.
`portal/runtime/lists/shared-list-helpers.js` | IEListsSharedHelpers: shared table/list helpers used across multiple list runtimes. | Shared runtime | `/shared/runtime/lists/shared-list-helpers.js`.
`portal/core/lists-runtime.js` | IEListsRuntime: orchestrates initialization of list views, bridging page bootstrap to shared list helpers. | Portal core using shared runtime | Stays under `/portal/core`, but should depend on `/shared/runtime` helpers instead of duplicating logic.
`portal/runtime/page-bootstrap.js` | IEPageBootstrap: central page bootstrap that wires `IEConfig`, list runtimes, and per-page entry points. | Portal core using shared runtime | Stays under `/portal/runtime`, but should delegate to `/shared/config` and `/shared/runtime` for cross-system concerns.

Additional portal files (for example `portal/core/app-shell.js`, `portal/core/supabase-client.js`) are **portal-only infrastructure** today: they are critical to portal behavior but do not yet qualify as cross-system shared runtime. They should remain under `/portal` unless and until another system (for example `/head`) explicitly needs them.

#### 3.2 Belonging in `/shared/runtime` vs other shared areas

- **Belongs in `/shared/config`**
  - `assets/js/config.js` – canonical home for `IEConfig` and derived helpers. In the future, this should export a shared config module consumed by both `/site` and `/portal` (and `/head` when introduced).

- **Belongs in `/shared/runtime`**
  - `portal/runtime/status-runtime.js` (IEStatusRuntime).
  - `portal/runtime/shared-formatters-runtime.js` (IEFormatters).
  - `portal/runtime/lists/shared-list-helpers.js` (IEListsSharedHelpers).
  - Any additional, truly generic runtime helpers that do not depend on portal-specific DOM or layout.

- **Stays in `/portal` but uses `/shared`**
  - `portal/core/lists-runtime.js` and `portal/runtime/page-bootstrap.js` should continue to live under `/portal`, but their dependencies on status, formatters, list helpers, and config should be routed through `/shared/config` and `/shared/runtime`.

This separation keeps **shared runtime** free of portal-specific layout or routing details, and lets future systems (for example `/head`) reuse the same status and formatting logic without importing portal UI code.

---

### 4. Phase-by-phase migration plan

This plan is intentionally **documentation-first** and **low risk**, aligned with `TARGET-REPO-LAYOUT.md`. No phase requires immediate physical moves; each step can be executed incrementally.

#### Phase 1 – Ownership and docs normalization

- **Scope**
  - Finalize and maintain this `REPO-OWNERSHIP-INVENTORY.md` as the single map from current layout to target `/site`, `/portal`, `/shared`, `/scripts`, and `/archive`.
  - Cross-link from `TARGET-REPO-LAYOUT.md`, `WEBSITE-STRUCTURE.md`, and portal refactor docs to this inventory.
- **Why it is safe**
  - Purely documentation; no code or deployment changes.
  - Establishes stable ownership language (Site, Portal, Shared, Docs, Scripts, Archive) used in future phases.

#### Phase 2 – Docs and archive cleanup (SAFE MOVE focus)

- **Scope**
  - Rationalize and, when appropriate, relocate documentation trees under the conceptual `/docs/site`, `/docs/portal`, `/docs/shared`, and `/docs/ai` groupings.
  - Continue cleaning up `archive/site/` (formerly `archive/website/`) by moving additional confirmed-unused assets into archives, documenting each move.
- **Why it is safe**
  - Operates only on **SAFE MOVE** content (`docs/*`, `archive/site/*`) that is not referenced by runtime or build tooling.
  - Any tooling ignore patterns for archives (for example, link checker and AVIF generators skipping `archive/site/`) are already in place and can be updated in a controlled way.

#### Phase 3 – Shared runtime and config extraction

- **Scope**
  - Define and document the canonical modules in `/shared/config` and `/shared/runtime` (IEConfig, IEStatusRuntime, IEFormatters, IEListsSharedHelpers, IEListsRuntime).
  - Gradually refactor portal runtime to consume these shared modules without changing external behavior.
  - Keep the physical locations for existing files (for example `assets/js/config.js`, `portal/runtime/status-runtime.js`) until shared APIs are stable and well tested.
- **Why it is safe**
  - Behavior-preserving refactors within portal runtime, guarded by existing docs and portal audits.
  - No Netlify route changes or static site restructuring; only JS imports and internal wiring change.

#### Phase 4 – Scripts and tooling restructuring

- **Scope**
  - Group Node-based scripts under the conceptual `/scripts/site`, `/scripts/portal`, and `/scripts/shared` structure.
  - Align build tooling (Tailwind, PostCSS, image generation) with the target layout so that future physical moves require minimal script changes.
- **Why it is safe**
  - Scripts operate on the filesystem but do not serve user traffic directly.
  - Migration can be done incrementally with dry runs and clear before/after comparisons for generated assets.

#### Phase 5 – Site folder introduction and static HTML normalization

- **Scope**
  - Introduce the `/site` concept in docs and (when ready) physically move static site files (root HTML, section folders, `assets/`, `partials/`) into `/site/pages`, `/site/assets`, and `/site/partials`.
  - Normalize hardcoded `/ItalianExperience/...` paths in HTML templates using a documented placeholder strategy (for example `%%BASE_PATH%%`) driven by `IEConfig.BASE_PATH`.
- **Why it is high impact but manageable**
  - Tightly coupled to deployment base paths and SEO-visible URLs, so it must be done carefully.
  - By this phase, shared config and runtime will already centralize BASE_PATH and PORTAL_PATH rules, reducing the number of places that need manual edits.

#### Phase 6 – Final repo reshaping and head system introduction

- **Scope**
  - Complete physical moves to fully align the tree with `/site`, `/portal`, `/shared`, `/scripts`, and `/archive`.
  - Introduce `/head` as a separate system if/when the head dashboard is implemented, consuming `/shared/config` and `/shared/runtime` but owning its own layout and styles.
- **Why it is safe when reached**
  - Performed only after earlier phases have stabilized ownership, shared runtime, and tooling.
  - Moves are largely mechanical (`git mv` aligned with this document and `TARGET-REPO-LAYOUT.md`), with routing and deployment rules already abstracted through shared config.

---

### 5. Summary of outputs

- **A. File created** – `docs/architecture/REPO-OWNERSHIP-INVENTORY.md` (this document).
- **B. Ownership table** – Section 1 maps current major directories and file groups to system ownership and future locations.
- **C. Risk classification** – Section 2 classifies each major folder/group as SAFE, LOW RISK, or HIGH RISK with reasons.
- **D. Shared runtime candidates** – Section 3 lists current shared infrastructure and recommends what belongs in `/shared/config` vs `/shared/runtime`.
- **E. Migration phases** – Section 4 defines realistic, phase-based migration steps with safety rationale for each phase.

