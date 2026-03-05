# Audit: Flusso stati – Candidati, Offerte, Clienti e Supabase

Questo documento descrive come sono modellati e allineati gli stati per **candidati**, **offerte di lavoro** e **clienti** nel portal e in Supabase, e dove ci sono duplicazioni o incoerenze.

---

## 1. Riepilogo tabelle Supabase

| Tabella | Colonne stato/archivio | Note |
|--------|-------------------------|------|
| **candidates** | `status`, `availability_status`, `is_archived` | `status` = stato “pipeline”; `availability_status` = disponibilità operativa |
| **job_offers** | `status`, `is_archived` | `status` = ciclo vita offerta (open/active/closed/archived) |
| **candidate_job_associations** | `status` | Stato della candidatura su una singola offerta |
| **clients** | `is_archived` | Nessuno “status” di ciclo vita; `state` = regione/stato geografico |

---

## 2. Candidati

### 2.1 Dove vivono gli stati

- **`candidates.status`** (tabella `candidates`): stato “globale” del candidato nella pipeline (es. “new”, “interview”, “hired”, “rejected”). Usato come fallback quando non c’è un’associazione recente.
- **`candidates.availability_status`** (tabella `candidates`): `available` | `unavailable`. Derivato dalle associazioni: se esiste almeno un’associazione con stato **non** in `(rejected, not_selected)`, il candidato è `unavailable`.
- **`candidate_job_associations.status`**: stato della candidatura **su una specifica offerta**: `new`, `interview`, `hired`, `rejected`, `not_selected`.

### 2.2 Valori usati

| Contesto | Valori |
|----------|--------|
| **candidates.status** (DB) | `new`, `interview`, `hired`, `rejected` (default inserimento: `new`) |
| **candidate_job_associations.status** (DB) | `new`, `interview`, `hired`, `rejected`, `not_selected` |
| **candidates.availability_status** (DB) | `available`, `unavailable` (default migration: `available`) |
| **Filtro lista candidati** (HTML) | All statuses, New, Interview, Hired, Rejected |
| **Badge in lista** (app-shell/lists-runtime) | Stessi valori + fallback “New” per default |

### 2.3 Regole di business

1. **Stato “effettivo” in lista**: nella lista candidati lo stato mostrato è **effective status** = `latest_association.status` se presente, altrimenti `candidate.status`, altrimenti `"new"`.  
   → La lista riflette lo stato sull’**ultima associazione** (ultima offerta collegata), non solo la colonna `candidates.status`.

2. **Pagina profilo candidato** (`candidate.html` + `features/candidates/candidate.js`): viene mostrato **solo `candidate.status`** (nessun uso di `latest_association`).  
   → **Incoerenza**: in lista vedi “Interview” (da associazione), in scheda candidato puoi vedere “New” (da DB).

3. **Sincronizzazione hired**: quando un’associazione passa a `hired` (`updateCandidateAssociationStatus`), il codice aggiorna anche `candidates.status` a `hired` per quel candidato.

4. **availability_status**: ricalcolato da `recalculateCandidateAvailability(candidateId)`:
   - conta le associazioni con `status NOT IN ('rejected','not_selected')`;
   - se count > 0 → `unavailable`, altrimenti `available`.
   Chiamato dopo: update associazione, chiusura offerta, rimozione candidato da offerta.

5. **Ricerca “candidati disponibili”** (es. per aggiungere a un’offerta): si usa `availability_status = 'available'` e `candidates.status != 'hired'`.  
   Quindi: “disponibile” = nessuna candidatura attiva (tutte rejected/not_selected); “hired” viene escluso a parte.

### 2.4 Allineamento con Supabase

- Migration `supabase-migration-availability-status.sql`: aggiunge `availability_status` con default `'available'`.
- Nessun vincolo CHECK su `candidates.status` o `availability_status` nelle migration; i valori sono imposti dal solo codice.
- **Rischio**: se in DB finiscono valori diversi (es. “Interview” con maiuscola, o “not_selected” sulla tabella candidates), filtri e badge potrebbero non allinearsi.

---

## 3. Offerte di lavoro (job_offers)

### 3.1 Dove vivono gli stati

- **`job_offers.status`**: ciclo vita dell’offerta (`open`, `inprogress`, `active`, `closed`, `archived`).
- **`job_offers.is_archived`**: flag booleano “archiviata” (usato per filtri “archived/active” nelle liste).

Esistono quindi **due nozioni**: “status” (lifecycle) e “archiviata” (flag). Nel codice a volte si esclude `status = 'archived'` e altre si filtra per `is_archived = true`.

### 3.2 Valori usati

| Contesto | Valori |
|----------|--------|
| **job_offers.status** (DB) | `open`, `inprogress`, `active`, `closed`, `archived` |
| **Insert** (`insertJobOffer`) | default `status: "active"` |
| **Update** (`updateJobOffer`) | default `status: "open"` se non passato → **incoerenza** insert vs update |
| **updateJobOfferStatus** (solo status) | Accetta `"active"` \| `"closed"` \| `"archived"` (non “open”/“inprogress”) |
| **entity-toolbar** (normalizeStatus) | `open` / `inprogress` / `active` → tutti mappati a **"active"** per la toolbar; `closed` → "closed"; `archived` → "archived" |
| **Filtro lista offerte** (job-offers.html) | All, **Active (Open + In Progress)**, Open, In Progress, Closed (manca “Archived” nel dropdown) |
| **Badge offerta** (getOfferStatusBadgeClass) | Solo `open`, `inprogress`, `closed` (nessuno stile per `archived` o `active`) |

### 3.3 Regole di business

1. **Chiusura manuale** (`updateJobOfferStatus(id, 'closed')`):
   - Tutte le associazioni di quell’offerta con status **non** in `(hired, rejected, not_selected)` vengono portate a `not_selected`.
   - Per ogni candidato coinvolto si ricalcola `availability_status`.

2. **Auto-chiusura** (`syncJobOfferStatusFromHired`):
   - Si conta il numero di associazioni con `status = 'hired'` per l’offerta.
   - Se `hired_count >= positions_required` (o `positions` se `positions_required` assente):  
     - `job_offers.status` → `closed`,  
     - altre associazioni (non hired/rejected) → `not_selected`,  
     - ricalcolo availability per i candidati coinvolti.
   - Se l’offerta era `closed` e `hired_count < required`, si riapre: `status` → `active`.

3. **Reopen**: il codice imposta `status: "active"` (non “open”), coerente con la normalizzazione della toolbar.

4. **Filtro “Active”** in lista: nel build della query Supabase, “active” viene espanso in `status IN ('open','inprogress','active')`.  
   Quindi “Active” in UI = qualsiasi stato “aperto” in DB.

5. **Archived**: 
   - In `buildJobOffersQuery`: se `filters.archived === 'archived'` si filtra `is_archived = true`; se `excludeArchivedStatus === true` si esclude `status = 'archived'`.  
   Quindi “archived” può essere sia il flag `is_archived` sia il valore `status = 'archived'`. Non è univoco.
   - Nella pagina **job-offers** il dropdown stato non ha la voce “Archived”; l’archivio offerte è gestito dalla pagina **archived** (lista per `is_archived`).

### 3.4 Allineamento con Supabase

- Migration italian-to-english: rinomina `stato_offerta` → `status`.
- Nessun CHECK su `job_offers.status`; valori coerenti solo lato codice.
- **Incoerenze**:
  - Default insert `"active"` vs default update `"open"`.
  - UI toolbar e reopen usano “active”; in DB possono coesistere “open”, “inprogress”, “active”.
  - Badge/label non gestiscono esplicitamente `archived` né `active` (il “default” badge è “Open”).

---

## 4. Clienti (clients)

### 4.1 Dove vivono gli stati

- **Nessuno “status” di ciclo vita**: i clienti non hanno uno stato tipo new/active/closed.
- **`clients.is_archived`**: unico flag per “archiviato” / “attivo”.
- **`clients.state`**: campo geografico (regione/stato), non uno stato di workflow.

### 4.2 Regole

- Liste e filtri usano solo **archived / active** tramite `is_archived`.
- Pagina **archived** mostra i clienti con `is_archived = true` e permette il restore.

Nessuna duplicazione stato/archivio: tutto allineato a `is_archived`.

---

## 5. Associazioni candidato–offerta (candidate_job_associations)

### 5.1 Valori status

| Valore | Significato |
|--------|-------------|
| `new` | Candidatura nuova (default inserimento) |
| `interview` | In colloquio |
| `hired` | Assunto per questa offerta |
| `rejected` | Rifiutato |
| `not_selected` | Non selezionato (es. offerta chiusa senza essere hired) |

### 5.2 Effetti sugli altri stati

- **Associazione → hired**:  
  - `candidates.status` → `hired` (sync).  
  - `recalculateCandidateAvailability` per il candidato.  
  - `syncJobOfferStatusFromHired` per l’offerta (possibile auto-close).
- **Associazione → rejected / not_selected**:  
  - Solo `recalculateCandidateAvailability` (il candidato può tornare “available” se non ha altre associazioni attive).
- **Offerta chiusa manualmente**: tutte le associazioni non terminali → `not_selected`, poi ricalcolo availability.

---

## 6. Schema riassuntivo flussi

```
CANDIDATI
  candidates.status          = new | interview | hired | rejected  (globale / fallback)
  candidates.availability_status = available | unavailable          (derivato da associazioni)
  candidate_job_associations.status = new | interview | hired | rejected | not_selected  (per offerta)

  Lista candidati: mostra "effective" = latest_association.status ?? candidate.status ?? "new"
  Profilo candidato: mostra solo candidate.status  ← incoerenza con lista
  Filtro lista: new, interview, hired, rejected

OFFERTE
  job_offers.status = open | inprogress | active | closed | archived
  job_offers.is_archived = true/false

  Toolbar: open/inprogress/active → "active"; closed; archived
  Filtro lista: All, Active (open+inprogress+active), Open, In Progress, Closed (no Archived nel dropdown)
  Insert default "active", update default "open"  ← incoerenza

CLIENTI
  Solo is_archived (e state = geografia). Nessuno status di ciclo vita.
```

---

## 7. Raccomandazioni

1. **Candidati – stato in scheda**: allineare la pagina profilo candidato allo stesso criterio della lista (es. mostrare l’effective status da `latest_association` con fallback a `candidate.status`), oppure documentare che la scheda è “stato globale” e la lista “stato sull’ultima offerta”.
2. **Job offer – default**: uniformare il default di `status` tra insert e update (es. sempre `"active"` o sempre `"open"`) e usare un solo set di valori in DB per “aperto” (es. solo `open` + `inprogress`, oppure solo `active`).
3. **Job offer – archived**: decidere se “archiviata” è solo `is_archived = true` o anche `status = 'archived'` e allineare query, filtri e label (es. aggiungere “Archived” al dropdown stato se si usa `status = 'archived'`).
4. **Badge/label**: estendere `getOfferStatusBadgeClass` / `formatOfferStatusLabel` per `archived` (e eventualmente `active`) per evitare label generiche.
5. **Supabase**: opzionalmente aggiungere CHECK su colonne status (candidates, job_offers, candidate_job_associations) per evitare valori fuori lista e garantire allineamento a lungo termine.

Se vuoi, nel prossimo passo possiamo tradurre queste raccomandazioni in task concreti (es. modifiche a `candidate.js`, `supabase.js`, `job-offers.html`) con priorità.
