# Portal Security Audit Report

**Date:** 2025-03-05  
**Scope:** Portal application (client-side, Supabase auth + RLS)  
**Constraint:** Audit only; no code was modified.

---

## Executive summary

The portal uses a single auth guard in the app shell for most protected pages, delegates authorization to Supabase RLS, and implements a 30-minute inactivity logout. Several findings require attention: the candidate detail page is not in the protected-pages list (defense-in-depth gap), the profile page does not re-validate auth before loading data, console logging of identifiers, and full reliance on RLS for data protection (no service_role or secrets in frontend).

---

## 1. AUTHENTICATION GUARDS

### 1.1 Mechanism

- **Protected pages** are determined in `portal/core/app-shell.js` via `PROTECTED_PAGES` and `getCurrentPageKey()`.
- For any page whose key is in `PROTECTED_PAGES`, a promise `window.__IE_AUTH_GUARD__` is set that:
  - Calls `ensureSupabaseSessionReady()` then `window.IEAuth.checkAuth()` (which uses `IESupabase.requireAuth()` / `enforceAuthGuard()`).
  - Uses `supabase.auth.getSession()`; if there is no session, redirects to `index.html` (login) via `window.location.replace(base + "index.html")`.
  - Only on success sets `document.body.style.visibility = "visible"` and resolves to `true`.
- On `DOMContentLoaded`, the app shell **awaits** `__IE_AUTH_GUARD__` before running `loadCurrentUserProfile()`, `initInactivityTimer()`, and `ensureSidebarLoaded().then(..., initDataViews, ...)`. So **no Supabase data loading runs before session validation** for pages that use this guard.

### 1.2 Pages checked

| Page / key        | In PROTECTED_PAGES? | Auth enforcement | Notes |
|-------------------|----------------------|------------------|--------|
| dashboard.html    | Yes (dashboard)      | Guard runs first | OK    |
| candidates.html   | Yes (candidates)     | Guard runs first | OK    |
| candidate.html    | **No** (candidate)    | candidate.js only| See finding below |
| clients.html      | Yes (clients)        | Guard runs first | OK    |
| job-offers.html   | Yes (job-offers)     | Guard runs first | OK    |
| profile.html      | Yes (profile)        | Guard runs first | Profile script does not re-check auth (see below) |

### 1.3 Findings

| # | Severity | Finding | File:Line | Recommendation |
|---|----------|---------|-----------|----------------|
| 1.1 | **Medium** | **Candidate detail page (`candidate.html`) is not in `PROTECTED_PAGES`.** For this page, `__IE_AUTH_GUARD__` is `Promise.resolve(true)`, so the app shell does not run any auth check. Protection relies solely on `features/candidates/candidate.js`: `initCandidateProfilePage()` calls `IESupabase.requireAuth()` before `loadCandidatePage()`. If that script failed to load or was bypassed, the page could be shown without auth. | `portal/core/app-shell.js` (PROTECTED_PAGES ~15–28, getCurrentPageKey ~578–579) | Add `"candidate"` to `PROTECTED_PAGES` so the app shell also enforces auth for the candidate detail page (defense in depth). |
| 1.2 | **Low** | **Profile page does not re-validate auth.** `features/profile/profile.js` uses `requireAuthAndLoadProfile()` which only calls `api.getProfile()` and does not call `requireAuth()` or `redirectToLogin()`. Unauthenticated users would get empty profile data if they ever reached the page. The page is protected by the app-shell guard; this is a defense-in-depth gap. | `portal/features/profile/profile.js` (76–93) | In `requireAuthAndLoadProfile()`, call `await window.IESupabase.requireAuth()` (or `IEAuth.checkAuth()`) first; if it returns undefined, return without loading profile. |

### 1.4 Direct URL access

- **Protected pages (dashboard, candidates, clients, job-offers, profile, add-*, archived, settings):** Opening the URL directly runs the guard on load; unauthenticated users are redirected to `index.html` before any data is loaded. **OK.**
- **Candidate detail (`candidate.html`):** Same outcome in practice, but only because `candidate.js` runs its own `requireAuth()`; the app shell does not enforce auth for this key.

---

## 2. SUPABASE DATA ACCESS

### 2.1 Files inspected

- **portal/core/supabase.js** – All Supabase queries and auth live here.
- **portal/core/app-shell.js**, **portal/core/lists-runtime.js**, **portal/features/candidates/candidate.js**, **portal/features/profile/profile.js**, **portal/features/archived/archived.js** – Consume `window.IESupabase` only (no direct Supabase client or raw queries).

There are **no** separate files `portal/app.js`, `portal/job-offers.js`, or `portal/clients.js` in the repo; list and dashboard logic is in `app-shell.js` and `lists-runtime.js`, and all data access goes through `supabase.js`.

### 2.2 Query behaviour

- **After authentication:** Data loading (dashboard, candidates, job offers, clients, profile, candidate detail, archived) is triggered only from code paths that run **after** the auth guard (or, for candidate.html, after `candidate.js`’s `requireAuth()`). So in normal flow, **queries run only when the user is authenticated.**
- **RLS / auth.uid():** The client uses a single Supabase client created with the publishable (anon) key. All table access (select/insert/update/delete) is subject to RLS. The code does not pass “current user id” from the client for authorization; it uses session-derived identity where needed (e.g. `getCurrentUserId()`, `withUpdateAuditFields()` for `updated_by`). Entity IDs (candidate id, job offer id, client id) come from the URL or UI and are used only to identify which row to show or update; **authorization is intended to be enforced by RLS (e.g. using `auth.uid()`).**
- **No user IDs trusted from client for “act as”:** `created_by` / `updated_by` and similar are taken from the session (e.g. `withUpdateAuditFields()`), not from request parameters. **OK.**
- **No service_role or admin on frontend:** Only one key is used (see Section 4). **OK.**

### 2.3 Findings

| # | Severity | Finding | File:Line | Recommendation |
|---|----------|---------|-----------|----------------|
| 2.1 | **Info** | Some functions (e.g. `getCandidateById(id)`, `fetchCandidatesPaginated`, `getJobOfferById`, `getClientById`) do not explicitly call `getSession()` before querying; they rely on the Supabase client’s session and RLS. This is acceptable as long as the UI only calls them after the guard; RLS must enforce access. | `portal/core/supabase.js` (multiple) | Ensure RLS policies for all tables use `auth.uid()` (or equivalent) and that no policy grants anon read/write. |

---

## 3. ROW LEVEL SECURITY DEPENDENCY

### 3.1 Conclusion

The application **fully relies on Supabase RLS** for data protection. The frontend uses only the anon key and does not implement its own per-row authorization; it assumes RLS restricts rows by `auth.uid()` (or similar).

### 3.2 Tables / queries that would expose data if RLS were misconfigured

If RLS were disabled or too permissive (e.g. allowing anon or any authenticated user to read all rows), the following tables are queried from the client and would be at risk:

- **profiles** – id, email, first_name, last_name, role, etc.
- **candidates** – full candidate data and relations
- **job_offers** – full job offer data
- **clients** – full client data
- **candidate_job_associations**
- **activity_logs**
- **candidate-files** (storage/table if applicable)
- **candidate_skills**, **candidate_languages**, **candidate_experience**, **candidate_education**, **candidate_certifications**, **candidate_hobbies**

Any query in `portal/core/supabase.js` that uses `.from("<table>")` is in scope. No RLS policy definitions were found in the repository (no `.sql` files with `auth.uid()` in the audited tree); policies must be reviewed and maintained in the Supabase project.

### 3.3 RLS safety validation – tables that must use RLS

The following tables **must** have RLS enabled and policies that restrict access using `auth.uid()` (or equivalent). The portal does not implement per-row authorization in the frontend; security depends entirely on RLS.

| Table | Purpose |
|-------|---------|
| **profiles** | User profile (id, email, first_name, last_name, role). |
| **candidates** | Candidate records and relations. |
| **clients** | Client records. |
| **job_offers** | Job offer records. |
| **candidate_job_associations** | Links candidates to job offers. |
| **activity_logs** | Audit/activity entries. |
| **candidate_files** | Candidate file references (if used). |
| **candidate_skills** | Candidate skills (if used). |
| **candidate_languages** | Candidate languages (if used). |
| **candidate_experience** | Candidate experience (if used). |
| **candidate_education** | Candidate education (if used). |
| **candidate_certifications** | Candidate certifications (if used). |
| **candidate_hobbies** | Candidate hobbies (if used). |

Comments in `portal/core/supabase.js` remind developers that RLS is mandatory and that no queries should run before authentication.

---

## 4. PUBLIC KEY EXPOSURE

### 4.1 Verification

- **Single key in frontend:** `portal/core/supabase.js` (lines 30–32) sets:
  - `supabaseUrl = "https://xgioojjmrjcurajgirpa.supabase.co".trim()`
  - `supabaseKey = "sb_publishable_36r1oFbqjUoktzPTCvxDWg_sSwhxhzM"`
  - `supabase = window.supabase.createClient(supabaseUrl, supabaseKey)`
- **Naming:** The key is explicitly documented as publishable (anon) in comments; the variable name and comment state only the publishable key is used and that RLS must be configured.
- **No service_role:** Grep for `service_role`, `SUPABASE_SERVICE`, and similar found no usage in the portal; only this single key is used.
- **No other secrets:** No other credentials or secrets were found in the portal JS/HTML; no env vars are read in the frontend for Supabase.

### 4.2 Findings

| # | Severity | Finding | File:Line | Recommendation |
|---|----------|---------|-----------|----------------|
| 4.1 | **Info** | Supabase URL and anon key are hardcoded in `core/supabase.js`. This is normal for a public client; security is intended to come from RLS and auth. | `portal/core/supabase.js` (30–32) | Optional: move URL/key to a small config or build-time env (e.g. for multi-environment) without introducing server-side secrets in the same file. |

---

## 5. DIRECT API ACCESS TEST (SIMULATION)

### 5.1 Scenario

An attacker has the portal HTML and the Supabase anon key (both visible in the frontend).

### 5.2 Analysis

- Requests to Supabase (REST/PostgREST) using only the anon key and **no** JWT (or an invalid/expired JWT) result in `auth.uid()` being `null` in RLS.
- If RLS policies require `auth.uid()` to be set and to match row ownership (e.g. `created_by = auth.uid()` or equivalent), unauthenticated direct API calls would get no rows or 403-style errors.
- **Vulnerability exists only if**:
  - Some policy allows `anon` or allows any authenticated user to read/write all rows, or
  - A policy uses only client-supplied parameters (e.g. a user id from the request) instead of `auth.uid()`.

The **frontend** does not introduce a direct-API vulnerability: it uses the anon key as designed and does not send secrets. Security depends entirely on **backend RLS**.

### 5.3 Summary

| # | Severity | Finding | Recommendation |
|---|----------|---------|----------------|
| 5.1 | **Info** | With the anon key alone, “vulnerable” tables are exactly those listed in Section 3.2, and only if their RLS policies are misconfigured. | Ensure every table used by the portal has RLS enabled and policies that restrict access using `auth.uid()` (or equivalent). No frontend code change required for this. |

---

## 6. SESSION INACTIVITY AUTO LOGOUT

### 6.1 Implementation

- **Timeout:** `portal/core/session/session.js` defines `INACTIVITY_LOGOUT_MS = 30 * 60 * 1000` (30 minutes). **OK.**
- **Warning:** `INACTIVITY_WARNING_BEFORE_MS = 1 * 60 * 1000` (1 minute before logout); a banner is shown (Italian: “Sarai disconnesso tra 1 minuto per inattività”) with a “Resta connesso” button that resets the timer.
- **Activity:** Timers are reset on:
  - `mousemove` (throttled with `INACTIVITY_THROTTLE_MS = 1000`)
  - `scroll`
  - `click`
  - `keydown`
- **Logout:** `performLogout()` clears timers, calls `window.IEAuth.logout()` (which calls `IESupabase.logout()` → `supabase.auth.signOut()`), then `redirectToLogin()`.
- **When it runs:** `initInactivityTimer()` is invoked from `portal/core/app-shell.js` only on `DOMContentLoaded` and only when `isProtectedPage` is true, after the auth guard has been awaited. So it runs only on protected pages after a successful auth check.

### 6.2 Findings

| # | Severity | Finding | File:Line | Recommendation |
|---|----------|---------|-----------|----------------|
| 6.1 | **None** | Inactivity logout is implemented; duration is 30 minutes; timer resets on activity; logout calls `signOut()` and redirects to login. | `portal/core/session/session.js` (full file); `portal/core/app-shell.js` (~126, ~722–728) | None. |

---

## 7. DATA LEAK CHECK

### 7.1 HTML templates

- No sensitive data found in static HTML (placeholders like “—”, generic labels). **OK.**

### 7.2 Console logs

- **portal/index.html:** `console.log('[Login] Tentativo di login per:', email)` – logs email on login attempt.
- **portal/core/supabase.js:** Logs on login/session restore (e.g. user id), profile create/load, `fetchMyCandidates` (user id), insertCandidate/insertJobOffer/insertClient/linkCandidateToJob (user id or entity ids), and generic “Success” messages.
- **portal/core/app-shell.js:** `console.log("[Profile] Loaded profile:", IE_CURRENT_PROFILE)` – can include profile object.
- **portal/core/lists-runtime.js:** `console.log("[ItalianExperience] fetchClientsPaginated result:", result)` – can include list data.
- **portal/features/archived/archived.js:** `console.log("ARCHIVED JS ACTIVE - VERSION 1");` and success message.

| # | Severity | Finding | File:Line | Recommendation |
|---|----------|---------|-----------|----------------|
| 7.1 | **Low** | Console logs can expose user ids, email (on login), profile data, and list results. Risk is limited to environments where the console is available (e.g. dev tools). | Multiple (see above) | Remove or guard logs in production (e.g. no email/user id in logs, or disable verbose logging in prod). |

### 7.3 localStorage / sessionStorage

- No use of `localStorage` or `sessionStorage` in the portal. **OK.**

### 7.4 Network requests before authentication

- On protected pages, the auth guard runs and redirects before any data-loading code runs; no Supabase data requests are initiated before session validation. **OK.**
- Login page (`index.html`) only calls `login()` and `redirectToDashboardIfAuthenticated()`; no sensitive data queries before auth. **OK.**

---

## 8. SECURITY REPORT SUMMARY

### 8.1 Vulnerabilities and issues

| ID   | Severity | Short description | File(s) | Recommended fix |
|------|----------|-------------------|---------|------------------|
| 1.1  | **Medium** | Candidate detail page not in `PROTECTED_PAGES`; guard only in candidate.js | `portal/core/app-shell.js` | Add `"candidate"` to `PROTECTED_PAGES`. |
| 1.2  | **Low**   | Profile page does not call `requireAuth()` before loading profile | `portal/features/profile/profile.js` | Call `requireAuth()` (or `checkAuth()`) at start of `requireAuthAndLoadProfile()` and abort if not authenticated. |
| 2.1  | **Info**  | Some Supabase helpers rely on RLS without an explicit session check in the same function | `portal/core/supabase.js` | Rely on RLS; ensure all policies use `auth.uid()` and that UI only calls after guard. |
| 4.1  | **Info**  | Supabase URL and anon key hardcoded | `portal/core/supabase.js` | Optional: externalise to config/env for different environments. |
| 5.1  | **Info**  | Direct API access depends entirely on RLS | Backend (Supabase) | Verify and maintain RLS on all portal tables. |
| 7.1  | **Low**   | Console logs may expose email, user id, profile, list data | index.html, supabase.js, app-shell.js, lists-runtime.js, archived.js | Remove or restrict verbose logging in production. |

### 8.2 Positive findings

- Only the Supabase anon (publishable) key is used; no service_role or secrets in frontend.
- Protected pages (except candidate detail) use a single guard that runs before any data load.
- No Supabase queries run before session validation on guarded pages.
- Entity IDs from the client are used only to identify records; authorization is delegated to RLS; no “act as user” from client input.
- 30-minute inactivity logout is implemented with activity reset and proper `signOut()` + redirect.
- No use of localStorage/sessionStorage; no sensitive data in HTML templates; no data requests before auth on the normal flow.

### 8.3 Severity legend

- **High:** Immediate risk of unauthorized access or data breach.
- **Medium:** Weaker defense in depth or bypass path under certain conditions.
- **Low:** Minor improvement (e.g. logging, extra check).
- **Info:** Best practice or documentation (e.g. RLS, config).

---

## 9. SECURITY HARDENING ACTIONS (POST-AUDIT)

*Applied after the initial audit to raise the portal security level from "good" to "exceptional" without changing database schema, Supabase keys, or business logic.*

### 9.1 Fixes applied

| Area | Action |
|------|--------|
| **Protected page coverage** | Added `"candidate"` to `PROTECTED_PAGES` in `app-shell.js`. All pages requiring auth (candidate, dashboard, candidates, clients, job-offers, profile, etc.) are now guarded. The global auth guard runs before `initDataViews()`, list rendering, and any Supabase queries. |
| **Defense in depth** | Secondary auth check (`await IEAuth.checkAuth()` / `requireAuth()`) added in: (1) `profile.js` at start of `requireAuthAndLoadProfile()`; (2) app-shell `ensureSidebarLoaded().then()` and `.catch()` before `initDataViews()` for all protected pages (covers job-offers, clients, dashboard, candidates). Candidate detail page already had `requireAuth()` in `candidate.js` before loading data. |
| **Sensitive console logging** | Introduced `portal/core/debug.js` with `window.debugLog()` that only logs when `window.__IE_ENV__ === "development"`. Replaced or guarded all console logs that could expose user id, email, profile objects, Supabase responses, or query results in: `index.html`, `supabase.js`, `app-shell.js`, `lists-runtime.js`, `archived.js`. Production builds do not set `__IE_ENV__` to development, so sensitive logs are not exposed. |
| **Session protection** | (1) Inactivity timer: ensured 30-minute timeout, timer reset on activity (mousemove, scroll, click, keydown), warning 1 minute before logout, "Resta connesso" button resets timer. (2) `IEAuth.logout()` calls Supabase `signOut()` and redirect to login. (3) Session listeners attached once per page via `window.__IE_INACTIVITY_INIT__` guard in `session.js`. (4) Logout clears runtime state: `window.IEPortal.clearSessionState()` clears `IE_CURRENT_PROFILE` and `__IE_AUTH_USER__`; called from both the sidebar logout link and from inactivity `performLogout()` before redirect. |
| **API access** | Confirmed no Supabase data queries run before authentication (guard and defense-in-depth checks). No filters depend on client-supplied user ids; all access relies on RLS and `auth.uid()`. Added security comments in `supabase.js` stating that RLS is mandatory and that queries must not run before auth. |
| **RLS safety** | Documented in this report (Section 3.3) the list of tables that must use RLS: profiles, candidates, clients, job_offers, candidate_job_associations, activity_logs, candidate_files, candidate_skills, candidate_languages, candidate_experience, candidate_education, candidate_certifications, candidate_hobbies. Added comments in `supabase.js` warning that RLS is mandatory for security. |
| **Frontend data leak** | Audited: no sensitive data in `localStorage` or `sessionStorage`; no Supabase requests before auth; HTML templates contain no sensitive data. `debug.js` ensures production logs do not expose sensitive data. |

### 9.2 Improved protections

- **Dual-layer auth:** Shell guard plus page-level `requireAuth()` on profile and before any data views (dashboard, candidates, job-offers, clients, candidate detail).
- **No sensitive logs in production:** `debugLog()` is the single development-only logging path for any message that could include identifiers or data.
- **Clean logout:** Session tokens cleared via Supabase `signOut()`; in-memory profile and auth user reference cleared before redirect.
- **Single inactivity init:** Prevents duplicate event listeners and timer confusion.

### 9.3 Final security posture

- **Authentication:** All protected pages (including candidate detail) are in `PROTECTED_PAGES` and run the global auth guard before any data or UI. Critical controllers re-validate auth before loading data.
- **Session:** 30-minute inactivity logout with warning and state cleanup; listeners attached once.
- **Data access:** All Supabase access is after auth; RLS is the sole authority for row-level access; frontend does not send or trust user ids for authorization.
- **Observability:** No user id, email, profile, or query results in production console output.
- **Documentation:** RLS table list and mandatory-RLS comments in code and in this report.

*End of report. Section 9 added after security hardening implementation.*
