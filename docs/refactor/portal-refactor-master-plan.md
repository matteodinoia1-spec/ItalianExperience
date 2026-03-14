## Portal refactor – master plan

**Scope:** `portal/` recruitment portal (vanilla JS, Supabase)  
**Audience:** maintainers and reviewers of the refactor  
**Governs:** sequencing, architectural intent, and acceptance criteria for phases 0–6.

This master plan is the **governing document** for the portal refactor. It is grounded in the findings from `docs/refactor/portal-refactor-audit.md` and is operationalized by `docs/refactor/portal-refactor-roadmap.md`. The roadmap may evolve in implementation detail, but **must not violate** the phase goals, architecture intentions, or constraints defined here.

---

## 1. Reference documents

- **Primary audit:** `docs/refactor/portal-refactor-audit.md`  
- **Database/workflow audit:** `docs/_private-transfer/portal-workflow-database-audit.md`  
- **Operational roadmap:** `docs/refactor/portal-refactor-roadmap.md`  
- **Execution log:** `docs/refactor/portal-refactor-execution-log.md`

All phases (0–6) MUST be validated against the combination of:

1. The current repository state under `portal/`  
2. The architectural target described in the audit (sections E–F)  
3. The concrete steps and in-scope files listed in the roadmap.

---

## 2. Phase overview (0–6)

**Phase 0 – Audit & validation gate**  
- **Goal:** Confirm that the committed repository matches the assumptions in the audit and that governance documents (this master plan + roadmap) exist and are coherent.  
- **Outcome:** GO/NO-GO decision for Phase 1, recorded in `docs/refactor/portal-refactor-execution-log.md`.  
- **Code changes:** None. This phase is analysis- and documentation-only.

**Phase 1 – Status and formatter consolidation (low risk)**  
- **Goal:** Centralize status normalization and badge/label formatting for candidates, applications, job offers (and external submissions), and consolidate date/HTML formatting to shared helpers.  
- **Primary intent:**  
  - Use `portal/runtime/status-runtime.js` as the single canonical source for status normalization and badge classes.  
  - Introduce shared, reusable formatters (e.g. `formatDate`, `escapeHtml`) and remove local ad‑hoc copies where safely possible.  
- **Architecture constraint:** No change to routing, bootstrap ownership, or file layout; this is a **behavior-preserving internal consolidation**.

**Phase 2 – List initialization unification (bootstrap-owned)**  
- **Goal:** Ensure that all list pages (including `job-postings` and, optionally, `external-submissions`) are initialized via `IEPageBootstrap.runDataViews(pageKey)` instead of self‑initializing on `DOMContentLoaded`.  
- **Primary intent:**  
  - Keep `portal/runtime/page-bootstrap.js` as the orchestrator for list/data‑view initialization.  
  - Make `job-postings` and any other list pages participate in the same bootstrap pipeline as `dashboard`, `candidates`, `job-offers`, `applications`, and `clients`.  
- **Architecture constraint:** No functional change to filters, pagination, or data sources; only ownership and wiring of init functions are adjusted.

**Phase 3 – Lists runtime split (structural, behavior-preserving)**  
- **Goal:** Split `portal/core/lists-runtime.js` into smaller, responsibility-focused modules (dashboard, per-entity lists, shared helpers) under the runtime layer, without changing observable behavior.  
- **Primary intent:**  
  - Move list and dashboard logic from `core/` into `runtime/` (e.g. `runtime/lists/*`) in line with the audit’s target structure.  
  - Extract shared list utilities (filters, pagination, table row rendering, date/status/HTML formatting) into a dedicated helper module reused across lists.  
- **Architecture constraint:** Keep an explicit public surface (e.g. `window.IEListsRuntime.init*Page`) so `page-bootstrap` and existing HTML script tags remain compatible.

**Phase 4 – Data path and app-shell simplification**  
- **Goal:** Unify how entity detail flows (especially applications) persist changes, and shrink `core/app-shell.js` to pure bootstrap glue.  
- **Primary intent:**  
  - Ensure application save/update flows go through a single data path (e.g. `IEData.applications` and/or `IEQueries`) instead of calling raw `supabase.from(...)` from entity configs.  
  - Reduce `app-shell` to: auth guard, bootstrap helpers, and global wiring; move page-specific list/data-view logic into runtime modules.  
- **Architecture constraint:** Do not change the domain model or database semantics during this phase; use the existing schema as validated by `docs/portal-workflow-database-audit.md`.

**Phase 5 – Router, URLs, and navigation consistency**  
- **Goal:** Make routing, page-key detection, and entity URLs consistent across `core/router.js`, `portal/runtime/router-runtime.js`, header/breadcrumb code, and entity configs.  
- **Primary intent:**  
  - Ensure all real pages (including `external-submissions`) have stable, explicit page keys where appropriate.  
  - Use a single canonical implementation of “entity view/edit URL” (e.g. `IEToolbar.getEntityViewUrl`) and have entity configs delegate to it.  
- **Architecture constraint:** No new pages or flows are introduced in this phase; behavior must remain functionally equivalent with improved consistency and testability.

**Phase 6 – Documentation and legacy cleanup**  
- **Goal:** Align documentation with the new architecture, archive or deprecate superseded docs, and remove legacy fallbacks once the new paths are proven stable.  
- **Primary intent:**  
  - Consolidate portal docs into a small, curated set (including this master plan, the audit, workflow/database audit, roadmap, and a “decisions” log if needed).  
  - Remove or archive obsolete patterns (e.g. legacy initialization code paths) that are no longer reachable after phases 1–5.  
- **Architecture constraint:** No new runtime behavior should be introduced here; this is clean‑up and documentation alignment only.

---

## 3. High-level architecture intentions

Across all phases, the refactor MUST move the codebase toward the following target architecture (see section E of `docs/portal-refactor-audit.md` for detailed rationale):

- **Core vs runtime separation**
  - `core/` owns **infrastructure**: routing helpers, Supabase client and facade, auth, session, entity-page shell, entity toolbar UI, base data modules (`IEData.*`), and low-level UI primitives (modals, previews).  
  - `runtime/` owns **page orchestration and behavior**: page key detection, bootstrap, list and dashboard init, status and availability computation, entity‑specific runtimes, and shared UX helpers.

- **Single status and formatting layer**
  - Status semantics for candidates, applications, job offers, and availability are canonicalized in `runtime/status-runtime.js`.  
  - Date formatting, HTML escaping, and badge classes are sourced from shared helpers instead of ad‑hoc, file‑local implementations.

- **Unified list initialization**
  - All list and dashboard pages are initialized via `IEPageBootstrap.runDataViews(pageKey)` (or a single list-registry abstraction), eliminating fragile `DOMContentLoaded` self‑init patterns for lists.

- **Consistent data access paths**
  - Domain data flows through `IESupabase` (`core/supabase.js`) and/or `IEQueries.*` with a clear contract; raw `supabase.from(...)` calls in high-level features are phased out or wrapped in shared modules.  
  - The real “application” layer is `candidate_job_associations` as described in the workflow/database audit; all refactor steps respect that.

- **Consistent routing and URLs**
  - `runtime/router-runtime.js` exposes stable page keys that match actual entry points (including job postings and external submissions).  
  - URL construction for entity view/edit flows is centralized, and entity configs cooperate with rather than reimplement that logic.

---

## 4. Governance rules for the refactor

- **No cross-phase scope leakage**
  - Each phase should be implemented and validated independently.  
  - If a later-phase change (e.g. router or app-shell) becomes necessary to complete an earlier phase safely, the governance log must capture that as a **phase scope adjustment**, with justification in `docs/portal-refactor-execution-log.md`.

- **Audit alignment is mandatory**
  - Any deviation from the architecture described in `docs/portal-refactor-audit.md` must either:  
    - (a) be clearly documented as a deliberate override in this master plan and in the execution log, or  
    - (b) be incorporated back into an updated version of the audit.

- **Database behavior is a hard constraint**
  - The workflow/database audit defines the **source of truth** for actual table behavior (especially status enums, RLS, and activity logs).  
  - Phases 1–5 must not silently assume new database semantics; any required DB change must be handled via explicit migrations and their own review process.

- **Roadmap is subordinate but binding**
  - `docs/portal-refactor-roadmap.md` breaks this master plan into concrete steps and in-scope files.  
  - Implementation must follow the roadmap unless a change is recorded in the execution log and, if structural, reflected back into this master plan.

- **Execution logging**
  - At the end of each phase, update `docs/portal-refactor-execution-log.md` with:  
    - Date of completion  
    - Files actually touched  
    - Any scope deviations  
    - GO/NO-GO for the next phase.

---

## 5. Relationship between audit, master plan, and roadmap

- The **audit** describes the **current architecture and problems**, plus a proposed target structure and migration sequence.  
- This **master plan** defines the **governing phases, goals, and architectural constraints** for moving from current to target state.  
- The **roadmap** expresses the **operational sequence and file-level plan** used to execute the refactor.  

During refactor execution:

- If the **repo shape** or database behavior diverges from the audit, re-run Phase 0 validation and update all three documents as needed.  
- If the roadmap needs to change but the architectural intent does not, update only the roadmap and execution log.  
- If architectural intent changes, update the audit and master plan together and re-validate Phase 0.

---

## 6. Phase 1 scope confirmation (for governance)

For avoidance of doubt, **Phase 1** is defined as:

- Consolidate status and badge/label logic into `runtime/status-runtime.js` (including external submissions where appropriate).  
- Introduce or centralize shared formatters (date, escapeHtml) so list runtimes, external-submissions features, and header components can converge on them.  
- Avoid any structural changes to routing, bootstrap, or file locations; those belong explicitly to **Phases 2–3 and 5**.

This scope definition is the reference point for the Phase 0 validation gate and for the GO/NO-GO decision for starting Phase 1.

