# Audit: Flusso stati – Candidati, Offerte, Clienti e Supabase

Questo documento descrive come sono modellati e allineati gli stati per **candidati**, **offerte di lavoro** e **clienti** nel portal e in Supabase, dopo il refactor che separa **stato profilo candidato**, **stato pipeline applicazione** e **disponibilità**.

---

## 1. Riepilogo tabelle Supabase

| Tabella | Colonne stato/archivio | Note |
|--------|-------------------------|------|
| **candidates** | `status`, `availability_status`, `is_archived` | `status` = **profile lifecycle** (pending_review, approved, rejected, archived); `availability_status` = disponibilità operativa (available/unavailable) |
| **job_offers** | `status`, `is_archived` | `status` = ciclo vita offerta (open/active/closed/archived) |
| **candidate_job_associations** | `status` | **Unica fonte ufficiale** per la pipeline ATS (applied, screening, interview, offer, hired, rejected, withdrawn, not_selected) |
| **clients** | `is_archived` | Nessuno “status” di ciclo vita; `state` = regione/stato geografico |

---

## 2. Candidati

### 2.1 Dove vivono gli stati

- **`candidates.status`** (tabella `candidates`): **stato profilo** (ciclo vita del profilo nel database interno). **Non** fa parte della pipeline di recruitment.
  - Valori canonici: `pending_review`, `approved`, `rejected`, `archived`.
  - Default per nuovi candidati: `pending_review`.
- **`candidates.availability_status`** (tabella `candidates`): `available` | `unavailable`. Campo di supporto per filtri/query; ricalcolato in base alle associazioni.
- **`candidate_job_associations.status`**: **unica fonte ufficiale** per lo stato della candidatura **su una specifica offerta**: `applied`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`, `not_selected`.

### 2.2 Valori usati

| Contesto | Valori |
|----------|--------|
| **candidates.status** (DB – profile) | `pending_review`, `approved`, `rejected`, `archived` (default: `pending_review`) |
| **Legacy mapping (runtime)** | `new` → pending_review; `interview` / `hired` → approved; `rejected` → rejected |
| **candidate_job_associations.status** (DB – pipeline) | `applied`, `screening`, `interview`, `offer`, `hired`, `rejected`, `withdrawn`, `not_selected` |
| **candidates.availability_status** (DB) | `available`, `unavailable` |
| **Disponibilità UI (derivata)** | `working` (almeno un’applicazione hired), `in_process` (almeno una attiva), `available` (altrimenti) |

### 2.3 Regole di business

1. **Stato profilo vs pipeline**: in scheda candidato si mostra **Profile Status** da `candidates.status` (con legacy mapping). Lo **Application Status** si mostra solo nel contesto delle applicazioni (tabella applicazioni sul profilo, lista applicazioni, dettaglio offerta).
2. **Nessuna sync a hired**: quando un’associazione passa a `hired`, **non** si aggiorna più `candidates.status`. Si aggiornano solo availability (`recalculateCandidateAvailability`) e offerta (`syncJobOfferStatusFromHired`).
3. **availability_status**: ricalcolato da `recalculateCandidateAvailability(candidateId)` in base alle associazioni; usato per filtri/query.
4. **Disponibilità UI**: derivata a runtime da `deriveAvailabilityFromApplications` (working / in_process / available); non sostituita da valori DB.
5. **Candidati hired possono essere aggiunti ad altre offerte**: un candidato con almeno un’applicazione `hired` può essere comunque associato a una nuova offerta. Non si blocca l’azione in base a “working”/hired.

### 2.4 Legacy value compatibility

| Valore legacy (DB) | Mappatura (display/filtri) |
|--------------------|----------------------------|
| `new` | `pending_review` |
| `interview` | `approved` |
| `hired` | `approved` |
| `rejected` | `rejected` |

La mappatura si applica in: display (label, badge), filtri lista/dashboard, form modifica candidato. Opzionale: migrazione DB per aggiornare i valori in tabella.

---

## 3. Offerte di lavoro (job_offers)

(Invariato rispetto alla versione precedente: `status`, `is_archived`, chiusura manuale/auto, reopen.)

---

## 4. Clienti (clients)

(Invariato: solo `is_archived`.)

---

## 5. Associazioni candidato–offerta (candidate_job_associations)

### 5.1 Valori status (pipeline ATS)

Come in `pipeline-statuses.md` e `application-lifecycle.md`. Fonte ufficiale per pipeline, kanban, filtri applicazioni, metriche “hired this month”, offer auto-close.

### 5.2 Effetti sugli altri stati

- **Associazione → hired**:
  - **Non** si aggiorna più `candidates.status`.
  - Si esegue `recalculateCandidateAvailability` per il candidato.
  - Si esegue `syncJobOfferStatusFromHired` per l’offerta (possibile auto-close).
- **Associazione → rejected / not_selected / withdrawn**: solo `recalculateCandidateAvailability` (e, se offerta chiusa, `syncJobOfferStatusFromHired` e not_selected per le altre).

---

## 6. Raccomandazioni (post-refactor)

1. **Migrazione DB (opzionale)**:
   - `UPDATE candidates SET status = 'pending_review' WHERE status IS NULL OR status = '' OR status = 'new';`
   - `UPDATE candidates SET status = 'approved' WHERE status IN ('interview', 'hired');`
   - Eseguire dopo aver verificato che il runtime con legacy mapping funziona in produzione.
2. **Terminologia UI**: usare in modo coerente “Profile Status”, “Application Status”, “Availability” (come da audit).
3. **Documentazione**: mantenere allineati STATUS-AUDIT.md, FLUSSO-RECRUITMENT-AUDIT-VISIVO.md, pipeline-statuses.md, application-lifecycle.md.
