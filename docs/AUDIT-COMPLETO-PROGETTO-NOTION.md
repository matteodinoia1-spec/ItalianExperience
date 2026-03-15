# Audit completo progetto Italian Experience – per import Notion

Documento unico con: albero del progetto, spiegazione di ogni file, SQL/RLS/storage/Edge Functions Supabase e logica di business. Pensato per essere copiato/importato in Notion.

**Memoria di progetto**: lo spazio Notion “Italian Experience – Audit progetto” è la **memoria ad alto livello** del progetto (struttura, schema, RLS, storage, Edge Functions, flussi). Questo file è la fonte di verità. La sync su Notion va fatta **solo** in caso di cambi materiali (architettura, schema DB, RLS/storage/Edge Functions, nuovo modulo, flusso core) o su **richiesta esplicita**. Non aggiornare per modifiche minori, UI/styling, typo, commenti, piccoli refactor. Vedi `docs/NOTION-SYNC-CONVENTIONS.md`, `docs/ai/README.md`, `.cursor/rules/notion-audit-sync.mdc`.

---

## 1. Panoramica del progetto

**Italian Experience** è una piattaforma che combina:

- **Sito pubblico** (marketing): travel, recruitment, flavors, estates, contact.
- **Portal operativo** (ATS): candidati, clienti, job offer, applicazioni, submission esterne.
- **Backend Supabase**: auth, database (PostgreSQL), storage, Edge Functions.

**Repo**: monorepo con HTML/JS/CSS statici, portal SPA-like, Supabase (migrations + functions).

**Deploy**: sito statico (es. GitHub Pages o altro host statico) + Supabase cloud; portal servito sotto lo stesso base path (es. `/ItalianExperience/portal/`).

---

## 2. Albero del progetto (struttura principale)

```
ItalianExperience/
├── 404.html
├── index.html
├── README.md
├── package.json, package-lock.json
├── tailwind.config.js, postcss.config.js
├── netlify.toml
├── _headers
├── .gitignore
├── .cursor/
│   └── settings.json
│
├── assets/
│   ├── css/           (site.css, tailwind*, cookie-banner.css)
│   ├── js/            (config.js, bootstrap.js, site.js, cookie-consent.js, forms.js)
│   └── img/           (home, recruitment, flavors, travel, estates – immagini produzione)
│
├── partials/
│   ├── header.html
│   ├── footer.html
│   └── cookie-banner.html
│
├── contact/
│   └── index.html
├── estates/
│   └── index.html
├── flavors/
│   ├── index.html
│   ├── for-your-home/index.html
│   ├── for-your-business/index.html
│   └── aziende-italiane/index.html
├── recruitment/
│   ├── index.html
│   ├── employer/index.html
│   ├── candidate/index.html
│   └── candidate/apply/index.html   ← form candidatura pubblica
├── travel/
│   ├── index.html
│   ├── gapyear/index.html
│   ├── culinary/index.html
│   └── bespoke/index.html
├── privacy/
│   └── index.html
│
├── portal/                        ← Applicazione ATS (autenticata)
│   ├── index.html, dashboard.html, forgot-password.html, reset-password.html
│   ├── candidates.html, candidate.html, add-candidate.html
│   ├── clients.html, client.html, add-client.html
│   ├── job-offers.html, job-offer.html, add-job-offer.html
│   ├── job-postings.html, job-posting.html
│   ├── applications.html, application.html
│   ├── external-submissions.html, external-submission.html
│   ├── profile.html, archived.html
│   ├── core/          (auth, router, supabase, data layer, entity-page, ui)
│   ├── features/      (candidates, clients, job-offers, applications, external-submissions, profile, archived)
│   ├── runtime/       (page-bootstrap, list runtimes, form runtimes, modals, filters)
│   ├── queries/       (Supabase query builders per entità)
│   ├── layout/        (header, footer, bottom-nav HTML)
│   ├── styles/        (CSS portal)
│   ├── components/
│   ├── shared/
│   ├── migrations/    (SQL: RLS, storage, schema snapshots, ATS)
│   └── docs/          (documentazione interna portal)
│
├── supabase/
│   └── functions/
│       ├── _shared/     (http, storage, admin, supabase, source)
│       ├── prepare-external-application-upload/
│       ├── submit-external-application/
│       └── promote-external-submission/
│
├── scripts/
│   ├── check-links.mjs
│   ├── add-image-dimensions.mjs
│   ├── generate-all-avif.mjs, generate-gapyear-avif.mjs
│   └── replace-base-path.mjs
│
├── docs/
│   ├── README.md, ai/README.md
│   ├── architecture/   (URL, file map, portal role access, refactor)
│   ├── audits/
│   ├── refactor/
│   └── _private-transfer/
│
└── archive/
    └── site/           (backup / asset non in produzione)
```

---

## 3. Audit file per file (cosa fa ogni file)

### 3.1 Root e configurazione

| File | Ruolo |
|------|--------|
| `index.html` | Homepage sito pubblico; hero e link alle 4 aree (Travel, Recruitment, Flavors, Estates). |
| `404.html` | Pagina “Not found” per il sito. |
| `README.md` | Descrizione repo: sito pubblico, portal, Supabase, deploy, doc di riferimento. |
| `package.json` | Script `check:links`, devDependencies: tailwindcss, postcss, autoprefixer, sharp. |
| `tailwind.config.js` | Configurazione Tailwind per il sito. |
| `postcss.config.js` | PostCSS (Tailwind + autoprefixer). |
| `netlify.toml` | Config deploy statico stile Netlify (redirect, header, ecc.), riusata anche con GitHub Pages. |
| `_headers` | Header HTTP aggiuntivi (es. sicurezza/CORS) per CDN/Netlify‑style host. |
| `.gitignore` | File/cartelle ignorati da Git: `node_modules/`, `dist/` (output dello script replace-base-path), `.env`, doc privati, ecc. La cartella `dist/` non è in repo; è generata a build solo se si pubblica da lì (vedi README § Deploy). |

---

### 3.2 Assets condivisi (sito pubblico)

| File | Ruolo |
|------|--------|
| `assets/js/config.js` | **Configurazione runtime**: `window.IEConfig` con `BASE_PATH`, `PORTAL_PATH`, `SITE_URL`, `SUPABASE_URL`, `SUPABASE_FUNCTIONS_URL`, `SUPABASE_ANON_KEY`. Default production; override possibile con script inline prima del load. |
| `assets/js/bootstrap.js` | Carica header/footer da partials in `#site-header` / `#site-footer`, poi `site.js` e `IEInit(document)` se definito. |
| `assets/js/site.js` | Comportamenti JS condivisi sul sito pubblico. |
| `assets/js/cookie-consent.js` | Banner cookie: lazy load e interazione utente. |
| `assets/js/forms.js` | Helper form pubblico (es. intl-tel per telefono). |
| `assets/css/site.css` | Stili globali sito: token, hero, card, disclosure/legal. |
| `assets/css/tailwind.css` | Output compilato Tailwind. |
| `assets/css/tailwind.input.css` | Input Tailwind (source). |
| `assets/css/cookie-banner.css` | Stili banner cookie. |

---

### 3.3 Partials

| File | Ruolo |
|------|--------|
| `partials/header.html` | Header/nav condiviso; iniettato in `#site-header` da bootstrap.js. |
| `partials/footer.html` | Footer condiviso; iniettato in `#site-footer`. |
| `partials/cookie-banner.html` | Markup banner cookie. |

---

### 3.4 Pagine pubbliche (HTML)

| File | Ruolo |
|------|--------|
| `contact/index.html` | Pagina contatti. |
| `estates/index.html` | Pagina Estates (patrimonio/heritage). |
| `flavors/index.html` | Hub Flavors (food/gourmet). |
| `flavors/for-your-home/index.html` | Flavors per casa. |
| `flavors/for-your-business/index.html` | Flavors per business. |
| `flavors/aziende-italiane/index.html` | Flavors aziende italiane. |
| `recruitment/index.html` | Hub Recruitment. |
| `recruitment/employer/index.html` | Pagina employer. |
| `recruitment/candidate/index.html` | Pagina candidato. |
| `recruitment/candidate/apply/index.html` | **Form candidatura pubblica**: CV/foto, dati anagrafici, consenso privacy; Turnstile CAPTCHA; chiama Edge Functions (prepare upload + submit). |
| `travel/index.html` | Hub Travel. |
| `travel/gapyear/index.html` | Gap year. |
| `travel/culinary/index.html` | Culinary academy. |
| `travel/bespoke/index.html` | Viaggi su misura. |
| `privacy/index.html` | Privacy policy. |

---

### 3.5 Portal – HTML

> **Struttura aggiornata**: a seguito della migrazione (branch `portal-typography-refinement`), tutte le pagine specifiche del recruitment sono state spostate in `portal/recruitment/`. Le pagine di autenticazione, profilo e la nuova main dashboard restano in `portal/`.

**Pagine root del portal (`portal/`)**

| File | Ruolo |
|------|--------|
| `portal/index.html` | Landing/redirect portal (login). |
| `portal/dashboard.html` | Main portal hub: mostra card per i moduli (Recruitment, Travel, Flavors, Estates). Primo redirect post-login. |
| `portal/forgot-password.html` | Recupero password. |
| `portal/reset-password.html` | Reset password (link email). |
| `portal/profile.html` | Profilo utente loggato. |

**Pagine recruitment (`portal/recruitment/`)**

| File | Ruolo |
|------|--------|
| `portal/recruitment/dashboard.html` | Dashboard ATS recruitment (statistiche, submission in ingresso, live offers). |
| `portal/recruitment/candidates.html` | Lista candidati. |
| `portal/recruitment/candidate.html` | Dettaglio candidato (view/edit). |
| `portal/recruitment/add-candidate.html` | Creazione candidato. |
| `portal/recruitment/clients.html` | Lista clienti. |
| `portal/recruitment/client.html` | Dettaglio cliente. |
| `portal/recruitment/add-client.html` | Creazione cliente. |
| `portal/recruitment/job-offers.html` | Lista job offer (interni). |
| `portal/recruitment/job-offer.html` | Dettaglio job offer. |
| `portal/recruitment/add-job-offer.html` | Creazione job offer. |
| `portal/recruitment/job-postings.html` | Lista job posting (pubblici). |
| `portal/recruitment/job-posting.html` | Dettaglio job posting (titolo, slug, scadenza, publish). |
| `portal/recruitment/applications.html` | Lista applicazioni (candidato–job). |
| `portal/recruitment/application.html` | Dettaglio applicazione. |
| `portal/recruitment/external-submissions.html` | Lista submission esterne (pending_review, ecc.). |
| `portal/recruitment/external-submission.html` | Dettaglio submission: approve new candidate / link existing / reject (chiama Edge Function promote). |
| `portal/recruitment/archived.html` | Vista archiviati. |

---

### 3.6 Portal – Core (auth, router, Supabase, dati)

| File | Ruolo |
|------|--------|
| `portal/core/supabase-client.js` | Crea client Supabase da CDN; espone `window.IESupabaseClient.supabase` e `getBasePath()`; richiede `IEConfig`. |
| `portal/core/supabase.js` | Wrapper auth/session: `requireAuth`, `enforceAuthGuard`, `redirectToLogin`, `logout`; usa client da supabase-client. |
| `portal/core/auth.js` | Facade auth: `checkAuth(optionalCachedSession)`, `logout`; delega a IESupabase. |
| `portal/core/session-ready.js` | Attende sessione pronta; usato dal bootstrap per evitare flash. |
| `portal/core/session/session.js` | Gestione sessione (inattività, ecc.). |
| `portal/core/router.js` | `derivePortalBasePath`, `listKeyToPath`, `navigateTo`, `redirectToEntityView`, normalizzazione query (id, mode). |
| `portal/core/app-shell.js` | Shell app: auth guard, inizializzazione globale, mount componenti. |
| `portal/core/lists-runtime.js` | Helpers runtime per liste (paginazione, filtri). |
| `portal/core/job-posting-deadline.js` | Logica scadenza job posting (apply_deadline). |
| `portal/core/entity-page/entity-page-shell.js` | Shell pagina entità (view/edit). |
| `portal/core/entity-page/entity-field-mapper.js` | Mappatura campi entità → UI. |
| `portal/core/entity-toolbar.js` | Toolbar azioni entità (edit, delete, ecc.). |
| `portal/core/source-helpers.js` | Normalizzazione “source” candidato (public_form, linkedin, …). |
| `portal/core/debug.js` | Utility debug (condizionate da env/flag). |
| `portal/core/ui/modals.js` | Modali condivise. |
| `portal/core/ui/previews.js` | Anteprime (es. file). |
| `portal/core/data/activity.js` | Dati activity log (entity_type, entity_id). |
| `portal/core/data/applications.js` | Dati applicazioni (con join candidato/job). |
| `portal/core/data/candidates.js` | Dati candidati (filtri, status). |
| `portal/core/data/clients.js` | Dati clienti. |
| `portal/core/data/dashboard.js` | Dati dashboard (count, ultime submission, ecc.). |
| `portal/core/data/job-offers.js` | Dati job offer. |
| `portal/core/data/job-postings.js` | Dati job postings (pubblici, slug, is_published). |
| `portal/core/data/job-postings.js` | Usato anche per public job list e apply. |

---

### 3.7 Portal – Features (logica per entità)

| File | Ruolo |
|------|--------|
| `portal/features/candidates/candidate.js` | Logica pagina candidato (load, save). |
| `portal/features/candidates/candidate-entity-config.js` | Config campi/azioni candidato. |
| `portal/features/clients/client.js` | Logica pagina cliente. |
| `portal/features/clients/client-entity-config.js` | Config cliente. |
| `portal/features/job-offers/job-offer.js` | Logica job offer. |
| `portal/features/job-offers/job-offer-entity-config.js` | Config job offer. |
| `portal/features/applications/application.js` | Logica applicazione. |
| `portal/features/applications/application-detail.js` | Dettaglio applicazione. |
| `portal/features/applications/application-entity-config.js` | Config applicazione. |
| `portal/features/applications/applications.js` | Lista applicazioni. |
| `portal/features/external-submissions/external-submission.js` | Dettaglio submission: UI approve/link/reject. |
| `portal/features/external-submissions/external-submissions-list.js` | Lista submission con filtri. |
| `portal/features/external-submissions/external-submission-api.js` | API: fetch submission, promote (chiamata a Edge Function con JWT). |
| `portal/features/external-submissions/external-submission-formatters.js` | Formattazione dati submission per tabella/dettaglio. |
| `portal/features/profile/profile.js` | Profilo utente. |
| `portal/features/archived/archived.js` | Vista archiviati. |

---

### 3.8 Portal – Runtime (bootstrap, liste, form, filtri)

| File | Ruolo |
|------|--------|
| `portal/runtime/page-bootstrap.js` | **Bootstrap centrale**: attende auth guard, inizializza header/bottom-nav, form (candidate, job offer, client), liste e controller di pagina in base a `pageKey`. |
| `portal/runtime/page-bootstrap.js` | Page key da URL (candidates, candidate, job-offer, applications, external-submissions, ecc.). |
| `portal/runtime/lists/candidates-list.js` | Lista candidati. |
| `portal/runtime/lists/clients-list.js` | Lista clienti. |
| `portal/runtime/lists/job-offers-list.js` | Lista job offer. |
| `portal/runtime/lists/applications-list.js` | Lista applicazioni. |
| `portal/runtime/lists/dashboard.js` | Widget dashboard. |
| `portal/runtime/lists/shared-list-helpers.js` | Helper comuni liste (sort, pagination). |
| `portal/runtime/candidate-runtime.js` | Init pagina candidato (form, toolbar). |
| `portal/runtime/candidate-profile-runtime.js` | Profilo candidato (sezione profilo). |
| `portal/runtime/candidate-import-runtime.js` | Import candidati (se presente). |
| `portal/runtime/client-runtime.js` | Init pagina cliente. |
| `portal/runtime/job-offer-runtime.js` | Init pagina job offer. |
| `portal/runtime/job-posting-runtime.js` | Init pagina job posting. |
| `portal/runtime/job-postings-list-runtime.js` | Lista job postings. |
| `portal/runtime/forms-runtime.js` | Inizializzazione form (candidate, job offer, client), edit toolbars. |
| `portal/runtime/filter-drawer-runtime.js` | Drawer filtri (liste). |
| `portal/runtime/entity-actions-runtime.js` | Azioni entità (create, delete, ecc.). |
| `portal/runtime/global-header-actions-runtime.js` | Azioni header globale (search, add). |
| `portal/runtime/header-runtime.js` | Header portal. |
| `portal/runtime/bottom-nav-runtime.js` | Bottom navigation. |
| `portal/runtime/router-runtime.js` | Binding router (navigate, derive base path). |
| `portal/runtime/modals-runtime.js` | Apertura/chiusura modali. |
| `portal/runtime/status-runtime.js` | Aggiornamento status (candidato, applicazione). |
| `portal/runtime/associations-runtime.js` | Associazioni candidato–job. |
| `portal/runtime/shared-formatters-runtime.js` | Formatter condivisi (date, status label). |
| `portal/runtime/profile-runtime.js` | Pagina profilo. |

---

### 3.9 Portal – Queries, layout, shared, styles

| File | Ruolo |
|------|--------|
| `portal/queries/candidates.queries.js` | Query builder Supabase per candidati. |
| `portal/queries/clients.queries.js` | Query builder clienti. |
| `portal/queries/jobOffers.queries.js` | Query builder job offer. |
| `portal/queries/applications.queries.js` | Query builder applicazioni. |
| `portal/layout/header.html` | Header HTML portal. |
| `portal/layout/footer.html` | Footer portal. |
| `portal/layout/bottom-nav.html` | Bottom nav HTML. |
| `portal/shared/header-loader.js` | Caricamento header. |
| `portal/shared/activity-section.js` | Sezione activity log in dettaglio entità. |
| `portal/components/page-header.js` | Componente header pagina (titolo, breadcrumb). |
| `portal/styles/style.css` | Stili globali portal. |
| `portal/styles/ui.css` | UI (bottoni, form, tabelle). |
| `portal/styles/components/*.css` | Badges, cards, filters, layout, tables, activity-log, page-header. |

---

### 3.10 Scripts (tooling)

| File | Ruolo |
|------|--------|
| `scripts/check-links.mjs` | Verifica link interni/esterni (npm run check:links). |
| `scripts/add-image-dimensions.mjs` | Aggiunge dimensioni immagini (width/height) in HTML. |
| `scripts/generate-all-avif.mjs` | Genera AVIF da sorgenti. |
| `scripts/generate-gapyear-avif.mjs` | AVIF per sezione gapyear. |
| `scripts/replace-base-path.mjs` | Script build-time: legge i file migrati dalla root, scrive output in `dist/` (cartella in .gitignore, non in repo); sostituisce %%BASE_PATH%% con il base path di produzione. Opzionale: usato solo se si pubblica da `dist/` su un host statico diverso da GitHub Pages (vedi README). |

---

### 3.11 Documentazione (docs/)

| Area | Ruolo |
|------|--------|
| `docs/README.md`, `docs/ai/README.md` | Indice e note AI. |
| `docs/architecture/` | WEBSITE-URL-AND-PATH-CONVENTIONS, WEBSITE-FILE-MAP, WEBSITE-STRUCTURE, PORTAL-ROLE-ACCESS-BLUEPRINT, PORTAL-ROLE-ACCESS-MATRIX, refactor PUBLIC-UI-STEP-*, TARGET-REPO-LAYOUT, ecc. |
| `docs/audits/` | BASE-PATH-AUDIT, altri audit. |
| `docs/refactor/` | Piano refactor portal, migration plan, execution log. |
| `docs/_private-transfer/` | Audit privati: storage, security, schema DB, caching. |
| `portal/docs/` | Doc interna portal: ATS, layout, security, recruitment flow, pipeline status, bootstrap. |

---

## 4. Supabase – Database, RLS, Storage

### 4.1 Tabelle principali (da schema snapshot e RLS)

- **profiles**  
  Estensione auth: `id` (PK, = auth.uid()), `role` (admin, recruiter, staff). Usata da RLS e Edge Function `requireAdmin`.

- **candidates**  
  Candidati: anagrafica, status, source, cv_url, photo_url, note, is_archived, created_by, ecc.

- **clients**  
  Clienti (aziende/employer).

- **job_offers**  
  Offerte di lavoro (interno ATS).

- **job_postings**  
  Versione “pubblica” di una job offer: 1:1 con job_offers (job_offer_id unique), slug, public_title, public_description, is_published, apply_enabled, apply_deadline. Lettura anonima solo su post pubblicati.

- **candidate_job_associations**  
  Collegamento candidato–job (stato applicazione: applied, rejected, ecc.).

- **external_candidate_submissions**  
  Candidature dal form pubblico: first_name, last_name, email, phone, position, summary, experience_json, education_json, skills_json, languages_json, certifications_json, hobbies_json, resume_path, photo_path, submission_type (spontaneous | job_offer), job_offer_id, status (pending_review, approved, rejected, linked_existing, converted), reviewed_by, reviewed_at, review_notes, linked_candidate_id.

- **privacy_consents**  
  Consensi privacy: candidate_id o external_submission_id, consent_type, consent_given, source, user_agent, created_at. Scritta da Edge Function submit + promote.

- **activity_logs**  
  Log eventi (entity_type, entity_id, event_type, message, metadata, created_by).

Tabelle di supporto (skills, languages, experience, education, certifications, hobbies) collegate a `candidates` (candidate_id).

---

### 4.2 Funzione SQL helper (RLS)

- **`public.is_internal_staff(uid uuid) RETURNS boolean`**  
  Restituisce true se esiste un `profiles` con `id = uid` e `role` in ('admin','recruiter','staff'). Usata da tutte le policy “internal staff”.

---

### 4.3 RLS – Policy (migration `supabase-migration-rls-internal-staff.sql`)

- **candidates**: `candidates_internal_staff_all` – FOR ALL TO authenticated USING/WITH CHECK `auth.uid() IS NOT NULL AND is_internal_staff(auth.uid())`.
- **clients**: `clients_internal_staff_all` – stessa logica.
- **job_offers**: `job_offers_internal_staff_all` – stessa logica.
- **candidate_job_associations**: `associations_internal_staff_all` – stessa logica.
- **external_candidate_submissions**: `external_submissions_select_internal_staff` – FOR SELECT TO authenticated, stessa condizione. INSERT/UPDATE/DELETE solo da service role (Edge Functions).
- **job_postings**:  
  - `job_postings_internal_staff_select/insert/update` – SELECT/INSERT/UPDATE solo internal staff.  
  - Policy anonima “Public can read published job postings” lasciata invariata.
- **privacy_consents**: `privacy_consents_select_internal_staff` – FOR SELECT TO authenticated, stessa condizione. Scrittura solo da service role.

---

### 4.4 Storage – Policy (migrations storage-*)

- **Bucket `candidate-files`**  
  - SELECT, INSERT, DELETE: solo se `auth.uid() IS NOT NULL AND is_internal_staff(auth.uid())`.  
  - Upload da portal con client autenticato; copia da submission esterna fatta dalla Edge Function con service role.

- **Bucket `external-candidate-submissions`**  
  - SELECT: solo internal staff (stessa condizione).  
  - INSERT: nessuna policy authenticated; upload solo tramite **signed upload URL** creata dalla Edge Function `prepare-external-application-upload` (service role).  
  - DELETE: dalla Edge Function (promote) con service role.

---

### 4.5 Altre migration SQL (portal/migrations)

- **supabase-migration-availability-status.sql** – Aggiunge `availability_status` a `candidates` (default 'available').
- **supabase-migration-profiles-primary-key.sql** – Aggiunge PK su `profiles.id` se mancante.
- **supabase-migration-italian-to-english.sql** – Traduzione valori (es. status) da italiano a inglese.
- **ats-status-migration.sql**, **ats-verification-queries.sql** – Allineamento status ATS e query di verifica.
- **supabase-schema-snapshot-*.sql** – Snapshot documentali di `external_candidate_submissions`, `privacy_consents`, `job_postings` (non applicati automaticamente in produzione).

---

## 5. Supabase – Edge Functions

### 5.1 Shared (`supabase/functions/_shared/`)

| File | Ruolo |
|------|--------|
| `http.ts` | CORS_HEADERS, jsonResponse, getBearerToken, getClientIp, readJsonBody (max 1MB). |
| `storage.ts` | `isValidSubmissionObjectPath(path, kind)` – valida path oggetto storage nel formato `{resume|photo}-{13-digit-ts}-{6-char}-{safeName}.{ext}`. |
| `admin.ts` | `requireAdmin(supabaseAdmin, jwt)` – verifica JWT, legge profiles.role, confronta con `IE_ADMIN_ROLES` (env, default "admin"); lancia 401/403. |
| `supabase.ts` | `getRequiredEnv`, `createSupabaseAdminClient()` (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). |
| `source.ts` | SOURCE_VALUES, SOURCE_LABELS, normalizeSource(raw), sourceToLabel(raw) – canonicalizzazione source candidato. |

---

### 5.2 prepare-external-application-upload

- **Metodo**: POST (OPTIONS per CORS).
- **Input JSON**: file_kind (resume | photo), filename, content_type, size_bytes, captcha_token.
- **Flusso**:  
  1. Verifica CAPTCHA (Cloudflare Turnstile, TURNSTILE_SECRET_KEY).  
  2. Valida file_kind, filename, content_type, size (resume: max 5MB, PDF; photo: max 3MB, jpg/png/webp).  
  3. Genera object_path: `{file_kind}-{timestamp}-{random}-{safeName}.{ext}`.  
  4. Crea **signed upload URL** sul bucket `external-candidate-submissions` (service role).  
  5. Restituisce bucket, object_path, upload_token, signed_upload_url, content_type, max_size_bytes.
- **Uso**: il form pubblico (`recruitment/candidate/apply`) prima ottiene l’URL firmato, poi carica il file con il client (fetch put su signed_upload_url). Non serve auth utente.

---

### 5.3 submit-external-application

- **Metodo**: POST.
- **Input JSON**: main (first_name, last_name, email, phone, position, summary, linkedin_url, address, date_of_birth), profile_children (experience, education, skills, languages, certifications, hobbies), context (submission_type, job_offer_id, source), privacy (consent_privacy), files (resume_path, photo_path), captcha_token; meta (form_started_at); honeypot (website).
- **Flusso**:  
  1. Verifica CAPTCHA.  
  2. Honeypot: se website compilato → 400 spam.  
  3. Form troppo veloce (form_started_at < 5s) → 400.  
  4. Validazione: first_name, last_name obbligatori; almeno uno tra email e phone; email formato valido; consent_privacy === true; submission_type in (spontaneous, job_offer); se job_offer allora job_offer_id obbligatorio e deve esistere in job_offers.  
  5. resume_path e photo_path (se presenti) validati con `isValidSubmissionObjectPath`.  
  6. source normalizzato con normalizeSource.  
  7. Duplicati: nessuna submission pending_review con stesso email o phone → 409.  
  8. Throttle: nessuna submission con stesso email/phone negli ultimi 60s → 429.  
  9. INSERT in `external_candidate_submissions` (status pending_review).  
  10. INSERT in `privacy_consents` (external_submission_id, consent_type, source, user_agent).  
  11. Risposta 201 con submission_id, submission_status.
- **Scrittura DB**: solo service role; anon non ha policy INSERT su external_candidate_submissions né su privacy_consents.

---

### 5.4 promote-external-submission

- **Metodo**: POST.
- **Auth**: Bearer JWT obbligatorio; `requireAdmin` (solo ruoli in IE_ADMIN_ROLES).
- **Input JSON**: submission_id, action (approve_new_candidate | link_existing_candidate | reject_submission), review_notes, existing_candidate_id (se link_existing_candidate), job_offer_id (opzionale), create_application (boolean).
- **Flusso**:  
  1. Carica submission; deve essere in stato pending_review.  
  2. **reject_submission**: update status → rejected, reviewed_by, reviewed_at, review_notes.  
  3. **approve_new_candidate**:  
     - Controllo duplicati candidato (email/phone già in `candidates`) → 409 se esiste.  
     - INSERT in `candidates` (dati da submission, source normalizzato).  
     - Copia resume/photo da bucket `external-candidate-submissions` a `candidate-files` (path `{candidate_id}/{filename}`), aggiorna cv_url/photo_url su candidate, rimuove file da bucket esterne.  
     - Inserimenti in candidate_skills, candidate_languages, candidate_experience, candidate_education, candidate_certifications, candidate_hobbies.  
     - Se create_application e job_offer_id (da submission o body): INSERT in candidate_job_associations (status applied).  
     - Update submission: linked_candidate_id, status → converted, reviewed_by, reviewed_at, review_notes.  
     - Activity log: “Candidate created from external submission”.  
  4. **link_existing_candidate**:  
     - Verifica existing_candidate_id in `candidates`.  
     - Se create_application: stessa logica associazione candidato–job.  
     - Update submission: linked_candidate_id, status → linked_existing, reviewed_by, reviewed_at, review_notes.
- **Chiamata**: solo da portal autenticato (staff), da `portal/features/external-submissions/external-submission-api.js` con JWT in Authorization.

---

## 6. Logica di business (flussi principali)

### 6.1 Candidatura pubblica (form apply)

1. Utente apre `recruitment/candidate/apply/index.html`.  
2. Per ogni file (CV, foto):  
   - Frontend chiama **prepare-external-application-upload** con file_kind, filename, content_type, size_bytes, captcha_token.  
   - Riceve signed_upload_url e carica il file con PUT.  
   - Conserva object_path (resume_path, photo_path) per il submit.  
3. Submit form:  
   - Frontend chiama **submit-external-application** con main, profile_children, context, privacy, files (resume_path, photo_path), captcha_token.  
   - Backend valida, controlla duplicati/throttle, inserisce submission e privacy_consents.  
4. Submission appare in portal in **External submissions** con status pending_review. Solo internal staff può leggerla (RLS) e vedere file (storage policy).

### 6.2 Revisione submission (portal → promote)

1. Staff apre **external-submission.html** (lista) o **external-submission.html?id=...** (dettaglio).  
2. Dettaglio: pulsanti Approve (new candidate), Link existing candidate, Reject.  
3. Approve new:  
   - Chiamata a **promote-external-submission** con submission_id, action: approve_new_candidate, opzionale create_application e job_offer_id.  
   - Backend crea candidato, copia file in candidate-files, popola tabelle correlate, eventualmente crea application.  
4. Link existing:  
   - Staff sceglie candidato esistente; chiamata con action: link_existing_candidate, existing_candidate_id, opzionale create_application.  
5. Reject:  
   - Chiamata con action: reject_submission; submission passa a rejected.

### 6.3 Auth e accesso portal

1. Client Supabase creato in **supabase-client.js** con anon key; auth con signIn/signOut.  
   La Supabase anon key (publishable) è hard-coded nel codice client (es. `assets/js/config.js`) per design: è sicura da esporre perché l’accesso ai dati sensibili è comunque protetto dalle policy RLS e Storage su Supabase.
2. **supabase.js** espone requireAuth / enforceAuthGuard: se non c’è sessione si reindirizza a login (forgot-password, index portal).  
3. **session-ready.js** / **page-bootstrap.js** attendono sessione prima di mostrare contenuti protetti.  
4. RLS: tutte le tabelle operative (candidates, clients, job_offers, associations, job_postings, external_submissions read, privacy_consents read) sono accessibili solo a utenti con `is_internal_staff(auth.uid())`.  
5. Edge Function promote usa **requireAdmin** con stesso insieme di ruoli (IE_ADMIN_ROLES).

### 6.4 Job postings pubblici

1. **job_postings**: 1:1 con job_offers; campi pubblici (slug, public_title, is_published, apply_enabled, apply_deadline).  
2. Policy anonima: lettura solo dove is_published = true.  
3. Sito pubblico: lista lavori e pagina apply usano slug/apply_deadline; form apply può inviare job_offer_id (context) a submit-external-application.  
4. Portal: internal staff può creare/aggiornare job postings e pubblicarli; apply_enabled e apply_deadline gestiti in **job-posting-deadline.js** e UI.

### 6.5 Configurazione path (sito e portal)

1. **config.js** imposta BASE_PATH (es. /ItalianExperience), PORTAL_PATH, SITE_URL, SUPABASE_*; è la sola fonte di verità per i path in runtime JS.  
2. Portal: **router.js** deriva base path dalla pagina corrente, mappa listKey → nome file (candidates → candidates.html, ecc.), navigateTo per liste/dettaglio.  
3. Link pubblici (job, apply) costruiti con BASE_PATH (es. `/ItalianExperience/recruitment/jobs/?slug=...`).  
4. Static HTML può ancora avere path hardcoded; normalizzazione con placeholder (%%BASE_PATH%%) e script `replace-base-path.mjs` che produce output in `dist/`. Deploy di default è dalla root del repo (nessuno script); pubblicare da `dist/` è opzionale (README § Deploy). La cartella `dist/` è in .gitignore e non è in repo.

---

## 7. Riepilogo per Notion

- **Albero**: sezione 2.  
- **Cosa fa ogni file**: sezione 3 (tabelle per root, assets, partials, pagine pubbliche, portal HTML/core/features/runtime/queries/layout/shared/styles, scripts, docs).  
- **Supabase**: sezione 4 (tabelle, is_internal_staff, RLS, storage) e sezione 5 (Edge Functions: shared, prepare-external-application-upload, submit-external-application, promote-external-submission).  
- **Logica**: sezione 6 (candidatura pubblica, revisione submission, auth portal, job postings pubblici, path/base path).

Notion è la memoria ad alto livello: quando un trigger materiale si applica (o l’utente lo richiede), aggiorna le sezioni sopra in questo file e le pagine corrispondenti nello spazio audit su Notion. Non aggiornare per modifiche minori, UI/styling, typo, commenti, piccoli refactor. Vedi `docs/NOTION-SYNC-CONVENTIONS.md`.
