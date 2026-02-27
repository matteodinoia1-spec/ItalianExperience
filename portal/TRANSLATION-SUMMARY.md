# ATS Portal – Italian to English Standardization Summary

## Renamed fields (database → code)

### Table: `clients`
| Italian (old) | English (new) |
|---------------|---------------|
| nome          | name          |
| citta         | city          |
| stato         | state         |
| nazione       | country       |
| telefono      | phone         |
| note          | notes         |

### Table: `job_offers`
| Italian (old)   | English (new)  |
|-----------------|----------------|
| titolo_posizione| title          |
| descrizione     | description    |
| paga            | salary         |
| tipo_contratto  | contract_type  |
| numero_posizioni| positions      |
| stato_offerta   | status         |
| citta           | location*      |

*Code uses `location`; migration can rename `citta` → `city` if your table has `citta`. If it already has `location`, skip.

### Table: `candidates`
Already used in code: `first_name`, `last_name`, `position`, `address`, `status`, `source`, `notes`.  
If your DB still has Italian names, use the commented block in the migration.

### Table: `profiles`
Already uses `first_name`, `last_name` in code. Migration includes optional renames if your DB has `nome`/`cognome`.

---

## Relationships (unchanged)

- `client_id` – unchanged
- `candidate_id` – unchanged  
- `job_offer_id` – unchanged
- `created_by` – unchanged
- Foreign keys and RLS are not modified by the renames.

---

## Files updated

### SQL migration
- **portal/supabase-migration-italian-to-english.sql** – Run in Supabase SQL Editor (adjust/skip lines if columns are already in English).

### JavaScript
- **portal/supabase.js** – Clients: `buildClientsQuery`, `insertClient`, `fetchClientsPaginated` use `name`, `city`, `state`, `country`, `phone`, `notes`. Comments updated.
- **portal/app.js** – In-memory store (clients, candidates, job_offers), `saveClient`, `saveJobOffer`, `saveCandidate`, `updateCandidateFromForm`, `initEditCandidatePage`, `applyCandidateFilters`, `applyJobOfferFilters`, `applyClientFilters`, `mapCandidateRow`, `mapJobOfferRow`, all table render functions and references updated to English property names.
- **portal/archiviati.js** – Archived clients table uses `row.name`, `row.city`, `row.state`.
- **portal/dashboard/dashboard.js** – `fetchActiveJobOffers` uses `status` (and `in("status", ["open", "attiva"])`), `fetchRecentCandidates` uses `first_name`, `last_name`, `position`, `fetchCandidatesBySource` uses `source`, `renderRecentCandidates` uses `first_name`, `last_name`, `position`.

### HTML (form field names only; labels/texts unchanged)
- **portal/add-cliente.html** – `name`, `city`, `state`, `country`, `phone`, `notes`.
- **portal/add-offerta.html** – `title`, `description`, `status`.
- **portal/add-candidato.html** – `first_name`, `last_name`, `address`, `position`, `source`, `notes`.
- **portal/edit-candidato.html** – `first_name`, `last_name`, `address`, `position`, `source`, `notes`.

---

## UI safety

- **Not changed:** Labels, titles, buttons, placeholders, and any user-facing text. They remain in Italian (e.g. "Candidati", "Aggiungi Candidato", "Nome", "Città", "Salva", etc.).
- **Changed:** Only database column names, JS property names, and form input `name` attributes used for reading/writing data.

---

## Verification checklist

- [x] No broken Supabase queries: clients, candidates, job_offers use English column names in queries and mappings.
- [x] No missing fields: insert/update payloads and store shapes use the new names consistently.
- [x] Lint: no reported errors in modified JS files.
- [ ] **You should:** Run the SQL migration in Supabase only for tables that still have Italian columns (skip or comment out renames for columns that are already in English).
- [ ] **You should:** Manually test: load lists, add/edit client, add/edit candidate, add/edit job offer, archived sections, dashboard, and search/filters.

---

## If your DB already has English columns

If `clients` already has `name`, `city`, etc., do **not** run the CLIENTS block (or run only the renames that match your current column names). Same for `job_offers` and `candidates`: run only the ALTERs that match your schema. The portal code now expects the English names listed above.
