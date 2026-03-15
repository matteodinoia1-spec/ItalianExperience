## Portal Restructuring – Migration Plan (Technical)

> **STATO: Steps 1–9 completati** (branch `portal-typography-refinement`, marzo 2025).
> Rimane solo lo Step 10 (verifica end-to-end finale e commit di consolidamento).
>
> Commit chiave:
> - Step 1 (cartelle): `fece330`
> - Step 2 (HTML spostati): `9530f95`
> - Step 3 (path relativi HTML): `ef8d8c1`
> - Step 4 (moduli JS spostati): `1a6734f`
> - Step 5 (router): `524936f`
> - Step 6 (layout header/bottom-nav): `10564f3`
> - Step 7 (main dashboard + redirect): `d0bde38`
> - Step 8 (link sito pubblico): nessuna modifica necessaria
> - Fix navigazione JS runtime: `ddef711`
> - Step 9 (documentazione): questo commit

**Obiettivo**: spostare tutte le pagine e i moduli specifici del recruitment sotto `portal/recruitment/` senza cambiare funzionalità. Nessuna feature nuova, solo riorganizzazione di file e path.

**Ambito**:
- **Incluso**: HTML del recruitment nel `portal/`, moduli JS `features`, `runtime`, `queries`, `core/data` legati al recruitment, router, layout header/bottom-nav, redirect post-login, documentazione interna.
- **Escluso**: logica applicativa (nessun cambio di comportamento), static site pubblico fuori da `portal/` (solo verifica link), qualsiasi modifica a Supabase/Edge Functions.

Per ogni step sono indicati:
- **File coinvolti** (sorgente/destinazione)
- **Path e riferimenti da aggiornare**
- **Rischi e check di validazione**

---

## Step 0 — Inventario attuale (solo riferimento)

### 0.1 HTML recruitment attuali in `portal/`

- `portal/dashboard.html`
- `portal/candidates.html`
- `portal/add-candidate.html`
- `portal/candidate.html`
- `portal/clients.html`
- `portal/add-client.html`
- `portal/client.html`
- `portal/job-offers.html`
- `portal/add-job-offer.html`
- `portal/job-offer.html`
- `portal/job-postings.html`
- `portal/job-posting.html`
- `portal/applications.html`
- `portal/application.html`
- `portal/external-submissions.html`
- `portal/external-submission.html`
- `portal/archived.html`

Pagine non-spostate (restano in `portal/`):

- `portal/index.html` (login)
- `portal/profile.html` (presente, referenziato da `portal/layout/header.html` e `portal/layout/bottom-nav.html`)
- `portal/forgot-password.html`
- `portal/reset-password.html`

### 0.2 Moduli JS recruitment

**Features (`portal/features/`):**
- `portal/features/candidates/candidate.js`
- `portal/features/candidates/candidate-entity-config.js`
- `portal/features/clients/client.js`
- `portal/features/clients/client-entity-config.js`
- `portal/features/job-offers/job-offer.js`
- `portal/features/job-offers/job-offer-entity-config.js`
- `portal/features/applications/applications.js`
- `portal/features/applications/application.js`
- `portal/features/applications/application-detail.js`
- `portal/features/applications/application-entity-config.js`
- `portal/features/external-submissions/external-submission.js`
- `portal/features/external-submissions/external-submission-formatters.js`
- `portal/features/external-submissions/external-submission-api.js`
- `portal/features/external-submissions/external-submissions-list.js`
- `portal/features/archived/archived.js`
- `portal/features/profile/profile.js` (non recruitment puro, rimane fuori scope di spostamento)

**Runtime lists (`portal/runtime/lists/`):**
- `portal/runtime/lists/dashboard.js`
- `portal/runtime/lists/candidates-list.js`
- `portal/runtime/lists/clients-list.js`
- `portal/runtime/lists/job-offers-list.js`
- `portal/runtime/lists/applications-list.js`
- `portal/runtime/lists/shared-list-helpers.js`

**Runtime entity / helpers (`portal/runtime/`):**
- `portal/runtime/candidate-runtime.js`
- `portal/runtime/candidate-profile-runtime.js`
- `portal/runtime/client-runtime.js`
- `portal/runtime/job-offer-runtime.js`
- `portal/runtime/job-posting-runtime.js`
- `portal/runtime/job-postings-list-runtime.js`
- `portal/runtime/candidate-import-runtime.js`
- `portal/runtime/associations-runtime.js`
- `portal/runtime/entity-actions-runtime.js`
- `portal/runtime/shared-formatters-runtime.js`

Altri runtime non strettamente recruitment (restano in `portal/runtime/`):
- `portal/runtime/modals-runtime.js`
- `portal/runtime/filter-drawer-runtime.js`
- `portal/runtime/status-runtime.js`
- `portal/runtime/forms-runtime.js`
- `portal/runtime/router-runtime.js`
- `portal/runtime/bottom-nav-runtime.js`
- `portal/runtime/global-header-actions-runtime.js`
- `portal/runtime/header-runtime.js`
- `portal/runtime/page-bootstrap.js`
- `portal/runtime/profile-runtime.js`

**Queries (`portal/queries/`):**
- `portal/queries/candidates.queries.js`
- `portal/queries/clients.queries.js`
- `portal/queries/jobOffers.queries.js`
- `portal/queries/applications.queries.js`

**Core data (`portal/core/data/`):**
- `portal/core/data/candidates.js`
- `portal/core/data/clients.js`
- `portal/core/data/job-offers.js`
- `portal/core/data/job-postings.js`
- `portal/core/data/applications.js`
- `portal/core/data/dashboard.js`
- `portal/core/data/activity.js`

Router e layout:
- Router core: `portal/core/router.js`
- Router runtime: `portal/runtime/router-runtime.js`
- Layout header: `portal/layout/header.html`
- Layout bottom nav: `portal/layout/bottom-nav.html`
- App shell / auth: `portal/core/app-shell.js`, `portal/core/auth.js`, `portal/core/session/session.js` (non spostati, ma da considerare per redirect/login).

---

## Step 1 — Creare la struttura di cartelle

**Obiettivo:** preparare la nuova gerarchia per il sotto-portal recruitment.

### 1.1 Cartelle da creare (vuote)

- `portal/recruitment/`
- `portal/recruitment/features/`
- `portal/recruitment/runtime/`
- `portal/recruitment/runtime/lists/`
- `portal/recruitment/queries/`
- `portal/recruitment/core/`
- `portal/recruitment/core/data/`

(opzionale ma consigliato: `portal/recruitment/layout/` se in futuro si vogliono layout specifici per recruitment, **non necessario in questo refactor**).

### 1.2 Rischi e check

- **Rischio nullo a runtime**: la creazione di cartelle vuote non ha effetti sul comportamento finché non vengono spostati file o aggiornati i path.
- **Check rapido**: build static / deploy di prova non deve mostrare 404 aggiuntivi; l’albero dei file deve risultare come sopra.

---

## Step 2 — Spostare le pagine HTML recruitment

**Obiettivo:** spostare le pagine HTML del recruitment sotto `portal/recruitment/` mantenendo invariati i nomi file.

### 2.1 File da spostare (sorgente → destinazione)

- `portal/dashboard.html` → `portal/recruitment/dashboard.html`
- `portal/candidates.html` → `portal/recruitment/candidates.html`
- `portal/add-candidate.html` → `portal/recruitment/add-candidate.html`
- `portal/candidate.html` → `portal/recruitment/candidate.html`
- `portal/clients.html` → `portal/recruitment/clients.html`
- `portal/add-client.html` → `portal/recruitment/add-client.html`
- `portal/client.html` → `portal/recruitment/client.html`
- `portal/job-offers.html` → `portal/recruitment/job-offers.html`
- `portal/add-job-offer.html` → `portal/recruitment/add-job-offer.html`
- `portal/job-offer.html` → `portal/recruitment/job-offer.html`
- `portal/job-postings.html` → `portal/recruitment/job-postings.html`
- `portal/job-posting.html` → `portal/recruitment/job-posting.html`
- `portal/applications.html` → `portal/recruitment/applications.html`
- `portal/application.html` → `portal/recruitment/application.html`
- `portal/external-submissions.html` → `portal/recruitment/external-submissions.html`
- `portal/external-submission.html` → `portal/recruitment/external-submission.html`
- `portal/archived.html` → `portal/recruitment/archived.html`

### 2.2 Pagine che restano in `portal/`

- `portal/index.html`
- `portal/profile.html`
- `portal/forgot-password.html`
- `portal/reset-password.html`

### 2.3 Rischi e check

- **Rischio principale**: link hard-coded (nel layout, in script inline, in script esterni) che puntano ancora alle versioni in root (`portal/*.html`).
- **Check immediato**:
  - Aprire `portal/index.html`, fare login e verificare se la redirezione porta ancora a `portal/dashboard.html` (fallirà dopo lo spostamento finché non viene fatto Step 5 e Step 7).
  - Eseguire uno scan dei link (es. script `scripts/check-links.mjs` se configurato anche per `portal/`) per individuare riferimenti rotti.
  - Verificare che non esistano più i file originali in `portal/` (per evitare ambiguità) una volta aggiornati i path.

---

## Step 3 — Aggiornare i path relativi negli HTML spostati

**Obiettivo:** correggere tutti i path relativi negli HTML ora sotto `portal/recruitment/` così da puntare alle risorse corrette.

### 3.1 Regole di base sui path

Negli HTML ora in `portal/recruitment/`:

- `../assets/js/config.js` → `../../assets/js/config.js` (se usato)
- `../core/auth.js` → `../../core/auth.js`
- `../core/app-shell.js` → `../../core/app-shell.js`
- `../core/router.js` → `../../core/router.js`
- `../core/session/session.js` → `../../core/session/session.js`
- `../runtime/...` → **dipende**:
  - se il runtime specifico rimane in `portal/runtime/`: `../runtime/foo.js` → `../../runtime/foo.js`
  - se il runtime è stato spostato in `portal/recruitment/runtime/`: aggiornare a `../runtime/foo.js`
- `../styles/style.css` → `../../styles/style.css`
- Qualsiasi `<script src="../shared/...">` o simili → `../../shared/...` (se esistenti).

### 3.2 File HTML da aggiornare

Per ciascuno dei seguenti file, cercare e aggiornare tutti i path relativi:

- `portal/recruitment/dashboard.html`
- `portal/recruitment/candidates.html`
- `portal/recruitment/add-candidate.html`
- `portal/recruitment/candidate.html`
- `portal/recruitment/clients.html`
- `portal/recruitment/add-client.html`
- `portal/recruitment/client.html`
- `portal/recruitment/job-offers.html`
- `portal/recruitment/add-job-offer.html`
- `portal/recruitment/job-offer.html`
- `portal/recruitment/job-postings.html`
- `portal/recruitment/job-posting.html`
- `portal/recruitment/applications.html`
- `portal/recruitment/application.html`
- `portal/recruitment/external-submissions.html`
- `portal/recruitment/external-submission.html`
- `portal/recruitment/archived.html`

### 3.3 Rischi e check

- **Rischio**: path misti (alcuni aggiornati, altri no) con errori silenziosi su script non caricati.
- **Check**:
  - Aprire almeno: `recruitment/dashboard.html`, `recruitment/candidates.html`, `recruitment/job-offers.html`, `recruitment/applications.html`, `recruitment/clients.html`, `recruitment/external-submissions.html`.
  - Verificare da DevTools che non ci siano 404 su CSS/JS.
  - Verificare che la console non mostri errori di moduli mancanti.

---

## Step 4 — Spostare i moduli JS recruitment

**Obiettivo:** spostare i moduli JS specifici del recruitment in sottocartelle di `portal/recruitment/`, mantenendo naming invariato e aggiornando **successivamente** i path di import/caricamento.

### 4.1 Spostare features recruitment

**Sorgente → Destinazione:**

- `portal/features/candidates/` → `portal/recruitment/features/candidates/`
  - `portal/features/candidates/candidate.js` → `portal/recruitment/features/candidates/candidate.js`
  - `portal/features/candidates/candidate-entity-config.js` → `portal/recruitment/features/candidates/candidate-entity-config.js`

- `portal/features/applications/` → `portal/recruitment/features/applications/`
  - `portal/features/applications/applications.js` → `portal/recruitment/features/applications/applications.js`
  - `portal/features/applications/application.js` → `portal/recruitment/features/applications/application.js`
  - `portal/features/applications/application-detail.js` → `portal/recruitment/features/applications/application-detail.js`
  - `portal/features/applications/application-entity-config.js` → `portal/recruitment/features/applications/application-entity-config.js`

- `portal/features/job-offers/` → `portal/recruitment/features/job-offers/`
  - `portal/features/job-offers/job-offer.js` → `portal/recruitment/features/job-offers/job-offer.js`
  - `portal/features/job-offers/job-offer-entity-config.js` → `portal/recruitment/features/job-offers/job-offer-entity-config.js`

- `portal/features/clients/` → `portal/recruitment/features/clients/`
  - `portal/features/clients/client.js` → `portal/recruitment/features/clients/client.js`
  - `portal/features/clients/client-entity-config.js` → `portal/recruitment/features/clients/client-entity-config.js`

- `portal/features/external-submissions/` → `portal/recruitment/features/external-submissions/`
  - `portal/features/external-submissions/external-submission.js` → `portal/recruitment/features/external-submissions/external-submission.js`
  - `portal/features/external-submissions/external-submission-formatters.js` → `portal/recruitment/features/external-submissions/external-submission-formatters.js`
  - `portal/features/external-submissions/external-submission-api.js` → `portal/recruitment/features/external-submissions/external-submission-api.js`
  - `portal/features/external-submissions/external-submissions-list.js` → `portal/recruitment/features/external-submissions/external-submissions-list.js`

**Non spostare (fuori scope recruitment puro):**

- `portal/features/profile/profile.js`

### 4.2 Spostare runtime lists recruitment

**Sorgente → Destinazione:**

- `portal/runtime/lists/dashboard.js` → `portal/recruitment/runtime/lists/dashboard.js`
- `portal/runtime/lists/candidates-list.js` → `portal/recruitment/runtime/lists/candidates-list.js`
- `portal/runtime/lists/clients-list.js` → `portal/recruitment/runtime/lists/clients-list.js`
- `portal/runtime/lists/job-offers-list.js` → `portal/recruitment/runtime/lists/job-offers-list.js`
- `portal/runtime/lists/applications-list.js` → `portal/recruitment/runtime/lists/applications-list.js`
- `portal/runtime/lists/shared-list-helpers.js` → `portal/recruitment/runtime/lists/shared-list-helpers.js`

### 4.3 Spostare runtime entity/formatters recruitment

**Sorgente → Destinazione:**

- `portal/runtime/candidate-runtime.js` → `portal/recruitment/runtime/candidate-runtime.js`
- `portal/runtime/candidate-profile-runtime.js` → `portal/recruitment/runtime/candidate-profile-runtime.js`
- `portal/runtime/client-runtime.js` → `portal/recruitment/runtime/client-runtime.js`
- `portal/runtime/job-offer-runtime.js` → `portal/recruitment/runtime/job-offer-runtime.js`
- `portal/runtime/job-posting-runtime.js` → `portal/recruitment/runtime/job-posting-runtime.js`
- `portal/runtime/job-postings-list-runtime.js` → `portal/recruitment/runtime/job-postings-list-runtime.js`
- `portal/runtime/candidate-import-runtime.js` → `portal/recruitment/runtime/candidate-import-runtime.js`
- `portal/runtime/associations-runtime.js` → `portal/recruitment/runtime/associations-runtime.js`
- `portal/runtime/entity-actions-runtime.js` → `portal/recruitment/runtime/entity-actions-runtime.js`
- `portal/runtime/shared-formatters-runtime.js` → `portal/recruitment/runtime/shared-formatters-runtime.js`

Runtime condivisi che **restano** in `portal/runtime/`:

- `portal/runtime/modals-runtime.js`
- `portal/runtime/filter-drawer-runtime.js`
- `portal/runtime/status-runtime.js`
- `portal/runtime/forms-runtime.js`
- `portal/runtime/router-runtime.js`
- `portal/runtime/bottom-nav-runtime.js`
- `portal/runtime/global-header-actions-runtime.js`
- `portal/runtime/header-runtime.js`
- `portal/runtime/page-bootstrap.js`
- `portal/runtime/profile-runtime.js`

### 4.4 Spostare queries recruitment

**Sorgente → Destinazione:**

- `portal/queries/candidates.queries.js` → `portal/recruitment/queries/candidates.queries.js`
- `portal/queries/clients.queries.js` → `portal/recruitment/queries/clients.queries.js`
- `portal/queries/jobOffers.queries.js` → `portal/recruitment/queries/jobOffers.queries.js`
- `portal/queries/applications.queries.js` → `portal/recruitment/queries/applications.queries.js`

### 4.5 Spostare core/data recruitment

**Sorgente → Destinazione:**

- `portal/core/data/candidates.js` → `portal/recruitment/core/data/candidates.js`
- `portal/core/data/clients.js` → `portal/recruitment/core/data/clients.js`
- `portal/core/data/job-offers.js` → `portal/recruitment/core/data/job-offers.js`
- `portal/core/data/job-postings.js` → `portal/recruitment/core/data/job-postings.js`
- `portal/core/data/applications.js` → `portal/recruitment/core/data/applications.js`
- `portal/core/data/dashboard.js` → `portal/recruitment/core/data/dashboard.js`
- `portal/core/data/activity.js` → `portal/recruitment/core/data/activity.js`

### 4.6 Rischi e check

- **Rischi principali**:
  - Script HTML che referenziano ancora `../features/...`, `../runtime/...`, `../queries/...`, `../core/data/...`.
  - Import/require interni (se presenti) con path relativi non aggiornati.
  - Eventuali riferimenti indiretti in `portal/core/app-shell.js`, `portal/core/lists-runtime.js`, `portal/shared/*`.
- **Check**:
  - Grep/ricerca globale:
    - cercare `features/candidates/`, `features/applications/`, `features/job-offers/`, `features/clients/`, `features/external-submissions/` e aggiornare i path nei riferimenti.
    - cercare `runtime/lists/dashboard.js`, `runtime/candidate-runtime.js`, ecc., e verificare che i percorsi puntino ora sotto `portal/recruitment/runtime/...` dove previsto.
  - Aprire le principali liste e detail view e verificare da DevTools che i moduli siano caricati senza errori.

---

## Step 5 — Aggiornare il router (core + runtime)

**Obiettivo:** far sì che il routing logico punti a path sotto `recruitment/` pur mantenendo compatibile la logica esistente.

### 5.1 `portal/core/router.js`

**Funzioni chiave attuali:**

- `derivePortalBasePath()`: calcola il base path (directory dell’HTML corrente).
- `listKeyToPath(key)`: mappa logical list keys a path relativi, es.:
  - `"candidates" → "candidates.html"`
  - `"job-offers" → "job-offers.html"`
  - ecc.
- `navigateTo(relativePathOrEntity, idOrParams)`: costruisce `window.location.href = base + path`.

**Aggiornamenti da pianificare:**

- **Nuovi path per recruitment** in `listKeyToPath()`:
  - `"candidates"` → `"recruitment/candidates.html"`
  - `"jobOffers"` / `"job-offers"` → `"recruitment/job-offers.html"`
  - `"job-postings"` → `"recruitment/job-postings.html"`
  - `"clients"` → `"recruitment/clients.html"`
  - `"applications"` → `"recruitment/applications.html"`
  - `"external-submissions"` → `"recruitment/external-submissions.html"`
  - eventuali altre chiavi collegate a pagine recruitment (es. `"archived"` se usato come list key).

- **Note su `derivePortalBasePath()`**:
  - La funzione attuale calcola la directory dell’HTML corrente e ritorna qualcosa tipo `.../portal/` o `.../portal/recruitment/`.
  - Se le liste vengono navigate sempre via `navigateTo(listKey)`, è sufficiente che `listKeyToPath()` restituisca path relativi con il prefisso `recruitment/` e che il base path continui a puntare alla directory `portal/` (quando si è in `portal/dashboard.html` / Step 7).
  - Se necessario, aggiungere logica per normalizzare il base path in modo che, quando si è su `portal/dashboard.html`, `derivePortalBasePath()` punti a `/portal/` e non a `/portal/recruitment/` (dipende dal comportamento desiderato per la main dashboard).

### 5.2 `portal/runtime/router-runtime.js`

**Elementi chiave attuali:**

- `PROTECTED_PAGES` include attualmente:
  - `"candidate"`, `"client"`, `"dashboard"`, `"candidates"`, `"applications"`, `"application"`, `"clients"`, `"job-offers"`, `"job-postings"`, `"job-offer"`, `"job-posting"`, `"external-submissions"`, `"external-submission"`, `"profile"`, `"archived"`, `"add-candidate"`, `"add-job-offer"`, `"add-client"`, `"settings"`, `"unknown"`.
- `getPageKey()` basato su `window.location.pathname` e `lastSegment`:
  - Mappa `*.html` a page key (es. `dashboard.html` → `"dashboard"`; `candidates.html` → `"candidates"`; ecc.).
  - Non ha ancora logica specifica per path sotto `recruitment/`, ma funziona anche se l’HTML è dentro una sottocartella, perché guarda solo il last segment.

**Aggiornamenti da pianificare:**

- **PROTECTED_PAGES**:
  - Nulla cambia a livello di elenco: i page key rimangono gli stessi.
  - Verificare però se si vuole proteggere anche la futura `portal/dashboard.html` (main dashboard a livello portal root).

- **getPageKey()**:
  - Attualmente funziona anche se la pagina è `portal/recruitment/candidates.html` (last segment identico).
  - Tuttavia, per robustezza, si può:
    - lasciare invariata la logica switch/case per i `*.html`, che continuerà a funzionare dopo lo spostamento.
    - aggiungere, solo se necessario, qualche condizione che riconosca esplicitamente i path con `/recruitment/` se in futuro si introducono altre pagine con lo stesso filename in altre sottocartelle.

### 5.3 Rischi e check

- **Rischi**:
  - Incoerenza tra path usati dal router (`recruitment/...`) e path reali delle pagine HTML.
  - Base path errato dopo i redirect dal login (vedi Step 7).
- **Check**:
  - Utilizzare la console per chiamare `IERouter.navigateTo("candidates")` e verificare che l’URL generato punti a `/portal/recruitment/candidates.html`.
  - Verificare che `IERouterRuntime.getPageKey()` restituisca ancora i page key attesi quando ci si trova sulle nuove pagine spostate.
  - Verificare che le guardie auth basate su `isProtectedPage(pageKey)` continuino a bloccare accessi anonimi alle pagine di recruitment.

---

## Step 6 — Aggiornare il layout header e bottom nav

**Obiettivo:** aggiornare tutti i link di navigazione per puntare alle nuove pagine sotto `recruitment/`.

### 6.1 `portal/layout/header.html`

Link da aggiornare:

- `href="dashboard.html"` → `href="recruitment/dashboard.html"`
- `href="candidates.html"` → `href="recruitment/candidates.html"`
- `href="external-submissions.html?status=pending_review"` → `href="recruitment/external-submissions.html?status=pending_review"`
- `href="job-offers.html"` → `href="recruitment/job-offers.html"`
- `href="job-postings.html"` → `href="recruitment/job-postings.html"`
- `href="applications.html"` → `href="recruitment/applications.html"`
- `href="clients.html"` → `href="recruitment/clients.html"`
- `href="archived.html"` → `href="recruitment/archived.html"`
- Link azioni globali:
  - `href="add-candidate.html"` → `href="recruitment/add-candidate.html"`
  - `href="add-job-offer.html"` → `href="recruitment/add-job-offer.html"`
  - `href="add-client.html"` → `href="recruitment/add-client.html"`
- Link user:
  - `href="profile.html"` **rimane invariato** (non recruitment).

### 6.2 `portal/layout/bottom-nav.html`

Link da aggiornare:

- `href="dashboard.html"` → `href="recruitment/dashboard.html"`
- `href="candidates.html"` → `href="recruitment/candidates.html"`
- `href="job-offers.html"` → `href="recruitment/job-offers.html"`
- `href="applications.html"` → `href="recruitment/applications.html"`
- Nel menu “More”:
  - `href="clients.html"` → `href="recruitment/clients.html"`
  - `href="archived.html"` → `href="recruitment/archived.html"`
  - `href="profile.html"` **rimane invariato**.
  - `href="index.html"` (logout) **rimane invariato**.

### 6.3 Rischi e check

- **Rischi**:
  - Link misti (alcuni ancora puntano a `portal/*.html`).
  - Incoerenze tra header desktop e bottom nav mobile.
- **Check**:
  - Dal browser, usare tutte le voci di navigazione da header e bottom nav, verificando la corretta apertura delle versioni sotto `recruitment/`.
  - Controllare gli attributi `data-nav-group` rimangano coerenti; non cambiare i valori (servono alla logica JS).

---

## Step 7 — Creare la main dashboard (`portal/dashboard.html`)

**Obiettivo:** introdurre una dashboard principale a livello portal root che funga da hub verso i sotto-portali (recruitment oggi, travel/flavors/estates in futuro).

### 7.1 Nuovo file HTML placeholder

**File da creare:**

- `portal/dashboard.html` (nuova versione, dopo aver spostato la vecchia in `portal/recruitment/dashboard.html`).

**Contenuto minimo suggerito (alto livello, non prescrittivo):**

- Layout coerente con il resto del portal (inclusione di `portal/layout/header.html` e `portal/layout/bottom-nav.html`).
- Una sezione card/grid con:
  - Card “Recruitment” con link a `recruitment/dashboard.html`.
  - Placeholder cards per “Travel”, “Flavors”, “Estates” con link fittizi o `#` e testo “coming soon”.

### 7.2 Aggiornare redirect post-login

Probabile sorgente del redirect:

- `portal/core/app-shell.js` (o file correlati in `portal/core/auth.js`, `portal/core/session/session.js`).

**Aggiornamento da fare:**

- Cambiare il redirect post-login (oggi verosimilmente verso `dashboard.html` nel root del portal) in modo che:
  - Il redirect primario dopo login punti a `portal/dashboard.html` (nuova main dashboard), **non** direttamente a `portal/recruitment/dashboard.html`.
  - La card “Recruitment” all’interno di `portal/dashboard.html` porti a `portal/recruitment/dashboard.html`.

### 7.3 Rischi e check

- **Rischi**:
  - Login che punta ancora a `recruitment/dashboard.html` bypassando la nuova main dashboard.
  - Riferimenti hard-coded in altri moduli che assumono che la dashboard principale sia quella di recruitment.
- **Check**:
  - Eseguire il login da `portal/index.html` e verificare che la prima pagina caricata sia la nuova `portal/dashboard.html`.
  - Da lì, cliccare “Recruitment” e confermare che si arrivi a `portal/recruitment/dashboard.html` con tutto funzionante.

---

## Step 8 — Verificare i link dal sito pubblico verso il portal

**Obiettivo:** assicurare che i link dal sito pubblico (static site) verso il portal siano ancora corretti dopo la ristrutturazione.

### 8.1 Link noti dal sito pubblico

Da `docs/architecture/WEBSITE-FILE-MAP.md` e specifica:

- Pagina pubblica candidate apply:
  - `recruitment/candidate/apply/index.html`
  - All’interno di questa pagina ci possono essere link o redirect verso il portal (es. link “Go to portal” o simili).
- Pagina pubblica jobs:
  - `recruitment/jobs/index.html`
- Qualsiasi altro link verso `portal/` (es. CTA dal sito pubblico verso il login portal).

### 8.2 Cosa controllare

- All’interno di:
  - `recruitment/candidate/apply/index.html`
  - `recruitment/jobs/index.html`
  - altre pagine sotto `recruitment/` o altrove che menzionano `portal/`
- Cercare:
  - `href="/portal/..."`
  - `href="../portal/..."`
  - `href="portal/..."`

- Verificare che:
  - I link verso login (es. `/portal/index.html`) rimangano invariati.
  - Eventuali link diretti alle pagine di dashboard o liste recruitment siano aggiornati a:
    - `portal/recruitment/dashboard.html`
    - `portal/recruitment/candidates.html`
    - ecc., solo se tali link esistono (se oggi puntano già a `portal/dashboard.html` o simili, aggiornarli coerentemente con la nuova architettura).

### 8.3 Rischi e check

- **Rischi**:
  - Link pubblici hard-coded verso le vecchie pagine del portal (`portal/*.html`) che ora non esistono più in root.
- **Check**:
  - Dal sito pubblico, seguire tutti i link che menzionano “portal” o “recruitment portal” e verificare che portino all’esperienza corretta (login → main dashboard → recruitment).

---

## Step 9 — Aggiornare la documentazione

**Obiettivo:** allineare la documentazione all’architettura aggiornata del portal.

### 9.1 `docs/AUDIT-COMPLETO-PROGETTO-NOTION.md`

- Aggiornare sezioni che descrivono:
  - Struttura del `portal/` (nuova presenza di `portal/recruitment/`).
  - Flussi di navigazione dal login alla dashboard recruitment (ora con main dashboard intermedia).
  - Eventuali riferimenti a path HTML vecchi (es. `portal/dashboard.html` inteso come recruitment).

### 9.2 `docs/architecture/WEBSITE-FILE-MAP.md`

- Questa documentazione oggi esclude esplicitamente `portal/`, ma:
  - Si può aggiungere un breve riferimento che precisa che il portal ora contiene un sotto-portal recruitment in `portal/recruitment/`, **senza** elencarne tutti i file (per mantenere il focus sul sito statico).
  - Oppure lasciare invariate le sezioni principali ma aggiornare la nota finale “Out-of-scope: `portal/`” per riflettere la nuova architettura ad alto livello.

### 9.3 Altra documentazione

- Cercare nei `docs/` file che menzionano esplicitamente vecchi path del portal:
  - `portal/dashboard.html`
  - `portal/candidates.html`
  - ecc.
- Aggiornare i riferimenti a:
  - `portal/recruitment/...` dove si parla specificamente del sotto-portal recruitment.
  - `portal/dashboard.html` come main dashboard se introdotta.

### 9.4 Rischi e check

- **Rischi**:
  - Divergenza tra codice e documentazione (documentazione che si riferisce a path non più esistenti).
- **Check**:
  - Dopo le modifiche, eseguire una ricerca full-text nei docs per `portal/` e verificare che non restino riferimenti obsoleti ai vecchi path root delle pagine recruitment.

---

## Step 10 — Commit finale e verifica end-to-end

**Obiettivo:** chiudere la migrazione in modo sicuro, con commit separati per step e una verifica funzionale completa.

### 10.1 Strategia di commit

Per rispettare la regola “Ogni step deve essere testabile prima di procedere al successivo”:

- **Commit 1**: creazione cartelle (`portal/recruitment/...`) e nessun file spostato.
- **Commit 2**: spostamento HTML recruitment (Step 2) + fix path relativi base (Step 3 parziale) + test di base sulle pagine.
- **Commit 3**: spostamento moduli JS recruitment (features/runtime/queries/core/data) + aggiornamento di tutti i riferimenti ai nuovi path (Step 4 completo) + test liste/dettagli.
- **Commit 4**: aggiornamenti router (`portal/core/router.js`, `portal/runtime/router-runtime.js`) e layout header/bottom-nav (Step 5 + 6).
- **Commit 5**: nuova main dashboard root `portal/dashboard.html` + redirect post-login aggiornato (Step 7).
- **Commit 6**: aggiornamento documentazione (Step 9).
- **Commit finale di consolidamento (opzionale)**: se necessario, un ultimo commit con piccole correzioni post-test integrato.

### 10.2 Checklist finale di verifica

- **Login**:
  - Da `portal/index.html`, login con utente valido.
  - Verificare:
    - Redirect a `portal/dashboard.html` (nuova main dashboard).
    - Nessun errore JS in console.

- **Navigazione recruitment**:
  - Da main dashboard, seguire il link “Recruitment” → `portal/recruitment/dashboard.html`.
  - Usare l’header per navigare:
    - `Dashboard` → `portal/recruitment/dashboard.html`
    - `Candidates` → `portal/recruitment/candidates.html`
    - `Job Offers` → `portal/recruitment/job-offers.html`
    - `Applications` → `portal/recruitment/applications.html`
    - `Clients` → `portal/recruitment/clients.html`
    - `Archived` → `portal/recruitment/archived.html`
    - `Inbound Submissions` → `portal/recruitment/external-submissions.html?status=pending_review`
  - Usare il menu `+ Add` per:
    - `Add Candidate` → `portal/recruitment/add-candidate.html`
    - `Add Job Offer` → `portal/recruitment/add-job-offer.html`
    - `Add Client` → `portal/recruitment/add-client.html`
  - Dal bottom nav mobile, verificare gli stessi percorsi.

- **Dettagli entity**:
  - Aprire una candidatura, un client, un job offer, una application da ciascuna lista; verificare che:
    - Le pagine detail (`candidate.html`, `client.html`, `job-offer.html`, `application.html`, `job-posting.html`, `external-submission.html`) funzionino da `portal/recruitment/`.
    - I runtime (`*-runtime.js`) e le configurazioni (`entity-*-config.js`) siano caricati senza errori.

- **Link dal sito pubblico**:
  - Da `recruitment/candidate/apply/index.html`: completare un flusso (senza necessariamente inviare dati reali in produzione), verificare eventuali link al portal.
  - Da `recruitment/jobs/index.html` (e altre pagine pubbliche collegate): verificare link verso il portal.

### 10.3 Messaggio di commit finale consigliato

- **Messaggio**:

  - `refactor: restructure portal into modular sub-portal architecture`

Questo commit dovrebbe rappresentare lo stato in cui:
- La struttura `portal/recruitment/` è pienamente operativa.
- Il login e la navigazione funzionano end-to-end.
- La documentazione è allineata ai nuovi path.
