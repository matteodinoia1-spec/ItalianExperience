# Audit flusso recruitment – Per creazione processo visuale

Documento di riferimento per disegnare il processo (diagrammi di flusso, swimlane, timeline). Descrive **entità**, **stati**, **trigger** e **effetti a catena** in modo univoco.

---

## 1. Entità e dove vivono gli stati

| Entità | Tabella DB | Colonne stato | Significato |
|--------|------------|---------------|-------------|
| **Candidato** | `candidates` | `status` | Stato **profilo** (ciclo vita): Pending Review / Approved / Rejected / Archived (non pipeline) |
| **Candidato** | `candidates` | `availability_status` | Disponibilità: `available` \| `unavailable` (derivato, ricalcolato) |
| **Candidato** | `candidates` | `is_archived` | Archiviato sì/no (lista attivi vs archived) |
| **Offerta** | `job_offers` | `status` | Ciclo vita: open / inprogress / active / closed / archived |
| **Offerta** | `job_offers` | `is_archived` | Archiviata sì/no |
| **Candidatura** (associazione) | `candidate_job_associations` | `status` | Stato della candidatura **su quella singola offerta** |

**Regola d’oro:** lo stato “ufficiale” della pipeline (per conteggi, kanban, filtri applicazioni) è **solo** `candidate_job_associations.status`. Gli stati su `candidates` e `job_offers` sono di supporto (pipeline candidato, ciclo vita offerta, availability).

---

## 2. Stati candidatura (applicazione) – Fonte: `candidate_job_associations.status`

### Valori canonici (ATS)

| Valore DB | Label UI | Tipo | Uso |
|-----------|----------|------|-----|
| `applied` | Applied | Attivo | Default nuova candidatura (in codice si usa `applied`; legacy `new` → normalizzato in Applied) |
| `screening` | Screening | Attivo | In screening |
| `interview` | Interview | Attivo | In colloquio |
| `offer` | Offer | Attivo | Offerta fatta (legacy `offered` → Offer) |
| `hired` | Hired | Terminale | Assunto per questa offerta |
| `rejected` | Rejected | Terminale | Rifiutato |
| `withdrawn` | Withdrawn | Terminale | Ritirato (es. rimosso dall’offerta) |
| `not_selected` | Not Selected | Terminale | Non selezionato (es. offerta chiusa senza essere hired) |

- **Attivi** (pipeline): `applied`, `screening`, `interview`, `offer`, `hired` → contati nel pipeline summary.
- **Terminali**: `rejected`, `withdrawn`, `not_selected` → esclusi dal pipeline attivo.

### Flusso candidatura (una singola associazione)

```
[Creazione]  →  status = "applied"
     ↓
[Utente cambia stato]  →  applied | screening | interview | offer | hired | rejected
     ↓
[Rimozione da offerta] →  status = "withdrawn"
     ↓
[Chiusura offerta (manuale o auto)]  →  candidature non terminali → "not_selected"
```

---

## 3. Stati candidato – `candidates.status` e `candidates.availability_status`

### 3.1 `candidates.status` (stato profilo – ciclo vita)

| Valore | Significato |
|--------|-------------|
| `pending_review` | In attesa di revisione (default creazione) |
| `approved` | Profilo approvato, utilizzabile nei workflow di recruitment |
| `rejected` | Profilo non accettato |
| `archived` | Nascosto dalle viste attive |

- **Dove si vede:** scheda candidato, sezione “Candidate Information” → campo **Profile Status**.
- **Quando si aggiorna:** solo in creazione/modifica candidato (select Profile Status). **Non** esiste più sync da associazione → hired su `candidates.status`.
- **Legacy (mappatura runtime):** `new` → pending_review; `interview` / `hired` → approved; `rejected` → rejected.

### 3.2 `candidates.availability_status` (disponibilità)

| Valore | Significato |
|--------|-------------|
| `available` | Nessuna candidatura “attiva” (tutte rejected / not_selected / withdrawn) |
| `unavailable` | Almeno una candidatura con status **non** in (rejected, not_selected, withdrawn) |

- **Dove si vede:** usato per filtri “candidati disponibili” (es. aggiungere a un’offerta); in UI la **disponibilità** in hero candidato è **derivata a runtime** da `deriveAvailabilityFromApplications` (available / in_process / working), non dalla colonna (vedi sotto).
- **Quando si aggiorna:** dopo ogni modifica che tocca le associazioni del candidato: cambio stato associazione, chiusura offerta, rimozione da offerta. Funzione: `recalculateCandidateAvailability(candidateId)`.

### 3.3 Disponibilità “visualizzata” (derivata a runtime, non DB)

Per la **UI** (badge/etichetta in hero candidato) si usa una logica derivata dalle applicazioni, senza leggere `availability_status`:

| Stato derivato | Condizione | Label tipica |
|----------------|------------|--------------|
| `working` | Almeno un’applicazione con status = hired | Working |
| `in_process` | Almeno un’applicazione in applied / screening / interview / offer | In process |
| `available` | Nessuna applicazione attiva né hired | Available |

Funzione: `IEQueries.candidates.deriveAvailabilityFromApplications(applications)`.

---

## 4. Stati offerta – `job_offers.status`

| Valore DB | Significato | Note |
|-----------|-------------|------|
| `open` | Aperta | |
| `inprogress` | In corso | |
| `active` | Attiva | In filtri, “Active” = open \|\| inprogress \|\| active |
| `closed` | Chiusa | Manuale o auto (posti coperti) |
| `archived` | Archiviata | |

- **Chiusura manuale:** utente imposta offerta → closed → tutte le candidature non terminali di quell’offerta → `not_selected`; poi `recalculateCandidateAvailability` per ogni candidato coinvolto.
- **Chiusura automatica:** quando il numero di associazioni con status `hired` per quell’offerta ≥ `positions_required` (o 1 se assente) → offerta → `closed`, altre candidature (non hired/rejected/withdrawn) → `not_selected`, poi ricalcolo availability.
- **Riapertura:** se offerta era closed e hired_count < required (es. un hired viene ritirato), si può riaprire → status = `active`; le associazioni `not_selected` possono essere riportate in pipeline (es. screening) secondo logica di reopen.

---

## 5. Trigger ed effetti a catena (per disegnare il flusso)

### 5.1 Creazione candidatura (aggiungi candidato a offerta)

| Step | Azione | Effetto |
|------|--------|---------|
| 1 | Inserimento in `candidate_job_associations` | `status = "applied"`, `candidate_id`, `job_offer_id` |
| 2 | (Nessun update su candidates o job_offers) | |
| 3 | (Opzionale) Dopo salvataggio, in UI si ricalcola availability per quel candidato | Disponibilità candidato può passare available → in_process |

La creazione **non** modifica `candidates.status` né `job_offers.status`. Solo inserimento riga associazione.

### 5.2 Cambio stato candidatura (es. Applied → Interview → Hired)

| Step | Azione | Effetto |
|------|--------|---------|
| 1 | `updateCandidateAssociationStatus(associationId, newStatus)` | `candidate_job_associations.status` = newStatus |
| 2 | (Nessun update su candidates.status) | Lo stato profilo non viene più sincronizzato con hired |
| 3 | Sempre | `recalculateCandidateAvailability(candidate_id)` → aggiorna `candidates.availability_status` |
| 4 | Sempre | `syncJobOfferStatusFromHired(job_offer_id)` → se hired_count >= positions_required, offerta → closed e altre associazioni → not_selected, poi ricalcolo availability per quei candidati |

Quindi: **un solo** cambio stato candidatura può aggiornare candidato (availability) e offerta (chiusura + altre candidature + availability di altri candidati). Lo stato profilo (`candidates.status`) non viene più modificato.

### 5.3 Rimozione candidato da offerta (ritiro)

| Step | Azione | Effetto |
|------|--------|---------|
| 1 | `removeCandidateFromJob(associationId)` | `candidate_job_associations.status` = `withdrawn` |
| 2 | | `recalculateCandidateAvailability(candidate_id)` |
| 3 | | `syncJobOfferStatusFromHired(job_offer_id)` (può riaprire offerta se era chiusa e ora hired < required) |

### 5.4 Chiusura manuale offerta

| Step | Azione | Effetto |
|------|--------|---------|
| 1 | `updateJobOfferStatus(jobOfferId, "closed")` | `job_offers.status` = closed |
| 2 | | Tutte le associazioni dell’offerta con status **non** in (hired, rejected, not_selected, withdrawn) → `not_selected` |
| 3 | | Per ogni candidate_id coinvolto: `recalculateCandidateAvailability(candidate_id)` |

### 5.5 Riapertura offerta (dopo chiusura)

| Step | Azione | Effetto |
|------|--------|---------|
| 1 | Reopen offerta | `job_offers.status` = `active` |
| 2 | (In pipeline-statuses) | Associazioni con status `not_selected` per quell’offerta possono essere riportate a `screening` per rientrare in pipeline (logica specifica in applicazioni/reopen) |

---

## 6. Riepilogo per nodi del diagramma

Per disegnare il processo puoi usare:

1. **Nodi “stato”**  
   - Candidatura: applied → screening → interview → offer → hired (e rami rejected / withdrawn / not_selected).  
   - Candidato: new / interview / hired / rejected (+ availability: available vs unavailable).  
   - Offerta: open|inprogress|active → closed (e archived).

2. **Nodi “azione” (trigger)**  
   - Crea candidatura.  
   - Cambia stato candidatura.  
   - Rimuovi candidato da offerta.  
   - Chiudi offerta (manuale).  
   - Riapri offerta.

3. **Frecce “effetto”**  
   - Da “Cambio stato candidatura → Hired” a: aggiorna `candidates.status`, ricalcola availability, eventuale chiusura offerta e not_selected per altre candidature.  
   - Da “Chiudi offerta” a: not_selected su candidature non terminali, ricalcolo availability per ogni candidato coinvolto.  
   - Da “Rimuovi da offerta” a: withdrawn, ricalcolo availability, eventuale reopen offerta.

4. **Legenda**  
   - **Fonte stati pipeline applicazioni:** solo `candidate_job_associations.status`.  
   - **Stati candidato in scheda:** `candidates.status` (pipeline) + disponibilità derivata (available / in_process / working) per badge/hero.  
   - **Availability DB:** `candidates.availability_status` (available/unavailable) per filtri e logica “candidati disponibili”.

---

## 7. File di riferimento nel codice

| Cosa | File |
|------|------|
| Stati canonici applicazione (label, normalizzazione) | `runtime/status-runtime.js` (APPLICATION_STATUS_CANONICAL, normalizeApplicationStatusForDisplay, formatApplicationStatusLabel) |
| Disponibilità derivata (working / in_process / available) | `queries/candidates.queries.js` → deriveAvailabilityFromApplications |
| updateCandidateAssociationStatus + sync hired + recalc availability | `core/data/applications.js` (e esposto via supabase.js) |
| recalculateCandidateAvailability (availability_status in DB) | `core/data/applications.js` |
| syncJobOfferStatusFromHired (auto-close / reopen) | `core/data/applications.js` |
| Chiusura manuale offerta (closed → not_selected + recalc) | `core/data/job-offers.js` → updateJobOfferStatus |
| Creazione candidatura (status = applied) | `queries/applications.queries.js` → createApplication |
| Rimozione da offerta (withdrawn) | `core/data/applications.js` → removeCandidateFromJob |

Se vuoi, il passo successivo può essere uno schema testuale (es. Mermaid) di un solo flusso (es. “Da candidatura creata a hired e chiusura offerta”) da usare come base per il disegno visuale.
