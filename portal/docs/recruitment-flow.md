## Recruitment flow

The ATS is centered on **applications** represented by the `candidate_job_associations` table.

High-level entity flow:

- **Candidate** → person in the talent pool.
- **Application** (`candidate_job_associations`) → link between a candidate and a specific job offer, with its own status and history.
- **Job offer** (`job_offers`) → role or position opened by a client.
- **Client** (`clients`) → company or venue that owns one or more job offers.

Canonical relationship:

- Candidate  
  ↓  
  Application (`candidate_job_associations`)  
  ↓  
  Job offer (`job_offers`)  
  ↓  
  Client (`clients`)

Key principles:

- The **application** is the primary unit of the recruiting pipeline.
- Pipeline status and counts always come from `candidate_job_associations.status`.
- Candidates can have **multiple applications** to different job offers at the same time.
- Candidate availability (available / in_process / working) is **derived** from their applications and is never persisted as a separate field.

