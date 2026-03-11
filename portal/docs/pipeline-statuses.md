## Pipeline statuses

This document describes how pipeline statuses are used across the ATS, which statuses belong to the **active** pipeline, and which represent **terminal** outcomes.

### Authoritative status source

The authoritative pipeline status for applications is:

- `candidate_job_associations.status`

All pipeline views, counts, and filters must derive from this column.  
Statuses on other tables (for example `job_offers.status`) must **not** be used for application pipeline logic.

**Candidate profile status** (`candidates.status`) is separate from the application pipeline. It represents the **profile lifecycle** inside the internal database: `pending_review`, `approved`, `rejected`, `archived`. It is **not** used for pipeline stages (applied, screening, interview, offer, hired, etc.); those exist only on `candidate_job_associations.status`.

### Active pipeline vs terminal statuses

**Active pipeline statuses** (used in pipeline counts and boards):

- `applied`
- `screening`
- `interview`
- `offer`
- `hired`

These statuses appear in:

- Applications list pipeline summary bar.
- Application Detail pipeline dashboard.
- Pipeline (kanban) view on the Applications page.

**Terminal statuses** (excluded from active pipeline counts by default):

- `rejected`
- `withdrawn`
- `not_selected`

These indicate closed or archived paths and are not included in the active pipeline summary. They are still visible in lists and detail views when filtering by status.

### Pipeline summary rules

Pipeline summary counts must follow these rules:

- Count only applications with `status` in:
  - `applied`, `screening`, `interview`, `offer`, `hired`
- Exclude applications with `status` in:
  - `rejected`, `withdrawn`, `not_selected`
- Pipeline counts are derived directly from `candidate_job_associations` filtered by:
  - Optional job offer, client, and date filters.
  - **Not** by the currently selected status filter in the UI (the summary should represent the full active pipeline under the current global filters).

### Candidate availability

Candidate availability is a **derived** concept based on application statuses and is not persisted as a pipeline status:

- `working` – if the candidate has at least one application with `status = 'hired'`.
- `in_process` – if the candidate has at least one application in:
  - `applied`, `screening`, `interview`, `offer`
- `available` – if the candidate has no applications in the active pipeline and no `hired` applications.

Implementation:

- Availability is computed via `IEQueries.candidates.deriveAvailabilityFromApplications(applications)` using `candidate_job_associations.status`.
- The system must not write derived availability back to the database as a separate status field.

### Archived applications

Archived applications are defined strictly by:

- `candidate_job_associations.status = 'withdrawn'`

Effects:

- Archived applications do not appear in active recruiting views by default.
- The Archived page exposes:
  - A read-only list of archived applications.
  - Actions to:
    - **Restore** the application (status → `applied` via `IEQueries.applications.updateApplicationStatus`).
    - **Permanently delete** the application (admin-only path via `IEQueries.applications.deleteApplicationPermanently`).

### Job closing and reopen impact on statuses

When a job offer is closed automatically (because `hired` count reaches `positions_required`):

- Applications for that job with status **not** in:
  - `hired`
  - `rejected`
  - `withdrawn`
  are set to `not_selected`.

When a job offer is reopened:

- Applications for that job with `status = 'not_selected'` are set back to `screening` to re-enter the active pipeline.
- This is a fallback rule because previous stages are not stored structurally in the current schema.

