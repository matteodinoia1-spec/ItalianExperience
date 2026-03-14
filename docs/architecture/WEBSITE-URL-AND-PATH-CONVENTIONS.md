## Website URL and path conventions

This document defines how runtime code and portal routes should construct URLs for the Italian Experience public site and recruitment portal.

### Core configuration

All runtime URL logic must derive from `window.IEConfig`. The relevant fields are:

- **BASE_PATH**: Base path for the public marketing site.  
  - Current production value: `/ItalianExperience`  
  - Conceptual pattern: `${BASE_PATH}/section/...` (e.g. `${BASE_PATH}/travel/`, `${BASE_PATH}/recruitment/`).

- **PORTAL_PATH**: Base path for the internal recruitment portal UI.  
  - Today it is aligned with `BASE_PATH`, but it is treated as independent so the portal can move to its own prefix later (for example `${BASE_PATH}/portal` or `/portal`).

- **SITE_URL**: Canonical absolute origin for the marketing site.  
  - Current production value: `https://www.italianexp.com`  
  - Used when generating absolute marketing URLs (e.g. for social, SEO, email), not for internal portal routing.

### Runtime rules

- **Single source of truth**  
  - All runtime path computations must go through `window.IEConfig` (`BASE_PATH`, `PORTAL_PATH`, `SITE_URL` as appropriate).  
  - It is acceptable for `assets/js/config.js` to hardcode the current production values for these fields; other runtime code must not introduce its own base-path literals.

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
  - These templates will be normalized in a dedicated future phase (see below); do **not** treat them as a source of truth for runtime path logic.

- **Runtime JS**  
  - Runtime JS (shared assets and portal runtime files) must treat `window.IEConfig` as the single source of truth and must not introduce new literals for `/ItalianExperience` in URL construction.

### Future HTML normalization (separate phase)

Static HTML path normalization is intentionally deferred to a focused refactor. That phase will:

- Replace hardcoded `/ItalianExperience/...` occurrences in templates and partials with a base-path–aware strategy (for example, a placeholder such as `%%BASE_PATH%%` filled at build time).
- Align all navigation and asset URLs on a single convention derived from `BASE_PATH` (no mixing of `./...` and `/ItalianExperience/...` for the same target).
- Keep portal routing unchanged, still driven by `PORTAL_PATH` and router helpers.

Until that phase is executed, **do not** broadly edit static HTML templates for path changes; confine base-path updates to runtime JS and configuration.

