## AI-assisted development in this repo

This repository is actively developed with AI‑assisted workflows. The goal is to keep the portal’s runtime architecture explicit and well‑documented so AI agents can safely audit, plan, and implement changes without regressing behavior.

Key AI‑facing architecture modules include:

- **IEStatusRuntime**: Centralizes status normalization, labels, and availability logic for core entities (candidates, applications, job offers, and related views).
- **IEFormatters**: Canonical home for shared formatting helpers such as `escapeHtml`, date formatting, and other view‑level transformers.
- **IEListsSharedHelpers**: Shared helpers for list/table rendering, filters, pagination, and other list‑runtime utilities.
- **IEListsRuntime**: Entry points for list and dashboard initialization used by `IEPageBootstrap.runDataViews(pageKey)` for pages such as `dashboard`, `candidates`, `job-offers`, `applications`, and `clients`.

**Security-sensitive audits (strict):** Security-sensitive audits must **never** be created in public docs paths. They must be created **directly** in `docs/_private-transfer/`. This includes any audit covering security, RLS, storage policies, Edge Functions, vulnerabilities, attack surface, abuse vectors, privacy exposure, or remediation details. Do **not** leave placeholder files in public docs for such audits unless the user explicitly requests a placeholder.

Workflow rules for AI changes:

- **Audit first**: Inspect the current runtime, architecture docs, and relevant audits before proposing code changes.
- **Then plan**: Propose a phase‑aware plan that aligns with the portal refactor master plan and roadmap before touching runtime code.
- **Then implement**: Only after audit + plan are stable, make behavior‑preserving changes that respect the runtime boundaries and ownership documented in `docs/refactor/`.
- **Update docs after major refactors**: Any substantial change to routing, bootstrap ownership, list runtimes, or shared helpers must be reflected in the refactor and architecture docs under `docs/refactor/` and `docs/architecture/`.
- **Notion audit = memoria di progetto (sync solo su trigger materiale o richiesta)**: The Notion space “Italian Experience – Audit progetto” is high-level project memory, not a changelog. Update (1) `docs/AUDIT-COMPLETO-PROGETTO-NOTION.md` and (2) the corresponding Notion pages **only** when: material architecture change, material DB schema change, RLS/storage/Edge Function behavior changes materially, new module or major system area is added, core business flow changes, or the user **explicitly requests** a Notion sync. Do **not** update Notion for: minor code edits, UI/styling tweaks, typo fixes, comment-only edits, small README wording changes, or small refactors that do not change architecture. See `docs/NOTION-SYNC-CONVENTIONS.md` and `.cursor/rules/notion-audit-sync.mdc`.

### Path and base‑path rules for AI changes

- **No new hardcoded `/ItalianExperience` in runtime code**: All runtime URL and path logic must be derived from `window.IEConfig` (for example `IEConfig.BASE_PATH`, `IEConfig.PORTAL_PATH`, and `IEConfig.SITE_URL`). Do not introduce new fallbacks such as `(window.IEConfig && window.IEConfig.BASE_PATH) || "/ItalianExperience"` in JS.
- **Runtime vs static HTML**: Runtime path fixes should be implemented only in JS/TS using `window.IEConfig`. Static HTML templates and their hardcoded `/ItalianExperience/...` links will be normalized in a **separate dedicated phase**; do not pre‑empt that work by editing HTML paths ad‑hoc.
- **See also**: `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md` for the authoritative description of BASE_PATH, PORTAL_PATH, SITE_URL, and runtime path conventions; the **Authoring rules for new pages and templates** section in that doc for static HTML, runtime JS, and portal rules when adding or editing pages; and `docs/architecture/TARGET-REPO-LAYOUT.md` for the canonical future repo layout and system ownership.

