# ATS Pre-Implementation Verification

Run these checks in the **Supabase SQL Editor** (and dashboard) before implementing the ATS Applications & Availability refactor. The codebase cannot read the live schema directly.

## 1. Schema verification

### 1.1 All relevant tables and columns

```sql
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'candidate_job_associations',
    'candidates',
    'job_offers',
    'clients',
    'activity_logs'
  )
ORDER BY table_name, ordinal_position;
```

**Expected (code-aligned):**

- **candidate_job_associations:** `id`, `candidate_id`, `job_offer_id`, `status`, `notes`, `rejection_reason`, `created_by`, `created_at` (optional: `updated_at`, `stage_updated_at`, `rejection_notes`)
- **candidates:** includes `availability_status` (from migration); `status`, `first_name`, `last_name`, `position`, `is_archived`, etc.
- **job_offers:** `positions_required` (or `positions`), `status`, `closure_note`, `client_id`, etc.
- **activity_logs:** `entity_type`, `entity_id`, `event_type`, `message`, `metadata`, `created_at`, `created_by`

### 1.2 Foreign keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'candidate_job_associations',
    'candidates',
    'job_offers',
    'clients',
    'activity_logs'
  )
ORDER BY tc.table_name, kcu.column_name;
```

Confirm `candidate_job_associations.candidate_id` → `candidates.id` and `candidate_job_associations.job_offer_id` → `job_offers.id`.

### 1.3 Unique constraints on candidate_job_associations

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'candidate_job_associations';
```

Note whether a unique index on `(candidate_id, job_offer_id)` exists. The plan does not add it in the first iteration; verification informs the later decision.

---

## 2. RLS

In **Supabase Dashboard → Authentication → Policies** (or SQL):

- Confirm RLS is **enabled** on: `candidate_job_associations`, `candidates`, `job_offers`, `clients`, `activity_logs`.
- Confirm policies allow the anon/authenticated client used by the portal (see [SECURITY-AUDIT-REPORT.md](SECURITY-AUDIT-REPORT.md)).

---

## 3. Data audit

### 3.1 Application status distribution

```sql
SELECT status, COUNT(*) AS cnt
FROM candidate_job_associations
GROUP BY status
ORDER BY cnt DESC;
```

Use this to plan migration of `new` → `applied` and `offered` → `offer`, and to confirm no unexpected values.

### 3.2 Duplicate applications

```sql
SELECT candidate_id, job_offer_id, COUNT(*) AS cnt
FROM candidate_job_associations
GROUP BY candidate_id, job_offer_id
HAVING COUNT(*) > 1;
```

If any rows are returned, resolve duplicates before adding a unique constraint (future phase).

### 3.3 Sample rejection/notes

```sql
SELECT id, candidate_id, job_offer_id, status, rejection_reason, notes, created_at
FROM candidate_job_associations
WHERE status = 'rejected' OR notes IS NOT NULL
LIMIT 10;
```

Confirm no coupling to old status labels that would break after migration.

---

## 4. Behavior verification (staging)

Before changing code:

1. **Auto-close:** On an open offer with `positions_required = N`, hire N candidates and confirm the offer status becomes closed and remaining in-flight applications become `not_selected`.
2. **Availability:** Confirm candidates with active applications show as unavailable in the association picker; after rejection/not_selected, they can appear available again (if logic uses `availability_status`).
3. **Dashboard:** Total candidates, active offers, and recent candidates load without errors.

After running the above and documenting results, proceed with implementation phases.

---

## 5. ATS Post-Implementation Regression Checklist

After implementing the ATS refactor, verify the following (manually or via automated tests):

- **Candidates page**  
  - List loads; filters (Status: New/Interview/Hired/Rejected, Source) work.  
  - Status badges show canonical labels (Applied, Screening, Interview, Offer, etc.).  
  - Effective status and availability (Available / In process / Working) display correctly.  
  - Row click navigates to candidate detail.

- **Candidate detail**  
  - Associated Offers table shows application status with canonical labels.  
  - Availability row shows derived availability (Available / In process / Working) from job history.

- **Job offers page & detail**  
  - Status filters (Active, Open, In Progress, Closed) work.  
  - Associated count excludes withdrawn applications.  
  - Required vs hired display is correct.  
  - Changing application status (including to Rejected with reason, Hired, Withdrawn) works.  
  - “Remove” sets application to Withdrawn (no physical delete).

- **Applications page**  
  - List loads with columns: Candidate, Job Offer, Client, Status, Updated, Actions.  
  - Filters (Status, Job Offer, Client, Candidate search, date range) work.  
  - Pagination works.  
  - Row / View navigates to candidate.

- **Archived page**  
  - Archived Candidates, Job Offers, Clients sections unchanged.  
  - Archived Applications section lists withdrawn applications.  
  - Restore sets status to Applied and updates availability/offer sync.  
  - Delete permanently removes the association (admin).

- **Dashboard**  
  - Total candidates, active offers, new/hired metrics load.  
  - Recent candidates table and status badges work.

- **Duplicate application**  
  - Linking the same candidate to the same job again shows a controlled error (no duplicate row).
