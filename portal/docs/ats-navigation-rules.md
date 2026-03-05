## ATS navigation rules

The ATS uses consistent navigation patterns across all list and detail pages. Row clicks always open the **primary entity** for the table, while inline links navigate to related entities.

### Candidates list

- **Row click** → opens the candidate profile:  
  `candidate.html?id=<candidate_id>`
- **Inline links**:
  - Any job/client links rendered inside the row open their respective pages and do not trigger the row click.

### Candidate profile – Applications section

In the candidate profile (`candidate.html`), the “Associated Offers” / applications table behaves as follows:

- **Row click** → opens the Application Detail page:  
  `application.html?id=<association_id>`  
  where `association_id = candidate_job_associations.id`.
- **Inline links**:
  - Job offer name → `job-offer.html?id=<job_offer_id>`
  - (Future) client name → `client.html?id=<client_id>`
- Row click **ignores** clicks originating from links or buttons inside the row.

Applications can be created from the candidate page using the “Add Application” button, but the applications list itself is read-only.

### Job offer page – associated candidates

In the job offer detail page, the “Associated Candidates” section:

- **Row click** → opens the candidate profile:  
  `candidate.html?id=<candidate_id>`
- **Inline links**:
  - Candidate links or actions inside the row retain their own navigation behavior.

### Applications list (`applications.html`)

- **Row click** → opens the Application Detail page:  
  `application.html?id=<association_id>`
- **Inline links**:
  - Candidate name → `candidate.html?id=<candidate_id>`
  - Job offer title → `job-offer.html?id=<job_offer_id>`
  - Client name → `client.html?id=<client_id>`
- The table does **not** have an Actions column; navigation is driven by row clicks and inline links only.

The Applications list page is read-only: it does not allow creating new applications.

### Application Detail (`application.html`)

The Application Detail page is the **primary control point** for a single application:

- Header shows:
  - Candidate name (link to candidate profile).
  - Job offer title (link to job offer).
  - Client name (link to client).
- All navigation uses the same URL patterns as above:
  - `candidate.html?id=<candidate_id>`
  - `job-offer.html?id=<job_offer_id>`
  - `client.html?id=<client_id>`

The status dropdown uses the centralized query layer (`IEQueries.applications.updateApplicationStatus`) and does not introduce new navigation paths.

### Universal interaction pattern

Across all ATS tables:

- **Row click** opens the primary entity for that table.
- **Inline links** open related entities and prevent the row click from firing.
- Row click **ignores** events originating from interactive elements (`<a>`, `<button>`, icons inside buttons).

This guarantees consistent navigation and prevents accidental navigation when users click action buttons inside rows.

