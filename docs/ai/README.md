## AI-assisted development in this repo

This repository is actively developed with AI‑assisted workflows. The goal is to keep the portal’s runtime architecture explicit and well‑documented so AI agents can safely audit, plan, and implement changes without regressing behavior.

Key AI‑facing architecture modules include:

- **IEStatusRuntime**: Centralizes status normalization, labels, and availability logic for core entities (candidates, applications, job offers, and related views).
- **IEFormatters**: Canonical home for shared formatting helpers such as `escapeHtml`, date formatting, and other view‑level transformers.
- **IEListsSharedHelpers**: Shared helpers for list/table rendering, filters, pagination, and other list‑runtime utilities.
- **IEListsRuntime**: Entry points for list and dashboard initialization used by `IEPageBootstrap.runDataViews(pageKey)` for pages such as `dashboard`, `candidates`, `job-offers`, `applications`, and `clients`.

Workflow rules for AI changes:

- **Audit first**: Inspect the current runtime, architecture docs, and relevant audits before proposing code changes.
- **Then plan**: Propose a phase‑aware plan that aligns with the portal refactor master plan and roadmap before touching runtime code.
- **Then implement**: Only after audit + plan are stable, make behavior‑preserving changes that respect the runtime boundaries and ownership documented in `docs/refactor/`.
- **Update docs after major refactors**: Any substantial change to routing, bootstrap ownership, list runtimes, or shared helpers must be reflected in the refactor and architecture docs under `docs/refactor/` and `docs/architecture/`.

### Path and base‑path rules for AI changes

- **No new hardcoded `/ItalianExperience` in runtime code**: All runtime URL and path logic must be derived from `window.IEConfig` (for example `IEConfig.BASE_PATH`, `IEConfig.PORTAL_PATH`, and `IEConfig.SITE_URL`). Do not introduce new fallbacks such as `(window.IEConfig && window.IEConfig.BASE_PATH) || "/ItalianExperience"` in JS.
- **Runtime vs static HTML**: Runtime path fixes should be implemented only in JS/TS using `window.IEConfig`. Static HTML templates and their hardcoded `/ItalianExperience/...` links will be normalized in a **separate dedicated phase**; do not pre‑empt that work by editing HTML paths ad‑hoc.
- **See also**: `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md` for the authoritative description of BASE_PATH, PORTAL_PATH, SITE_URL, and runtime path conventions, and `docs/architecture/TARGET-REPO-LAYOUT.md` for the canonical future repo layout and system ownership.

