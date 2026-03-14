## Documentation index

This repository’s documentation is organized to keep the portal refactor and architecture work developer‑focused and easy to navigate.

- **architecture/**: High‑level system shape and structure, including website layout, file maps, canonical UI architecture documents, and base‑path/url conventions.
- **refactor/**: Governance, audits, plans, and logs for the portal refactor (audit, master plan, roadmap, and execution log, plus related UI refactor steps).
- **ai/**: Notes and guidance for AI‑assisted development workflows in this repo, including how AI agents should reason about the architecture and refactor phases.
- **_private-transfer/**: Temporary holding area for internal/sensitive documents (schema, workflow, caching, and audit material) that should be migrated to a private workspace such as Notion and **not** treated as public docs.

Sensitive or internal docs live under `docs/_private-transfer/`, `docs/_private/` (if present), and `.ai-context/`. These locations are intentionally excluded from the public documentation tree and are ignored by git so they can remain local‑only or be migrated to a private workspace.

When adding new docs, prefer placing:

- Architecture or structural decisions under `architecture/`
- Refactor plans, audits, or logs under `refactor/`
- AI‑facing guidance or prompts under `ai/`

### Key architecture docs

- **Website structure and base path**: see `docs/architecture/WEBSITE-STRUCTURE.md`.
- **Website file map and routes**: see `docs/architecture/WEBSITE-FILE-MAP.md`.
- **Website URL and path conventions** (BASE_PATH, PORTAL_PATH, SITE_URL, and runtime rules): see `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md`.

### Migration note (private workspace)

The following internal docs in `docs/_private-transfer/` should be migrated to a private workspace such as Notion and then kept out of the public docs tree:

- `docs/_private-transfer/CACHING-AUDIT-AND-ARCHITECTURE-PLAN.md`
- `docs/_private-transfer/PUBLIC-JOB-POSTINGS-V1-FINAL-AUDIT.md`
- `docs/_private-transfer/database-schema-audit.md`
- `docs/_private-transfer/portal-workflow-database-audit.md`

