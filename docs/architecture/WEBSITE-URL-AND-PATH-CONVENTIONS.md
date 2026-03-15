## Website URL and path conventions

This document defines how runtime code and portal routes should construct URLs for the Italian Experience public site and recruitment portal.

### Core configuration

All runtime URL logic must derive from `window.IEConfig`. The relevant fields are:

- **BASE_PATH**: Base path for the public marketing site.  
  - **Current production default (from `assets/js/config.js`)**: `/ItalianExperience`  
  - Conceptual pattern: `${BASE_PATH}/section/...` (e.g. `${BASE_PATH}/travel/`, `${BASE_PATH}/recruitment/`).

- **PORTAL_PATH**: Base path for the internal recruitment portal UI.  
  - **Current production default**: `/ItalianExperience` (falls back to `BASE_PATH` if not explicitly set).  
  - Treated as independent so the portal can move to its own prefix later (for example `${BASE_PATH}/portal` or `/portal`).

- **SITE_URL**: Canonical absolute origin for the marketing site.  
  - **Current production default**: `https://www.italianexp.com`  
  - Used when generating absolute marketing URLs (e.g. for social, SEO, email), not for internal portal routing.

### Runtime rules

- **Single source of truth**  
  - All runtime path computations must go through `window.IEConfig` (`BASE_PATH`, `PORTAL_PATH`, `SITE_URL` as appropriate).  
  - `assets/js/config.js` provides safe **defaults** for these fields, but other runtime code must not introduce its own base-path literals.
  - When an inline script defines `window.IEConfig` **before** `assets/js/config.js` is loaded, that earlier object is treated as an **override**:  
    - Any of `BASE_PATH`, `PORTAL_PATH`, `SITE_URL`, `SUPABASE_FUNCTIONS_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` set there win over the defaults.  
    - If only `BASE_PATH` is provided, `PORTAL_PATH` will by default fall back to `BASE_PATH` unless explicitly set.

- **No new `/ItalianExperience` fallbacks in runtime code**  
  - Do **not** add new patterns of the form:  
    - `(window.IEConfig && window.IEConfig.BASE_PATH) || "/ItalianExperience"`  
    - or any equivalent “if config missing, fall back to `/ItalianExperience`” logic.  
  - If `IEConfig` or `IEConfig.BASE_PATH` / `IEConfig.PORTAL_PATH` is required and missing, runtime code must **fail clearly** (e.g. `console.error` with an explicit message) instead of silently guessing the old path.

- **Shared helpers recommended**  
  - When building paths from a base and segments, prefer a small helper (conceptually):  
    - `joinPath(base, ...segments)` that normalizes slashes and always starts from `IEConfig`.  
  - For public job posting URLs, always derive the base from `IEConfig.BASE_PATH` and then append the public route (e.g. `/recruitment/jobs/?slug=...`).

### Portal routing rules

- **Use router helpers, not raw strings**  
  - Internal portal navigation should use `IERouter` and the portal link helpers (`window.IEPortal.links.*`) instead of hardcoded URL strings.  
  - Examples (conceptual):  
    - `IERouter.navigateTo(window.IEPortal.links.offerView(id))`  
    - `IERouter.navigateTo("job-postings")` when the list key → path mapping is owned by the router.

- **Portal base path**  
  - Where a full portal URL must be built manually (for example when `IERouter.derivePortalBasePath()` is used), treat `PORTAL_PATH` as the authoritative base.  
  - Do not concatenate `/ItalianExperience` directly in portal runtime code; if a new portal section is introduced, add or reuse a router/list-key mapping instead.

### Static HTML vs runtime

- **Static HTML (templates and pages)**  
  - The static public site currently hardcodes `/ItalianExperience/...` in many HTML templates for links and asset URLs. This is **intentional for now** and documented in `WEBSITE-STRUCTURE.md` and `WEBSITE-FILE-MAP.md`.  
  - In **this phase** we do **not** rewrite static HTML; only configuration and tooling are made more base-path–aware.  
  - These templates will be normalized in a dedicated future phase (see below); do **not** treat them as a source of truth for runtime path logic.

- **Runtime JS**  
  - Runtime JS (shared assets and portal runtime files) must treat `window.IEConfig` as the single source of truth and must not introduce new literals for `/ItalianExperience` in URL construction.

### Future HTML normalization (separate phase)

Static HTML path normalization is intentionally deferred to a focused refactor. That phase will:

- Replace hardcoded `/ItalianExperience/...` occurrences in templates and partials with a base-path–aware strategy (for example, a placeholder such as `%%BASE_PATH%%` filled at build time, derived from `IEConfig.BASE_PATH`).
- Align all navigation and asset URLs on a single convention derived from `BASE_PATH` (no mixing of `./...` and `/ItalianExperience/...` for the same target).
- Keep portal routing unchanged, still driven by `PORTAL_PATH` and router helpers.

Until that phase is executed, **do not** broadly edit static HTML templates for path changes; confine base-path updates to runtime JS and configuration.

### Phase 2 migration: static HTML placeholder

As an intermediate step toward full HTML normalization, we use a **placeholder-based migration** on a defined set of static templates. **Only files in this migration scope may use `%%BASE_PATH%%`**; other static pages keep hardcoded `/ItalianExperience` until they are added to the migration.

**Migrated files (source uses `%%BASE_PATH%%`; optional build compiles to `dist/`):**

- **Note:** `dist/` is **build output only**: it is listed in `.gitignore` and is **not** in the repository. It can be produced locally by `node scripts/replace-base-path.mjs` when you need compiled HTML with the production base path, but the default deploy (GitHub Pages) serves directly from the repository source (no build step). See `README.md` for build and publish options.

- `index.html`
- `partials/header.html`
- `partials/footer.html`
- `404.html`
- `contact/index.html`
- `privacy/index.html`
- `travel/index.html`
- `recruitment/index.html`
- `flavors/index.html`
- `estates/index.html`

This migration introduces a simple, build-time placeholder for the site base path:

- **Placeholder in source**: `%%BASE_PATH%%`
- **Current production replacement in build output**: `/ItalianExperience`

#### How it works

- In the migrated templates, hardcoded occurrences of `/ItalianExperience/...` for navigation links, CSS/JS asset URLs, and background images have been rewritten in **source** to start with `%%BASE_PATH%%` instead. External URLs (Zoho, CDN, canonical absolute URLs) are left unchanged.
- Source files remain committed with the placeholder; the build script never modifies source.
- The build-time script `scripts/replace-base-path.mjs` produces compiled HTML:
  - It reads only the migrated files from the project root.
  - It writes compiled versions into `dist/`, preserving relative paths:
    - `index.html` → `dist/index.html`
    - `partials/header.html` → `dist/partials/header.html`
    - `partials/footer.html` → `dist/partials/footer.html`
    - `404.html` → `dist/404.html`
    - `contact/index.html` → `dist/contact/index.html`
    - `privacy/index.html` → `dist/privacy/index.html`
    - `travel/index.html` → `dist/travel/index.html`
    - `recruitment/index.html` → `dist/recruitment/index.html`
    - `flavors/index.html` → `dist/flavors/index.html`
    - `estates/index.html` → `dist/estates/index.html`
  - In the compiled files only, it replaces the **literal** `%%BASE_PATH%%` with the current production base path (`/ItalianExperience`).
- The replacement is **scoped** (only the placeholder string), **non-destructive to source**, and **idempotent**.

#### Build output and deploy

- **Default:** GitHub Pages is configured to publish from the **repository root**; there is no build command. The site is served as-is from the repo (source files with `%%BASE_PATH%%` are loaded by the browser; runtime `IEConfig.BASE_PATH` remains the source of truth for JS).
- **Optional base-path–compiled deploy (local or alternative hosting):** To serve HTML that has `%%BASE_PATH%%` already replaced (e.g. `/ItalianExperience`), run `node scripts/replace-base-path.mjs` locally and publish the generated `dist/` directory to your static host. The script writes only to `dist/`; that directory is in `.gitignore` and is not committed. See `README.md` § Deploy.

#### Scope and intent

- Only the listed static pages and partials use `%%BASE_PATH%%` in source; all other static HTML (including the portal) continues to use existing paths and is unchanged by this migration.
- Runtime JavaScript continues to derive base paths from `window.IEConfig.BASE_PATH` (and `PORTAL_PATH` for portal routes); this migration does not change runtime behavior.
- **Reminder:** Only files explicitly included in this migration may use `%%BASE_PATH%%`. Do not partially convert other files without adding them to the script and this list.

Workflows that need compiled HTML (with `%%BASE_PATH%%` replaced) run `node scripts/replace-base-path.mjs` and use the generated `dist/` as the publish directory; current production base path in that output is `/ItalianExperience`. The repo does not contain `dist/` (it is in `.gitignore`).

### Authoring rules for new pages and templates

When adding or editing static pages, templates, partials, or runtime JS, follow these rules so that base-path handling stays consistent and hardcoded `/ItalianExperience` paths are not reintroduced.

**Static HTML rules**

- Do not introduce new hardcoded `/ItalianExperience/...` paths in pages that are part of the placeholder/build strategy.
- Use `%%BASE_PATH%%/...` for site-wide links and shared asset references in normalized static HTML files.
- Do not mix multiple base-path styles in the same file (e.g. both `%%BASE_PATH%%` and `/ItalianExperience` for the same kind of resource).
- Keep external URLs unchanged (Zoho, CDN, canonical absolute URLs, etc.).

**Runtime JS rules**

- All runtime paths must come from `window.IEConfig`.
- Use `BASE_PATH`, `PORTAL_PATH`, and `SITE_URL` as appropriate.
- Do not introduce new `|| "/ItalianExperience"` fallbacks.

**Portal rules**

- Portal must not use the static-site placeholder strategy.
- Portal must continue using router/path helpers and `IEConfig.PORTAL_PATH`.

**Migration scope rule**

- Only files explicitly included in the placeholder/build migration may use `%%BASE_PATH%%`.
- Files outside the migration scope should not be partially converted ad hoc.

**Do / Don't**

| Do | Don't |
|----|--------|
| `href="%%BASE_PATH%%/travel/"` in pilot HTML | `href="/ItalianExperience/travel/"` in pilot HTML |
| `const base = window.IEConfig?.BASE_PATH` in JS | `const base = window.IEConfig?.BASE_PATH \|\| "/ItalianExperience"` |
| Use `IEConfig.PORTAL_PATH` and router helpers in portal | Use `%%BASE_PATH%%` or hardcoded paths in portal |
| Add new pages to the migration + script when normalizing | Convert one file to `%%BASE_PATH%%` without adding it to the build |

