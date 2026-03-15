# Portal Recruitment — Bug Audit

**Data audit:** 2026-03-15
**Branch auditato:** `portal-typography-refinement`
**Scope:** `portal/recruitment/` — HTML, runtime JS, features JS

---

## Legenda severità

| Livello | Significato |
|---------|-------------|
| **HIGH** | Rotto in produzione: navigazione che produce 404 o URL malformati |
| **MEDIUM** | Potenzialmente rotto se una dipendenza non è carica; o comportamento silenziosamente sbagliato |
| **LOW** | Codice inutile / incoerenza non urgente |

---

## 1. Bug Funzionali

### BUG-01 — HIGH
**File:** `portal/recruitment/runtime/lists/clients-list.js:204–206`
**Categoria:** Broken navigation

```js
IERouter.navigateTo("job-offers.html?client=" + encodeURIComponent(clientId));
```

Il tasto "View job offers" nella riga di un client usa un path nudo senza guard `IEPortal.links`. `IERouter.navigateTo("job-offers.html?client=X")` chiama `listKeyToPath("job-offers.html?client=X")` che, contenendo `.html`, restituisce la stringa as-is, producendo `portal/job-offers.html?client=X` — pagina che non esiste (la lista è ora a `portal/recruitment/job-offers.html`).
**Fix suggerito:** `IERouter.navigateTo("job-offers", { client: clientId })`

---

### BUG-02 — HIGH
**File:** `portal/recruitment/runtime/lists/job-offers-list.js:386–388`
**Categoria:** Broken navigation

```js
IERouter.navigateTo("candidates.html?offer=" + encodeURIComponent(offerId));
```

Tasto "View candidates for offer" nella riga di un job offer. Stesso problema del BUG-01: produce `portal/candidates.html?offer=X` (404).
**Fix suggerito:** `IERouter.navigateTo("candidates", { offer: offerId })`

---

### BUG-03 — HIGH
**File:** `portal/recruitment/runtime/lists/dashboard.js:730–741`
**Categoria:** Broken navigation

```js
function navigateToExternalSubmissionDetail(id) {
  var href = "external-submission.html?id=" + encodeURIComponent(String(id));
  if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
    window.IERouter.navigateTo(href);
  } else {
    window.location.href = href;
  }
}
```

Nessun guard `IEPortal.links`. `navigateTo("external-submission.html?id=X")` produce `portal/external-submission.html?id=X` (404); la pagina è a `portal/recruitment/external-submission.html`.
**Fix suggerito:** `IERouter.navigateTo("recruitment/external-submission.html?id=" + encodeURIComponent(String(id)))`

---

### BUG-04 — HIGH
**File:** `portal/recruitment/runtime/job-offer-runtime.js:691–698`
**Categoria:** Broken navigation — double `recruitment/` in URL

```js
nameLink.href = (window.IEPortal && window.IEPortal.links && window.IEPortal.links.applicationView)
  ? window.IEPortal.links.applicationView(app.id)   // returns "recruitment/application.html?id=X"
  : "application.html?id=" + encodeURIComponent(app.id);

nameLink.addEventListener("click", function (e) {
  if (window.IERouter && typeof window.IERouter.navigateTo === "function") {
    e.preventDefault();
    window.IERouter.navigateTo(nameLink.href);  // <-- legge .href DOM, non l'attributo!
  }
});
```

`IEPortal.links.applicationView(id)` restituisce `"recruitment/application.html?id=X"`. Quando assegnato a `nameLink.href` (property DOM), il browser risolve il path relativo rispetto all'URL della pagina corrente (`portal/recruitment/job-offer.html`) → produce l'URL assoluto `https://host/ItalianExperience/portal/recruitment/recruitment/application.html?id=X` (doppio `recruitment/`).
Il click handler poi chiama `IERouter.navigateTo(nameLink.href)` dove `nameLink.href` è il property DOM che restituisce l'URL assoluto già risolto. `navigateTo` vi prepende il base path → URL completamente malformato.
**Fix suggerito:** Salvare il path relativo in una variabile separata e usarla sia per `nameLink.href` che nel click handler, oppure leggere `nameLink.getAttribute("href")` anziché `nameLink.href`.

---

### BUG-05 — MEDIUM
**File:** `portal/recruitment/runtime/lists/candidates-list.js:735, 743`
**Categoria:** Fallback path errato post-migrazione

```js
: "candidate.html?id=" + encodeURIComponent(String(mapped.id)) + "&mode=view"
: "candidate.html?id=" + encodeURIComponent(String(mapped.id)) + "&mode=edit"
```

I fallback nelle ternarie ternarie `renderEntityRow({ viewUrl, editUrl })` usano path nudi. Il guard `IEPortal.links.candidateView` protegge il path primario: in pratica non si raggiunge il fallback finché `app-shell.js` è carico. Se però per qualsiasi motivo `IEPortal.links` non fosse disponibile al momento della renderizzazione, i link porterebbero a `portal/candidate.html` (404).

---

### BUG-06 — MEDIUM
**File:** `portal/recruitment/runtime/lists/clients-list.js:475, 483, 636, 644`
**Categoria:** Fallback path errato post-migrazione

Stesso pattern del BUG-05 per `"client.html?id=...&mode=view"` e `"client.html?id=...&mode=edit"`.

---

### BUG-07 — MEDIUM
**File:** `portal/recruitment/runtime/lists/job-offers-list.js:813`
**Categoria:** Fallback path errato post-migrazione

```js
: "job-offer.html?id=" + encodeURIComponent(String(row.id)) + "&mode=view"
```

Fallback nella costruzione di `viewUrl` per ogni riga della lista job offers.

---

### BUG-08 — MEDIUM
**File:** `portal/recruitment/runtime/lists/applications-list.js:642`
**Categoria:** Fallback path errato post-migrazione

```js
"candidate.html?id=" + encodeURIComponent(...)
```

Fallback nella costruzione di `viewUrl` per il link candidato nella riga applicazione.

---

### BUG-09 — MEDIUM
**File:** `portal/recruitment/runtime/lists/dashboard.js:576`
**Categoria:** Fallback path errato post-migrazione

```js
: "job-offer.html?id=" + encodeURIComponent(String(offerId)) + "&mode=view"
```

Fallback nella costruzione di `offerViewUrl` nel widget "Live Offers" della dashboard.

---

## 2. Codice Morto

### DEAD-01 — LOW
**File:** `portal/recruitment/runtime/lists/job-offers-list.js:891–893`
`portal/recruitment/runtime/lists/clients-list.js:514–516, 675–677`
**Categoria:** Funzione indefinita referenziata

```js
typeof formatLastUpdatedMeta === "function"
  ? formatLastUpdatedMeta(row)
  : ""
```

`formatLastUpdatedMeta` non è mai definita in nessun file del codebase (`grep` su `portal/` non produce risultati di definizione). La condizione `typeof formatLastUpdatedMeta === "function"` è sempre `false`, il branch vero non viene mai eseguito. Le tre occorrenze producono sempre stringa vuota. Il codice condizionale va rimosso.

---

### DEAD-02 — LOW
**File:** `portal/recruitment/runtime/lists/clients-list.js:514, 675`
*(già incluso in DEAD-01 — menzionato separatamente per evidenziare che sono due punti distinti nella stessa funzione, su due diversi percorsi di render del client detail)*

---

## 3. Inconsistenze

### INC-01 — MEDIUM
**File:** `portal/recruitment/runtime/lists/candidates-list.js` vs tutti gli altri list files
**Categoria:** Pattern di gestione dello stato di selezione

Lo stato di selezione dei candidati vive in `IEListsSharedHelpers._candidateSelectionState` (oggetto globale condiviso, modificabile tramite `setCandidateSelected`, `clearCandidateSelection`, `onCandidateSelectionChange` ecc.).

Job offers, applications e clients gestiscono invece la selezione con una variabile locale (`var selection = { ids: new Set(), pageIds: [] }`) chiusa nel modulo, non accessibile dall'esterno.

**Effetto pratico:** la selezione candidati può essere interrogata da altri moduli tramite `IEListsSharedHelpers.getCandidateSelectionSnapshot()`; la selezione delle altre entità non può. Non è un bug attivo, ma rende il codice asimmetrico e complica future estensioni (es. batch operations cross-modulo).

---

### INC-02 — MEDIUM
**File:** `portal/recruitment/runtime/lists/job-offers-list.js:386–388`
vs `portal/recruitment/runtime/lists/candidates-list.js:252–258`
**Categoria:** Pattern di navigazione con query param

Il click su "View candidates for offer" (job-offers-list) costruisce il path manualmente:
```js
IERouter.navigateTo("candidates.html?offer=" + encodeURIComponent(offerId));  // BUG-02
```

Il click su "View pending review" (candidates-list) usa correttamente il pattern list-key + params:
```js
IERouter.navigateTo("candidates", { status: "pending_review" });
```

Il secondo pattern è quello corretto (gestito da `listKeyToPath` + `navigateTo` con oggetto params). Il primo è sia sbagliato che inconsistente.

---

### INC-03 — LOW
**File:** `portal/recruitment/runtime/job-offer-runtime.js:780–785`
vs tutti i file list (candidates, applications, clients, job-offers)
**Categoria:** Pattern di binding select-all

Il select-all nel pipeline view del job offer usa `.onclick`:
```js
selectAllCheckbox.onclick = function () { ... };
```

Tutti gli altri select-all usano `.addEventListener("change", ...)`. `.onclick` sovrascrive qualsiasi handler precedentemente assegnato; `.addEventListener` consente listener multipli e non ha effetti collaterali.

---

### INC-04 — LOW
**File:** `portal/recruitment/runtime/lists/job-offers-list.js:137–152`
**Categoria:** Mutazione dell'header della tabella a runtime

Il modulo job-offers-list modifica i `<th>` dell'header della tabella al momento del render, rimpiazzando dinamicamente le celle "Candidates" con "Associated" e "Required". Gli altri list modules non mutano la struttura dell'header. Se il DOM viene re-renderizzato o se `renderOffers()` viene chiamato più di una volta, la mutazione potrebbe fallire silenziosamente o duplicare le celle.

---

### INC-05 — LOW
**File:** `portal/recruitment/runtime/lists/candidates-list.js` (offerFilter banner presente)
`portal/recruitment/runtime/lists/job-offers-list.js` (clientFilter banner presente)
`portal/recruitment/runtime/lists/applications-list.js` (nessun filter banner)
**Categoria:** Feature mancante su applications

Candidates e job-offers mostrano un banner contestuale quando la lista viene aperta con un filtro pre-impostato via URL param (es. `?offer=X` su candidates, `?client=X` su job-offers). La pagina applications non implementa questo pattern, anche se i filtri URL param (`?status=X`, `?offer=X`, `?candidate=X`) sono supportati dal filtro interno.

---

## 4. Path Rotti post-migrazione

I seguenti file script src in HTML sono stati verificati come esistenti dopo la migrazione. Nessun `src` rotto trovato negli HTML di `portal/recruitment/*.html`.

> File verificati: `candidates.html`, `job-offers.html`, `applications.html`, `clients.html`, `archived.html`, `external-submissions.html`, `candidate.html`, `client.html`, `job-offer.html`, `application.html`, `external-submission.html`, `job-posting.html`, `job-postings.html`, `add-candidate.html`, `add-job-offer.html`, `add-client.html`, `dashboard.html`.

I path rotti documentati in questa sezione riguardano **URL costruiti a runtime**, già coperti dai BUG-01–09 sopra.

---

## Riepilogo priorità

| ID | Severità | File | Riga | Descrizione breve |
|----|----------|------|------|-------------------|
| BUG-01 | HIGH | `clients-list.js` | 204–206 | `"job-offers.html?client=X"` → 404 |
| BUG-02 | HIGH | `job-offers-list.js` | 386–388 | `"candidates.html?offer=X"` → 404 |
| BUG-03 | HIGH | `dashboard.js` | 730–741 | `"external-submission.html?id=X"` → 404 |
| BUG-04 | HIGH | `job-offer-runtime.js` | 691–698 | `.href` DOM property → doppio `recruitment/` |
| BUG-05 | MEDIUM | `candidates-list.js` | 735, 743 | Fallback `"candidate.html"` |
| BUG-06 | MEDIUM | `clients-list.js` | 475, 483, 636, 644 | Fallback `"client.html"` |
| BUG-07 | MEDIUM | `job-offers-list.js` | 813 | Fallback `"job-offer.html"` |
| BUG-08 | MEDIUM | `applications-list.js` | 642 | Fallback `"candidate.html"` |
| BUG-09 | MEDIUM | `dashboard.js` | 576 | Fallback `"job-offer.html"` |
| DEAD-01 | LOW | `job-offers-list.js`, `clients-list.js` | 891, 514, 675 | `formatLastUpdatedMeta` mai definita |
| INC-01 | MEDIUM | `candidates-list.js` vs altri | — | Stato selezione: shared vs locale |
| INC-02 | MEDIUM | `job-offers-list.js` | 386–388 | Pattern navigazione con params inconsistente |
| INC-03 | LOW | `job-offer-runtime.js` | 781 | `.onclick` invece di `.addEventListener` |
| INC-04 | LOW | `job-offers-list.js` | 137–152 | Mutazione header tabella a runtime |
| INC-05 | LOW | `applications-list.js` | — | Manca filter banner |
