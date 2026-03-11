## Application lifecycle

Applications are stored in `candidate_job_associations` and drive the recruiting pipeline. Candidate **profile status** (`candidates.status`: pending_review, approved, rejected, archived) is separate and not part of this lifecycle; see portal docs (STATUS-AUDIT.md, pipeline-statuses.md).

### Active pipeline stages

The active pipeline is defined by the following ordered stages:

1. `applied` – application has been created (replaces legacy `new`).
2. `screening` – CV review, first contact, or initial qualification.
3. `interview` – one or more interviews are being conducted.
4. `offer` – an offer has been sent but not yet accepted.
5. `hired` – the candidate has accepted and started the job.

### Terminal outcomes

Terminal statuses represent closed paths that are no longer part of the active pipeline:

- `rejected` – negative decision by the recruiter or company.
- `withdrawn` – the candidate withdrew; treated as archived.
- `not_selected` – job closed and the candidate was not selected.

Once an application reaches a terminal outcome it is considered complete for that job offer. The application record remains in the system for history and reporting.

### Status transitions

Typical forward progression:

- `applied` → `screening` → `interview` → `offer` → `hired`

Terminal transitions can occur from any active stage:

- `applied` / `screening` / `interview` / `offer` → `rejected`
- `applied` / `screening` / `interview` / `offer` → `withdrawn`
- From any active stage when the job closes and the candidate is not hired → `not_selected`

### Job closing rules

When the number of `hired` applications for a job offer reaches `positions_required`:

- `job_offers.status` is set to `closed`.
- All remaining applications for that job offer whose status is **not** in:
  - `hired`
  - `rejected`
  - `withdrawn`
  are automatically updated to `not_selected`.

This ensures the pipeline reflects that all open slots for that job have been filled.

### Job reopen recovery

If a job offer is reopened after being closed, applications that were automatically set to `not_selected` must be restored to an active stage so that candidates re-enter the pipeline.

Current rule (without schema changes):

- When a closed job is reopened:
  - Applications for that job with `status = 'not_selected'` are reset to `screening`.

This is a **fallback recovery stage**, because the system does not currently store previous pipeline stages in a structured way.  
The purpose is to return candidates to an active recruiting stage without altering the existing database schema.

If a future schema introduces structured stage history (for example an `applications_events` table with `previous_status`), this rule can be refined to restore the exact last active stage.

