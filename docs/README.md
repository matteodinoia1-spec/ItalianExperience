## Documentation index

This repository’s documentation is organized to keep the portal refactor and architecture work developer‑focused and easy to navigate.

- **architecture/**: High‑level system shape and structure, including website layout, file maps, canonical UI architecture documents, and base‑path/url conventions.
- **refactor/**: Governance, audits, plans, and logs for the portal refactor (audit, master plan, roadmap, and execution log, plus related UI refactor steps).
- **ai/**: Notes and guidance for AI‑assisted development workflows in this repo, including how AI agents should reason about the architecture and refactor phases.
- **audits/**: Only for **non-sensitive** engineering or process audits (e.g. base-path, file-map, refactor process). Any audit about security, RLS, storage policies, Edge Functions, vulnerabilities, attack surface, abuse vectors, privacy exposure, or remediation details **must** go directly into `docs/_private-transfer/` and must not be created in public docs paths.
- **_private-transfer/**: Temporary holding area for internal/sensitive documents (schema, workflow, caching, and audit material) that should be migrated to a private workspace such as Notion and **not** treated as public docs. All security-sensitive audits (security, RLS, storage, Edge Functions, vulnerabilities, attack surface, abuse vectors, privacy, remediation) must be placed here directly—never in `docs/audits/` or other public paths.

Sensitive or internal docs live under `docs/_private-transfer/`, `docs/_private/` (if present), and `.ai-context/`. These locations are intentionally excluded from the public documentation tree and are ignored by git so they can remain local‑only or be migrated to a private workspace.

When adding new docs, prefer placing:

- Architecture or structural decisions under `architecture/`
- Refactor plans, audits, or logs under `refactor/`
- AI‑facing guidance or prompts under `ai/`
- Non-sensitive engineering/process audits under `audits/`; **security-sensitive audits** (security, RLS, storage policies, Edge Functions, vulnerabilities, attack surface, abuse vectors, privacy exposure, remediation) **must** go directly into `docs/_private-transfer/`—do not create them in public paths or leave placeholder files unless explicitly requested.

### Key architecture docs

- **Target repository layout**: see `docs/architecture/TARGET-REPO-LAYOUT.md` for the canonical future repo structure and ownership model.
- **Website structure and base path**: see `docs/architecture/WEBSITE-STRUCTURE.md`.
- **Website file map and routes**: see `docs/architecture/WEBSITE-FILE-MAP.md`.
- **Website URL and path conventions** (BASE_PATH, PORTAL_PATH, SITE_URL, and runtime rules): see `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md`.

### Notion audit (memoria di progetto)

The project maintains an audit on Notion (“Italian Experience – Audit progetto”) as **high-level project memory** (structure, file inventory, Supabase schema/RLS/storage/Edge Functions, env, business flows). **Rule: sync to Notion only** on material architecture/DB/RLS/storage/Edge Function changes, new major modules, core business flow changes, or **explicit user request**. Do **not** sync for minor code edits, UI/styling tweaks, typos, comment-only edits, small README wording, or small refactors that don't change architecture. Source: `docs/AUDIT-COMPLETO-PROGETTO-NOTION.md`; sync via Notion MCP. See `docs/NOTION-SYNC-CONVENTIONS.md` for triggers and workflow.

### Migration note (private workspace)

Internal docs in `docs/_private-transfer/` are excluded from the public tree and should be migrated to a private workspace when appropriate.

