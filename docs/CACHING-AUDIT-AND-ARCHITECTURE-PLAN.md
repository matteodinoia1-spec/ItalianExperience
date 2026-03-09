# Caching Audit and Architecture Plan

**Document type:** Master reference plan (no implementation).  
**Scope:** Full project-wide caching audit; website vs portal separation; Supabase and shared runtime considerations; mobile/iOS web app behavior.  
**Constraint:** Execution to be done later in separate branches/tasks; this document is the tagged reference.

---

## A. Executive Summary

### Overall findings

- **Website:** Multiple pages (recruitment, travel, flavors, estates, contact, 404) fetch `partials/header.html` and `partials/footer.html` on every load with no reuse. Static assets (CSS/JS/images) rely on browser and CDN caching only; there is no application-level caching. The root `index.html` does not use partials (inline header/footer).
- **Portal:** All data flows through `portal/core/supabase.js` (window.IESupabase). There is no client-side caching of Supabase read results except: (1) session (one promise per load via `core/session-ready.js`), and (2) an in-memory cache for signed candidate photo URLs in `portal/core/lists-runtime.js` (`CANDIDATE_SIGNED_PHOTO_CACHE` keyed by storage path). List pages, entity details, dashboard, profile, and archived views each trigger fresh Supabase calls on every visit or open. Layout fragments (header, footer, bottom-nav) are fetched on every DOMContentLoaded via `portal/shared/header-loader.js` with no cache.

### Recommendation

- **Website:** Introduce lightweight, optional caching for partials and any future repeated fetches. Keep scope minimal to avoid mixing with portal logic.
- **Portal:** Introduce a structured client-side cache layer for Supabase reads (lists, entity details, metadata/lookups, signed URLs) with clear TTLs and invalidation on mutations. Keep layout fragment caching inside the portal only.

### Expected benefits

- Fewer redundant network requests (partials on website; list/detail/metadata and layout on portal).
- Faster repeat navigation and tab behavior (portal lists and entity details).
- Lower Supabase read usage and better performance on mobile/iOS web app where network and storage are constrained.
- Single reference plan to avoid ad-hoc caching scattered across many files.

### Major risks

- Stale data after create/update/archive/delete if invalidation is incomplete or wrong scope.
- Multi-tab inconsistency if cache is in-memory only and not keyed by user/session.
- Over-caching of sensitive or frequently changing data (e.g. activity logs, pipeline counts).
- Mixing website and portal cache logic, or placing portal cache in a path used by the website.

---

## B. Current Architecture Assessment

### Relevant current structure

- **Repo root (website):**
  - `index.html` – inline header/footer; no partial fetch.
  - `partials/header.html`, `partials/footer.html` – shared layout fragments.
  - `assets/css/`, `assets/js/`, `assets/img/` – static assets.
  - `recruitment/`, `travel/`, `flavors/`, `estates/`, `contact/`, `404.html` – pages that fetch partials then inject and load `assets/js/site.js`.
- **Portal (all under `portal/`):**
  - `core/supabase.js` – single Supabase client; all data API on `window.IESupabase`.
  - `core/session-ready.js` – single cached `getSession()` promise per load.
  - `core/auth.js`, `core/router.js`, `core/app-shell.js` – auth guard and shell.
  - `runtime/page-bootstrap.js` – orchestrates init; calls list/dashboard/profile inits.
  - `runtime/lists-runtime.js` – dashboard + list pages; uses `IESupabase.fetch*Paginated`, `createSignedCandidateUrl`; defines `CANDIDATE_SIGNED_PHOTO_CACHE` (in-memory, per list render).
  - `shared/header-loader.js` – fetches `layout/header.html`, `layout/footer.html`, `layout/bottom-nav.html` on DOMContentLoaded.
  - `queries/*.queries.js` – thin wrappers or direct Supabase (e.g. applications) for specific features.
  - `features/*` – candidate, profile, applications, archived; call IESupabase and IEQueries.

No shared folder is used by the website; `portal/shared/` is portal-only. Script load order and bootstrap are defined in `portal/docs/BOOTSTRAP-AND-SCRIPTS.md`.

### Current fetch / data-loading patterns

**Website:**

- **Partials:** Each of the listed pages runs a script that does `Promise.all([ fetch(partials/header.html), fetch(partials/footer.html) ])` then injects HTML and loads `site.js`. No caching; every full load = 2 requests.
- **Assets:** Referenced via `<link>` and `<script>`; caching is browser/CDN only.
- **No Supabase or API calls** from website code.

**Portal:**

- **Session:** `getSession()` wrapped by `session-ready.js`; first call performs fetch, subsequent calls in same load reuse the same promise.
- **Layout:** `header-loader.js` fetches three HTML fragments once per DOMContentLoaded (no cache across navigations if using full page loads).
- **Lists:** Each list page (candidates, job-offers, clients, applications) calls one or more of:
  - `fetchCandidatesPaginated`, `fetchJobOffersPaginated`, `fetchClientsPaginated`, `fetchApplicationsPaginated`
  - Sometimes preceded by dropdown data (e.g. clients list, job offers list) via `fetchClientsPaginated` / `fetchJobOffersPaginated` with high limit (500).
- **Entity detail:** `getCandidateById`, `getJobOfferById`, `getClientById`, and (via IEQueries or IESupabase) `getApplicationById` when opening detail/preview/modal. Same entity can be fetched multiple times in one session (e.g. list → modal → detail page).
- **Dashboard:** Multiple IESupabase calls: e.g. `getTotalCandidates`, `getActiveJobOffers`, `getNewCandidatesToday`, `getHiredThisMonth`, `getRecentCandidates`, `getCandidatesBySource`.
- **Profile:** `getProfile()`, `fetchMyActivityLogs()`, then batch fetches of candidates/job_offers/clients for activity entity names.
- **Archived:** `fetchCandidatesPaginated`, `fetchJobOffersPaginated`, `fetchApplicationsPaginated`, `fetchClientsPaginated` with archived filters; no reuse with main list caches.
- **Metadata/lookups:** `searchClientsByName`, `searchCandidatesByName`, `fetchCandidatesForJobOffer`, `fetchJobHistoryForCandidate` used in forms and dropdowns; can be called repeatedly for same inputs.
- **Signed URLs:** `createSignedCandidateUrl(path)` (default TTL 60s) used in lists-runtime (with per-table `CANDIDATE_SIGNED_PHOTO_CACHE`), candidate detail, modals, application detail, app-shell previews. Other call sites do not cache.

### Repeated reads / repeated network work

- **Website:** Repeated fetches of the same partials on every page load for all pages that use the pattern (no cross-page or in-session reuse).
- **Portal:** 
  - Same list data refetched when re-entering a list page (e.g. Dashboard → Candidates → back → Candidates).
  - Same entity (candidate/job offer/client/application) fetched again when opening modal then detail, or when multiple components request the same id.
  - Same dropdown data (clients, job offers) requested at high limit (500) in multiple places (lists-runtime, associations, etc.).
  - Profile and activity: getProfile and activity logs plus entity lookups on every profile page load.
  - Signed URLs: new `createSignedCandidateUrl` call per path in most call sites (except lists-runtime table which caches by path within that table).
  - Layout: header/footer/bottom-nav fetched again on every full page load (no fragment cache).

### Constraints from current architecture

- **Folder ownership:** Website lives at repo root and under `partials/`, `assets/`; portal lives entirely under `portal/` (core, runtime, features, shared, layout, queries). Cache logic must not blur this boundary.
- **Script order:** Portal protected pages depend on a fixed script order (BOOTSTRAP-AND-SCRIPTS.md). New cache layer must plug in without breaking that order (e.g. after supabase.js, before or alongside app-shell).
- **Single Supabase client:** All portal data goes through `window.IESupabase`. Caching should be introduced at a single layer (e.g. wrapper or module used by supabase.js or by callers) rather than scattered in every caller.
- **RLS and auth:** All Supabase access is post-auth on protected pages; cache keys must be session/user-aware where appropriate so one user never sees another’s data.
- **Mobile / iOS web app:** Portal is used as a web app on iOS; storage (e.g. localStorage/sessionStorage) can be evicted under storage pressure. Prefer in-memory cache with optional short-lived persistence and bounded size.

---

## C. Website Caching Plan

### What should be cached

- **Partials (header/footer):** The HTML of `partials/header.html` and `partials/footer.html` can be cached in memory (and optionally in sessionStorage with a short TTL) so that repeated loads or navigations within the same origin/session reuse them instead of refetching every time.
- **Future optional:** Any other static or rarely changing content fetched by the website (e.g. a shared config or menu JSON) could use the same small cache abstraction.

### What should not be cached

- **Root `index.html`:** It does not fetch partials; no change.
- **Portal layout or API:** Nothing under `portal/` or Supabase; website cache must not reference portal paths or APIs.
- **Opaque long-lived caches:** Avoid caching full HTML pages or user-specific content from an API on the website side; scope is only shared layout fragments and static-like assets.

### Recommended storage/mechanism per case

| What | Storage | Mechanism | Notes |
|------|---------|-----------|--------|
| Partials (header, footer) | In-memory + optional sessionStorage | Simple cache object keyed by URL (or path); TTL e.g. 5–15 minutes for sessionStorage if used | sessionStorage can be cleared by browser/iOS; in-memory survives only current tab. Prefer in-memory first; add sessionStorage as optional enhancement. |
| Future shared JSON/config | Same as partials | Same keyed cache, TTL by use case | Only if such fetches are introduced. |

### Proposed file/module locations for website caching

- **New file (website only):** `assets/js/partials-cache.js` (or similar name). Responsibility: fetch `partials/header.html` and `partials/footer.html` with a small cache (in-memory, optionally sessionStorage). Expose something like `getPartial(url)` or `loadPartials()` that returns cached HTML when valid.
- **Integration:** Pages that currently do `Promise.all([ fetch(header), fetch(footer) ])` would instead call this module (e.g. `loadPartials().then(([h,f]) => { ... })`). Script should be loaded before the inline script that injects partials (so it can be used from that inline script), or the inline script could be replaced by a small `assets/js/load-partials.js` that uses the cache and then loads `site.js`.
- **Location rule:** All website cache code must live under repo root assets or a website-only folder (e.g. `assets/js/`). No website cache logic in `portal/`.

### Impact on current website files

- **Files to touch:** Each page that currently fetches partials (e.g. `recruitment/index.html`, `travel/index.html`, `flavors/index.html`, `estates/index.html`, `contact/index.html`, `404.html`, and nested pages under recruitment, travel, flavors) would:
  - Include the new cache script (e.g. `assets/js/partials-cache.js`) before the inline partial-loading script, or
  - Replace the inline fetch with a call to the cache module.
- **No change:** `index.html` (root), `partials/header.html`, `partials/footer.html`, `assets/js/site.js` (except if we later add a single “load partials + site” entry point that uses the cache).

### Notes for future maintainability

- Keep website cache logic in one or two small files under `assets/js/` (or a dedicated website script folder at root). Do not add cache logic inside `portal/` for website use.
- Naming: use a clear prefix (e.g. `IEPartialsCache` or `websitePartialsCache`) and document that it is for the public website only.
- If new website pages are added that use partials, they should use the same cache module so behavior stays consistent.

---

## D. Portal Caching Plan

### What should be cached

- **List page results:** First page (and optionally a few pages) of `fetchCandidatesPaginated`, `fetchJobOffersPaginated`, `fetchClientsPaginated`, `fetchApplicationsPaginated` keyed by (entity type, filters, page, limit). Short TTL (e.g. 1–2 minutes) or invalidate on mutation.
- **Entity detail by id:** `getCandidateById`, `getJobOfferById`, `getClientById`, and application-by-id (via IEQueries or IESupabase) keyed by (entity type, id). Invalidate on update/archive/delete for that entity.
- **Metadata/lookups:** `searchClientsByName`, `searchCandidatesByName` (keyed by term + limit); `fetchCandidatesForJobOffer(offerId)`; `fetchJobHistoryForCandidate(candidateId)`. Short TTL (e.g. 2–5 minutes) or invalidate when related entities change.
- **Dropdown data:** Results of `fetchClientsPaginated({ archived: "active", limit: 500 })` and `fetchJobOffersPaginated({ filters: { archived: "active" }, limit: 500 })` used for dropdowns; keyed by a stable key (e.g. "clients-active", "job-offers-active"). Invalidate on client/job offer create/update/archive.
- **Signed URLs:** `createSignedCandidateUrl(path)` – already cached in lists-runtime per path; extend to a single portal-wide cache (same path → same URL until near expiry). TTL from Supabase is 60s by default; cache with slightly shorter effective TTL (e.g. 50s) to avoid serving expired URLs.
- **Layout fragments:** `layout/header.html`, `layout/footer.html`, `layout/bottom-nav.html` – cache in memory (and optionally sessionStorage) per load or session so that full page navigations within the portal reuse them.
- **Profile (optional, careful):** `getProfile()` result with very short TTL or invalidate on updateProfile; consider caching only for the same page load to avoid duplicate getProfile calls, rather than cross-navigation.

### What should not be cached (or only with very short TTL / no persistence)

- **Session / auth:** Already deduplicated by session-ready; do not cache session in a long-lived store that could leak across users.
- **Activity logs / pipeline counts:** `fetchMyActivityLogs`, `fetchEntityLogs`, `fetchLogs`, pipeline counts (e.g. getPipelineCounts) – highly dynamic; either no cache or TTL in the 30–60 second range if at all.
- **Dashboard aggregates:** `getTotalCandidates`, `getActiveJobOffers`, `getNewCandidatesToday`, `getHiredThisMonth`, `getRecentCandidates`, `getCandidatesBySource` – can be cached with short TTL (e.g. 1–2 min) and invalidated on candidate/job offer mutations; document as “best effort” freshness.
- **Create/update/delete responses:** Do not cache mutation responses as “source of truth” for list/detail; use them only to trigger invalidation and refetch when appropriate.

### Recommended storage/mechanism per case

| Data | Storage | Mechanism | TTL (suggested) |
|------|---------|-----------|------------------|
| List results (paginated) | In-memory | Key: entityType + serialized filters + page + limit | 60–120 s |
| Entity detail (by id) | In-memory | Key: entityType + id | Invalidate on update/archive/delete; optional TTL 120 s |
| Search/lookups (searchClientsByName, searchCandidatesByName) | In-memory | Key: "search" + entityType + term + limit | 120–300 s |
| fetchCandidatesForJobOffer, fetchJobHistoryForCandidate | In-memory | Key: "candidatesForOffer" + offerId; "jobHistory" + candidateId | 120 s; invalidate when associations change |
| Dropdown clients/job offers | In-memory | Key: "clients-active", "job-offers-active" | Invalidate on client/job offer mutations; optional TTL 120 s |
| Signed URLs (createSignedCandidateUrl) | In-memory | Key: path (storage path) | 50 s (below Supabase 60 s) |
| Layout fragments (header, footer, bottom-nav) | In-memory + optional sessionStorage | Key: fragment URL | Session or 15 min |
| Profile | In-memory only | Key: "profile" + userId (or session) | Same page load only or TTL 60 s; invalidate on updateProfile |
| Activity logs / pipeline counts | No cache or in-memory only | — | No cache preferred; if needed, 30 s max |
| Dashboard aggregates | In-memory | Key: "dashboard" or per-metric | 60–120 s; invalidate on mutations |

### TTL recommendations by data type

- **Lists (paginated):** 60–120 s.
- **Entity detail:** Invalidation-driven; optional TTL 120 s as safety.
- **Search / autocomplete:** 2–5 min.
- **Dropdown data (clients, job offers):** Invalidation-driven; optional TTL 2 min.
- **Signed URLs:** 50 s (under Supabase 60 s).
- **Layout fragments:** 15 min or session.
- **Profile:** Same-request dedup or 60 s; invalidate on update.
- **Dashboard:** 60–120 s.
- **Activity / pipeline:** No cache or ≤ 30 s.

### Invalidation strategy by entity/action

- **Candidate:** create → invalidate list caches (candidates), dashboard, "candidatesForOffer" for any job; update/archive/delete → invalidate that candidate’s detail cache, list caches, dashboard, jobHistory(candidateId), candidatesForOffer for linked jobs.
- **Job offer:** create/update/archive/delete → invalidate job offer list and detail, dashboard, "job-offers-active" dropdown, fetchCandidatesForJobOffer(that id), applications list if filtered by job.
- **Client:** create/update/archive/delete → invalidate clients list and detail, "clients-active" dropdown, job offers that reference client (or at least dropdown).
- **Application (candidate_job_associations):** create/update/delete → invalidate applications list, fetchCandidatesForJobOffer(jobOfferId), fetchJobHistoryForCandidate(candidateId), pipeline counts, dashboard if it shows application stats.
- **Profile:** updateProfile → invalidate profile cache.
- **Logout:** Clear all portal caches (and optionally sessionStorage if used).

### Impact on current portal files

- **core/supabase.js:** Either wrap the existing fetch/get functions with a cache layer (same file or a dedicated `portal/core/cache.js` that supabase.js uses), or introduce a thin `portal/core/supabase-cache.js` that wraps `window.IESupabase` and is used by runtimes/features. Prefer one central place so all callers benefit without editing every caller.
- **core/lists-runtime.js:** Use the central signed-URL cache instead of (or in addition to) `CANDIDATE_SIGNED_PHOTO_CACHE`; list data could be requested through the cache layer so that re-entering the same list with same filters returns cached result when valid. Invalidation on create/update/archive/delete must be triggered (e.g. from entity-actions-runtime or from supabase wrapper after mutations).
- **shared/header-loader.js:** Use a small layout-fragment cache (portal-only) so that header/footer/bottom-nav HTML is cached in memory (and optionally sessionStorage) keyed by fragment URL.
- **queries/*.queries.js:** If they call IESupabase, they automatically go through the cache if the cache wraps IESupabase; if they use supabase client directly (e.g. applications.queries.js), either route through IESupabase cached wrappers where they exist or add cached wrappers for those calls.
- **features/*, runtime/*:** Prefer not to add cache logic in each; rely on central cache so that getCandidateById, fetchCandidatesPaginated, etc. are cached transparently.

### Notes for mobile / iOS web app behavior

- **Storage:** iOS Safari and web view can evict localStorage/sessionStorage under pressure. Prefer in-memory cache as primary; use sessionStorage only for non-critical, short-lived data (e.g. layout fragments) and treat cache as best-effort.
- **Memory:** Cap cache size (e.g. max N list pages, M entity details, K signed URLs) and evict LRU or by TTL to avoid unbounded growth on long-lived tabs.
- **Signed URLs:** 60 s TTL is already short; in-memory cache with 50 s effective TTL is safe and reduces repeated storage API calls when scrolling lists or opening multiple candidate views.

### Notes for Supabase usage reduction

- Caching list and detail reads reduces repeated identical queries when users navigate list → detail → back or open the same entity in modal and then detail.
- Caching dropdown data (clients, job offers) avoids multiple 500-row fetches across pages.
- Caching signed URLs reduces calls to `storage.createSignedUrl` for the same path within the effective TTL.
- Invalidation on mutations keeps data fresh without over-fetching; focus invalidation on the minimal set of keys that are affected by each mutation.

---

## E. File/Folder Architecture Proposal

### Principle

- **Website cache logic:** Only under repo root, e.g. `assets/js/` (or a dedicated folder at root used only by the website). No dependency on `portal/`.
- **Portal cache logic:** Only under `portal/`, e.g. `portal/core/cache.js` or `portal/core/supabase-cache.js`, and optionally `portal/shared/layout-cache.js` for layout fragments. No dependency on website assets for cache implementation.
- **Shared utilities:** Do not create a shared “cache” module used by both website and portal; the two have different keys, TTLs, and invalidation rules. If a generic “cache with TTL” helper is desired, it can live in two minimal copies (one under assets/js, one under portal/core) to avoid a common root module that mixes concerns.

### Proposed layout

```
(Repo root – website)
  assets/js/
    partials-cache.js          # NEW: website partials cache (header/footer)
    site.js                   # unchanged
  partials/
    header.html, footer.html   # unchanged

portal/
  core/
    supabase.js               # unchanged or calls into cache layer
    cache.js                  # NEW: portal data cache (Supabase read wrapper, TTL, invalidation)
    session-ready.js          # unchanged
    ...
  shared/
    header-loader.js          # use layout fragment cache (portal-only)
    layout-cache.js           # NEW (optional): in-memory cache for layout/*.html
  runtime/
    lists-runtime.js          # use central signed-URL cache; optionally request list data via cache
    ...
```

- **portal/core/cache.js** (or `supabase-cache.js`): Holds cache state (in-memory maps/key-value with TTL and optional size cap). Exposes: get(key), set(key, value, ttl), invalidate(key), invalidatePattern(pattern), clear(). Supabase layer (or a wrapper in same file) uses these for list results, entity detail, search, dropdowns, signed URLs. Mutation functions in supabase.js (or the wrapper) call invalidate/clear as needed.
- **portal/shared/layout-cache.js** (optional): Simple in-memory (and optionally sessionStorage) cache for layout fragment HTML. header-loader.js calls this before fetch so that repeated loads reuse fragments.
- **assets/js/partials-cache.js**: Simple in-memory (and optionally sessionStorage) cache for partials/header.html and partials/footer.html; used only by website pages.

### What should stay isolated

- **Website:** Must not import or reference any file under `portal/` for caching. Must not contain Supabase or portal-specific cache keys.
- **Portal:** Must not import or reference website `assets/js/partials-cache.js` or any website-specific cache. Portal cache keys and invalidation must stay in portal code.
- **Shared:** Only non-cache shared logic (e.g. router, auth contract) remains shared; cache is not shared between website and portal.

### Minimal, scalable additions

- Prefer one portal cache module (core/cache.js) that owns all Supabase-related caching and invalidation, and one website cache module (partials-cache.js). Add layout-cache.js only if we want to reuse layout fragments across portal navigations. This keeps the blast radius small and makes it clear where to add new cache keys or TTLs later.

---

## F. Risk and Edge-Case Analysis

### Stale data risks

- **Lists:** If invalidation is missed after a mutation (e.g. create candidate but forget to invalidate candidates list), users see stale lists until TTL expires. Mitigation: centralize mutation paths and always call invalidation from the same place (e.g. after insertCandidate, updateCandidate, archiveCandidate).
- **Entity detail:** If detail is cached and another tab or user updates the same entity, this tab can show old data until TTL or invalidation. Mitigation: invalidate entity detail by id on any update/archive/delete; optional short TTL as backstop.
- **Dropdowns:** Stale clients/job offers in dropdowns after create/update/archive. Mitigation: invalidate "clients-active" and "job-offers-active" (and any other dropdown keys) on the corresponding mutations.

### Multi-tab behavior

- In-memory cache is per-tab. Two tabs do not share cache; each tab may refetch. That is acceptable and avoids cross-tab consistency bugs. If sessionStorage is used for layout or partials, tabs can share that; ensure keys are not user-sensitive or that they are session-scoped.

### Auth/session boundaries

- Cache keys must not allow one user to see another’s data. All Supabase reads are already RLS-scoped; cache keys should include something that ties to the current user (e.g. userId or session id) for list/detail/profile so that a logout + login as different user does not serve the previous user’s cached data. On logout, clear the entire portal cache.

### CRUD invalidation risks

- **Create:** Must invalidate list caches for the created entity type, dashboard, and any dropdown that would include the new entity.
- **Update:** Invalidate that entity’s detail cache and list caches (and dropdown if name/title etc. changed).
- **Archive/restore:** Same as update; also invalidate archived vs active list views and dropdowns (active/archived).
- **Delete (hard delete):** Invalidate list, detail, dashboard, and any association-based caches (e.g. candidatesForJobOffer, jobHistory).

### Archived views

- Archived and active lists use different filters; cache keys must include the filter set (e.g. archived: "active" vs "archived") so that switching between “Active” and “Archived” does not return the wrong dataset. Invalidation on archive/unarchive must invalidate both active and archived list caches for that entity type.

### Mobile storage caveats

- iOS can clear sessionStorage/localStorage; do not rely on persistent cache for correctness. Use in-memory as source of truth; persistence is optional for performance only.
- Bounded cache size and TTL-based eviction avoid unbounded memory growth on long sessions.

### Other

- **Pipeline counts / activity:** If these are ever cached with a short TTL, ensure they are clearly best-effort and that critical flows (e.g. application status change) invalidate or bypass cache where needed.
- **Signed URL expiry:** Supabase returns 60s TTL; cache with effective TTL &lt; 60s so we never serve an expired URL.

---

## G. Recommended Implementation Roadmap

### Phase 1: Portal cache module and signed-URL unification (low risk)

- Add `portal/core/cache.js` with in-memory TTL cache and size cap (e.g. LRU).
- Implement a single signed-URL cache (keyed by path, TTL 50s) in this module; use it from supabase.js’s `createSignedCandidateUrl` (or a wrapper) and from lists-runtime instead of `CANDIDATE_SIGNED_PHOTO_CACHE`.
- Wire lists-runtime to use the central signed-URL cache; remove or reduce the local `CANDIDATE_SIGNED_PHOTO_CACHE` to avoid duplicate logic.
- **Test:** Portal list pages (candidates, job offers) with photos; candidate detail and modals; confirm no duplicate signed URL calls for same path within 50s.

### Phase 2: Portal list and entity-detail caching (medium risk)

- In cache.js (or supabase wrapper), add cache for: fetchCandidatesPaginated, fetchJobOffersPaginated, fetchClientsPaginated, fetchApplicationsPaginated (key: entity + filters + page + limit); getCandidateById, getJobOfferById, getClientById, getApplicationById (key: entity + id). Use TTLs from section D.
- Ensure cache keys include user/session so logout clears or keys are user-scoped.
- After mutations (insert/update/archive/delete), call invalidation for the affected keys (lists, entity detail, dropdowns as needed).
- **Test:** Create/update/archive candidate and job offer; confirm lists and detail refresh correctly and that archived vs active views stay correct.

### Phase 3: Portal dropdown and lookup caching (medium risk)

- Cache dropdown data: clients list (active), job offers list (active) with invalidation on client/job offer mutations.
- Cache searchClientsByName, searchCandidatesByName, fetchCandidatesForJobOffer, fetchJobHistoryForCandidate with short TTL; invalidate on association/entity changes.
- **Test:** Add candidate, add job offer, link candidate to job; confirm dropdowns and lookups update after mutations and that search/lookup results are fresh enough.

### Phase 4: Portal layout fragment cache (low risk)

- Add `portal/shared/layout-cache.js` (or equivalent) for layout/header.html, footer.html, bottom-nav.html.
- Update header-loader.js to check cache before fetch and to store result in cache after fetch.
- **Test:** Navigate between portal pages (full page load); confirm layout fragments are not refetched when cache is valid.

### Phase 5: Dashboard and profile (optional, lower priority)

- Optionally cache dashboard aggregates and getProfile with short TTL and invalidate on mutations.
- **Test:** Dashboard and profile page; confirm numbers and profile update after relevant mutations and TTL.

### Phase 6: Website partials cache (low risk, independent)

- Add `assets/js/partials-cache.js` with in-memory (and optional sessionStorage) cache for partials/header.html and partials/footer.html.
- Update each website page that currently fetches partials to use this module (e.g. loadPartials().then(...)).
- **Test:** Load recruitment, travel, flavors, contact, estates, 404; navigate or reload; confirm partials are served from cache when valid and that site.js and layout still work.

Each phase should be done in a separate branch/task, with tests and a quick manual check of the main flows (list, detail, create, update, archive, logout, website partials) before merging.

---

## H. Documentation Update Plan

### Documents to update (later, when implementing)

| Document | Location | What to add |
|----------|----------|-------------|
| Portal bootstrap and scripts | `portal/docs/BOOTSTRAP-AND-SCRIPTS.md` | Add cache script to the required script list (e.g. after supabase.js or as part of core). Describe that list/detail/layout caching is used and that logout clears cache. |
| Portal architecture | `portal/docs/PORTAL-FRONTEND-ARCHITECTURE-AUDIT.md` (or equivalent) | Add a short “Caching” section: where cache lives (core/cache.js), what is cached (lists, entity detail, signed URLs, layout), TTLs, invalidation on mutations, and that cache is portal-only. |
| New: Portal caching | `portal/docs/CACHING.md` (new) | Single reference for portal cache: keys, TTLs, invalidation matrix, multi-tab and logout behavior, mobile considerations. |
| New: Website partials cache | Root or `docs/WEBSITE-PARTIALS-CACHE.md` (new) | Where the script lives, how pages use it, that it is website-only and has no dependency on portal. |

### Separation of docs

- **Website:** Any doc about partials cache or website-only caching should live at repo root `docs/` or be linked from README; it must not live under `portal/docs/`.
- **Portal:** All cache behavior for Supabase, layout, and signed URLs should be documented under `portal/docs/` (BOOTSTRAP, architecture, and the new CACHING.md).

---

## References (actual project paths)

- **Website partials usage:** `recruitment/index.html`, `travel/index.html`, `flavors/index.html`, `estates/index.html`, `contact/index.html`, `404.html`, and nested pages under recruitment, travel, flavors (e.g. `recruitment/candidate/index.html`, `travel/gapyear/index.html`) – all use `fetch(base + "/partials/header.html")` and `fetch(base + "/partials/footer.html")` then inject and load `site.js`.
- **Portal bootstrap:** `portal/docs/BOOTSTRAP-AND-SCRIPTS.md`; script order and `runtime/page-bootstrap.js`, `core/app-shell.js`.
- **Portal data layer:** `portal/core/supabase.js` (window.IESupabase); `portal/core/session-ready.js`; `portal/queries/*.queries.js`; `portal/core/lists-runtime.js` (CANDIDATE_SIGNED_PHOTO_CACHE at ~line 660, resolveCandidatePhoto ~853).
- **Portal layout loader:** `portal/shared/header-loader.js` – fetches `layout/header.html`, `layout/footer.html`, `layout/bottom-nav.html`.
- **Signed URL implementation:** `portal/core/supabase.js` – `createSignedCandidateUrl(path, expiresInSeconds)` default 60s; storage bucket `candidate-files`.
