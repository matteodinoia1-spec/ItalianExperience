# Base path audit: `/ItalianExperience` references

**Date:** 2025-03-14  
**Scope:** Full repository audit of all `/ItalianExperience` and related `ItalianExperience` references.  
**Goal:** Inventory, classify, and plan phased removal of the hardcoded base path—**no implementation** in this document.

---

## A. Full inventory

Every reference is listed by **file path**, **exact reference**, **category**, **owner/system**, **risk level**, **rationale**, and **recommended replacement strategy**.

### A.1 Path references (href, src, url(), config, scripts)

These affect runtime URLs or build/tooling behavior. **Zoho form action URLs** that contain `form/ItalianExperience/formperma/...` are **external form identifiers** (Zoho’s form name); do **not** change them as part of base-path migration—they would break form submission.

| # | File path | Exact reference | Category | Owner | Risk | Why risky / not | Replacement strategy |
|---|-----------|------------------|----------|-------|------|------------------|------------------------|
| 1 | `assets/js/config.js` | `BASE_PATH: '/ItalianExperience'`, `PORTAL_PATH: '/ItalianExperience'` | runtime JS | shared | **high** | Single source of truth for paths; all JS depends on it. | Keep as default; allow override via inline script or build inject. For root deploy use `''` or `'/'`. |
| 2 | `scripts/add-image-dimensions.mjs` | `src.startsWith('/ItalianExperience/')`, `src.replace(/^\/ItalianExperience\//, '')` | tooling | shared | **medium** | Script assumes repo paths; if HTML uses relative or placeholder, script must accept same convention. | Use same base as HTML (e.g. from env or detect from first `src` in HTML). Support both `/ItalianExperience/` and `/` (or `%%BASE_PATH%%` stripped). |
| 3 | `scripts/check-links.mjs` | `clean.replace('/ItalianExperience/', '/')`, `clean === '/ItalianExperience'` | tooling | shared | **medium** | Normalizes links for resolution; must match how HTML paths are written after migration. | Normalize using configured base (env/build) or support both base and root. |
| 4 | `partials/header.html` | 29× `href="/ItalianExperience/..."` | live HTML | site | **high** | Injected into every page; wrong path breaks all nav. | Replace with `%%BASE_PATH%%` (build) or relative from partial location; or inject via JS from `IEConfig.BASE_PATH`. |
| 5 | `partials/footer.html` | 2× `href="/ItalianExperience/..."` | live HTML | site | **high** | Same as header. | Same as header. |
| 6 | `partials/cookie-banner.html` | `href="/ItalianExperience/privacy/"` | live HTML | site | **high** | Same as header. | Same as header. |
| 7 | `index.html` | 32× links, styles, scripts, images `/ItalianExperience/...` | live HTML | site | **high** | Homepage; wrong paths break assets and nav. | Placeholder or relative; must align with deploy base. |
| 8 | `404.html` | 8× CSS, JS, img, home link | live HTML | site | **high** | Error page; must resolve assets and home link. | Same as index. |
| 9 | `contact/index.html` | 8× CSS, JS, forms, assets | live HTML | site | **high** | Contact page. | Same as index. |
| 10 | `privacy/index.html` | 7× CSS, JS, contact link in text | live HTML | site | **high** | Privacy page. | Same as index. |
| 11 | `estates/index.html` | 9× CSS, JS, img, form action | live HTML | site | **high** | Estates section. | Same as index. Form action is Zoho—do not change. |
| 12 | `flavors/index.html` | 13× CSS, JS, img, section links | live HTML | site | **high** | Flavors hub. | Same as index. |
| 13 | `flavors/for-your-home/index.html` | 9× CSS, JS, img, home/contact links | live HTML | site | **high** | Flavors subpage. | Same as index. |
| 14 | `flavors/for-your-business/index.html` | 14× CSS, JS, img, form | live HTML | site | **high** | Flavors subpage. | Same as index. Zoho action—do not change. |
| 15 | `flavors/aziende-italiane/index.html` | 9× CSS, JS, img, form | live HTML | site | **high** | Flavors subpage. | Same as index. Zoho—do not change. |
| 16 | `recruitment/index.html` | 11× CSS, JS, img, employer/candidate links | live HTML | site | **high** | Recruitment hub. | Same as index. |
| 17 | `recruitment/employer/index.html` | 24× CSS, JS, img, form | live HTML | site | **high** | Employer page. | Same as index. Zoho—do not change. |
| 18 | `recruitment/candidate/index.html` | 12× CSS, JS, img, form; **og:image/twitter:image** `https://italianexperience.github.io/ItalianExperience/...` | live HTML | site | **high** | Candidate hub; meta tags use GitHub Pages base. | Same as index for paths; og/twitter should use `SITE_URL` + path or config. |
| 19 | `recruitment/candidate/apply/index.html` | 7× CSS, JS, privacy link | live HTML | portal/site boundary | **high** | Apply page; shared assets and privacy link. | Same as index; ensure portal and site base stay consistent. |
| 20 | `recruitment/jobs/index.html` | 7× CSS, JS + comment "support both root and /ItalianExperience" | live HTML | site | **high** | Public jobs list; relies on IEConfig for apply URLs. | Same as index; JS already uses IEConfig.BASE_PATH. |
| 21 | `travel/index.html` | 17× CSS, JS, img, travel section links | live HTML | site | **high** | Travel hub. | Same as index. |
| 22 | `travel/gapyear/index.html` | 5× CSS, JS, img (rest in srcset) | live HTML | site | **high** | Gap year page. | Same as index. |
| 23 | `travel/culinary/index.html` | 17× CSS, JS, img, contact, form | live HTML | site | **high** | Culinary page. | Same as index. Zoho—do not change. |
| 24 | `travel/bespoke/index.html` | 24× CSS, JS, img, form | live HTML | site | **high** | Bespoke travel page. | Same as index. Zoho—do not change. |
| 25 | `archive/site/assets-img-stage1/index.html` | 14× CSS, img | archive | archive | **low** | Archived copy; not served in production. | Optional: same placeholder strategy for consistency; or leave as-is. |
| 26 | `archive/site/assets-img-stage1/travel/gapyear/index.html` | 17× + `const base = "/ItalianExperience"` in script | archive | archive | **low** | Archived; has inline base. | Optional: leave or align to placeholder. |
| 27 | `archive/site/assets-img-stage1/travel/bespoke/index.html` | 11× + `const base = "/ItalianExperience"` | archive | archive | **low** | Archived. | Same as above. |

### A.2 Runtime JS that already use IEConfig (no path literal)

These **do not** hardcode `/ItalianExperience` in URL construction; they use `IEConfig.BASE_PATH` or `IEConfig.PORTAL_PATH` and only **log** with the `[ItalianExperience]` prefix. **No path migration needed** for URL behavior; log prefix is branding only.

| File | Reference type | Category | Owner | Risk | Replacement |
|------|----------------|----------|-------|------|--------------|
| `assets/js/bootstrap.js` | `IEConfig.BASE_PATH` + log `"[ItalianExperience] IEConfig.BASE_PATH is required..."` | runtime JS | shared | safe | No path change. Optional: rename log prefix to `[IE]` if desired. |
| `assets/js/cookie-consent.js` | `IEConfig.BASE_PATH` + log same | runtime JS | shared | safe | No path change. |
| `portal/runtime/job-posting-runtime.js` | `IEConfig.BASE_PATH` + log | runtime JS | portal | safe | No path change. |
| `portal/runtime/job-postings-list-runtime.js` | `IEConfig.BASE_PATH` + log | runtime JS | portal | safe | No path change. |
| `portal/runtime/job-offer-runtime.js` | `IEConfig.BASE_PATH` + log | runtime JS | portal | safe | No path change. |
| `portal/runtime/lists/dashboard.js` | `IEConfig.BASE_PATH` + log | runtime JS | portal | safe | No path change. |
| `recruitment/jobs/index.html` (inline script) | `IEConfig.BASE_PATH` for apply URLs + log | live HTML | site | safe | No path change. |

### A.3 Log / branding-only references (no URL construction)

These use the string `ItalianExperience` only in **console messages** or **error labels**. They do **not** affect routing, links, or assets. **No change required** for base-path removal; optional cosmetic rename to `[IE]` later.

| File | Example | Category | Owner |
|------|---------|----------|-------|
| `portal/runtime/entity-actions-runtime.js` | `"[ItalianExperience] saveCandidate() ..."` | runtime JS | portal |
| `portal/runtime/lists/dashboard.js` | `"[ItalianExperience] Dashboard ... error"` | runtime JS | portal |
| `portal/core/ui/previews.js` | `"[ItalianExperience] fetchJobOfferById error"` | runtime JS | portal |
| `portal/runtime/lists/job-offers-list.js` | `"[ItalianExperience] fetchJobOffersPaginated error"` | runtime JS | portal |
| `portal/runtime/lists/candidates-list.js` | `"[ItalianExperience] fetchCandidatesPaginated ..."` | runtime JS | portal |
| `portal/runtime/candidate-profile-runtime.js` | Multiple `"[ItalianExperience] replaceCandidate... error"` | runtime JS | portal |
| `portal/runtime/modals-runtime.js` | `"[ItalianExperience] Unable to load form fragment"` etc. | runtime JS | portal |
| `portal/runtime/lists/clients-list.js` | `"[ItalianExperience] fetchClientsPaginated ..."` | runtime JS | portal |
| `portal/runtime/candidate-import-runtime.js` | Many `"[ItalianExperience] candidate-import-runtime: ..."` | runtime JS | portal |
| `portal/runtime/candidate-runtime.js` | `"[ItalianExperience] removeCandidateFile exception"` | runtime JS | portal |
| `portal/runtime/forms-runtime.js` | `"[ItalianExperience] handleCandidateFileChange ..."` | runtime JS | portal |
| `portal/runtime/associations-runtime.js` | `"[ItalianExperience] ... load error"` | runtime JS | portal |
| `portal/core/app-shell.js` | `"[ItalianExperience] ensureSupabaseSessionReady failed"` etc. | runtime JS | portal |
| `portal/runtime/candidate-profile-runtime.js` | Multiple error logs | runtime JS | portal |
| `portal/runtime/job-offer-runtime.js` | `"[ItalianExperience] getJobOfferById error"` | runtime JS | portal |
| `portal/runtime/lists/applications-list.js` | `"[ItalianExperience] fetchApplicationsPaginated error"` | runtime JS | portal |

### A.4 Docs and repo metadata (no runtime path)

| File | Reference | Category | Owner | Risk | Replacement |
|------|-----------|----------|-------|------|-------------|
| `README.md` | `BASE_PATH – base path (e.g., /ItalianExperience)` | docs | shared | safe | Update example to show `''` or `'/'` for root; keep doc. |
| `package.json` | `url: .../ItalianExperience.git`, `homepage`: `.../ItalianExperience#readme` | metadata | shared | safe | **Do not change**—repo name, not site path. |
| `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md` | Defines BASE_PATH, says "Current production value: `/ItalianExperience`", "No new `/ItalianExperience` fallbacks", "Replace hardcoded ... with %%BASE_PATH%%" | docs | docs | safe | Update to describe new default (e.g. `''`) and placeholder strategy. |
| `docs/architecture/WEBSITE-STRUCTURE.md` | "deployed under a `/ItalianExperience` base path", "use absolute URLs ... `/ItalianExperience/...`" | docs | docs | safe | Update after migration to reflect chosen strategy. |
| `docs/architecture/REPO-OWNERSHIP-INVENTORY.md` | "under `/ItalianExperience` base path", "Normalize hardcoded `/ItalianExperience/...`" | docs | docs | safe | Update to reference BASE_PATH and post-migration state. |
| `docs/architecture/TARGET-REPO-LAYOUT.md` | "ItalianExperience repository" (name) | docs | docs | safe | No change for path migration. |
| `docs/architecture/PUBLIC-UI-STEP-2-LAYERED-ARCHITECTURE.md` | Route examples `/ItalianExperience/...` | docs | docs | safe | Update examples to placeholder or relative. |
| `docs/architecture/PUBLIC-UI-STEP-3-GLOBAL-VS-LOCAL.md` | "static HTML under `/ItalianExperience`" | docs | docs | safe | Update scope description. |
| `docs/architecture/PUBLIC-UI-STEP-4-CANONICAL-SYSTEMS.md` | "under `/ItalianExperience`" | docs | docs | safe | Update. |
| `docs/architecture/WEBSITE-FILE-MAP.md` | (if any path examples) | docs | docs | safe | Align with conventions doc. |
| `docs/refactor/PUBLIC-UI-STEP-1-CURRENT-DUPLICATION.md` | "under `/ItalianExperience`" | docs | docs | safe | Update. |
| `docs/refactor/PUBLIC-UI-STEP-5-TEMPLATE-MAPPING.md` | Many "Route: `/ItalianExperience/...`" | docs | docs | safe | Update to use placeholder or generic "BASE_PATH". |
| `docs/refactor/PUBLIC-UI-STEP-6-MIGRATION-PLAN.md` | "under `/ItalianExperience`" | docs | docs | safe | Update. |
| `docs/ai/README.md` | "No new hardcoded `/ItalianExperience`", "IEConfig.BASE_PATH" | docs | docs | safe | Keep; aligns with strategy. |
| `portal/docs/SECURITY-AUDIT-REPORT.md` | Log example `[ItalianExperience]` | docs | portal | safe | No path change. |
| `portal/docs/SUPABASE-PROJECT-AUDIT.md` | IEConfig mention | docs | portal | safe | No path change. |

### A.5 Explicit exclusions (do not change as part of base-path migration)

- **Zoho form `action` URLs** in HTML (e.g. `.../form/ItalianExperience/formperma/...`): **External form identifier**. Changing would break submissions. Leave as-is.
- **package.json** `repository` / `bugs` / `homepage`: **Repository identity**, not site base path. Leave as-is for this migration.

---

## B. Classification

| Bucket | Description | Files / areas |
|--------|-------------|----------------|
| **1. Safe to replace now** | Single config + tooling that can accept a config/env base. | `assets/js/config.js` (default value only, with override story); `scripts/add-image-dimensions.mjs`; `scripts/check-links.mjs` (once strategy is fixed). |
| **2. Needs staged refactor** | All live HTML (site pages + partials) and any HTML that shares assets. | `index.html`, `404.html`, `contact/`, `privacy/`, `estates/`, `flavors/*`, `recruitment/*`, `travel/*`, `partials/*`. Must switch to placeholder or relative in a single coordinated pass; deploy and server config must match. |
| **3. Docs only** | Documentation that describes current or future path behavior. | All under `docs/` (architecture, refactor, ai); `README.md`. Update after runtime/HTML strategy is decided. |
| **4. Archive only** | Archived copies, not production. | `archive/site/assets-img-stage1/**`. Optional update for consistency; low priority. |
| **5. Should remain temporarily** | No change until HTML/config strategy is live. | Portal runtime files that already use `IEConfig.BASE_PATH`—remain as-is. Log prefixes `[ItalianExperience]` remain unless you do a separate branding pass. Zoho form actions and package.json repo URLs remain. |

---

## C. Target strategy

**Recommended: hybrid strategy**

- **JS (shared + portal)**  
  - **Already correct:** All URL construction uses `IEConfig.BASE_PATH` / `IEConfig.PORTAL_PATH`; no new literals.  
  - **Change:** In `config.js`, set default `BASE_PATH` and `PORTAL_PATH` according to environment (e.g. `''` for root, `/ItalianExperience` only when served under that path). Override via small inline script before `config.js` or via build-time inject so production can keep `/ItalianExperience` if needed.  
  - No `"/ItalianExperience"` fallbacks; keep “fail clearly if BASE_PATH missing” behavior.

- **Static HTML (site)**  
  - **Option A (recommended for flexibility):** Introduce a single placeholder (e.g. `%%BASE_PATH%%`) for the path prefix. At build time (or via a one-off script), replace `%%BASE_PATH%%` with the actual base (e.g. `/ItalianExperience` or `` for root). All `href` and `src` that today are `/ItalianExperience/...` become `%%BASE_PATH%%/...`.  
  - **Option B:** Switch to root-relative paths (e.g. `/assets/...`, `/contact/`) and serve the site at document root in all environments; then no placeholder. This only works if production and preview both serve at root (or you use a redirect/proxy that strips the prefix before hitting the app).  
  - **Constraint:** One source of truth. Either all placeholder-based or all root-relative; no mixing for the same target type.

- **Portal**  
  - No change to routing logic; already uses `IEConfig.PORTAL_PATH` and router helpers.  
  - Portal pages that include site assets (e.g. `recruitment/candidate/apply/index.html`) load `config.js` and bootstrap; as long as `IEConfig.BASE_PATH` is set correctly (including when site is at root), asset URLs can be built from it if needed, or the same placeholder/build approach as the rest of the site.

- **Docs**  
  - Update WEBSITE-URL-AND-PATH-CONVENTIONS.md and related architecture/refactor docs to describe: (1) default base path per environment, (2) placeholder strategy and build step, (3) “no hardcoded `/ItalianExperience` in HTML” as the target state.  
  - Keep “no new fallbacks in runtime code” and “single source of truth in IEConfig.”

---

## D. Implementation phases (no implementation in this audit)

### Phase 1 – Lowest risk (config + tooling + docs)

- **1.1** `assets/js/config.js`: Document override mechanism; optionally support detection (e.g. `window.__IE_BASE_PATH__` set by inline script before config) so production can inject `/ItalianExperience` and local can inject ``. Do not remove the default yet.  
- **1.2** `scripts/add-image-dimensions.mjs`: Accept base path from env (e.g. `IE_BASE_PATH`) or from first HTML `src`; support both `/ItalianExperience/` and `/` (or placeholder).  
- **1.3** `scripts/check-links.mjs`: Accept base path from env or config; normalize both `/ItalianExperience/` and `/` when resolving.  
- **1.4** Docs: Update `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md` with the chosen strategy (placeholder vs root-relative), and add a short “base path migration” section in `README.md`.  

**Deliverable:** Config and scripts work for both current and future base path; docs describe the plan. No change to live HTML or deploy yet.

### Phase 2 – Medium risk (partials + one page as pilot)

- **2.1** Introduce build or pre-deploy step that replaces `%%BASE_PATH%%` with the configured value (e.g. `/ItalianExperience` or ``). **Current state:** the script `scripts/replace-base-path.mjs` writes compiled HTML to `dist/`; `dist/` is in `.gitignore` and is not in the repo. Deploy can be from repo root (default GitHub Pages, no build) or from `dist/` on an alternative static host after running the script (see README § Deploy).  
- **2.2** Replace every `/ItalianExperience` path in `partials/header.html`, `partials/footer.html`, `partials/cookie-banner.html` with `%%BASE_PATH%%` (e.g. `%%BASE_PATH%%/`, `%%BASE_PATH%%/privacy/`).  
- **2.3** Pick one page as pilot (e.g. `404.html`): replace all asset and link paths with `%%BASE_PATH%%/...`, run build, verify local preview and production (or staging).  
- **2.4** Ensure `config.js` is loaded first and that its default (or override) matches the value used in the build step for each environment.  

**Deliverable:** Partials and one full page use placeholder; build step fills it; behavior unchanged if filled with `/ItalianExperience`.

### Phase 3 – High risk (all remaining live HTML + deploy)

- **3.1** Apply `%%BASE_PATH%%` (or chosen root-relative convention) to all remaining live site HTML: `index.html`, `contact/index.html`, `privacy/index.html`, `estates/index.html`, `flavors/index.html`, `flavors/for-your-home/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`, `recruitment/index.html`, `recruitment/employer/index.html`, `recruitment/candidate/index.html`, `recruitment/candidate/apply/index.html`, `recruitment/jobs/index.html`, `travel/index.html`, `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`.  
- **3.2** Do **not** change Zoho `action` URLs (form name path). Do **not** change `package.json` repo URLs.  
- **3.3** Optional: `recruitment/candidate/index.html` og:image/twitter:image: switch to `SITE_URL` + path (or config) instead of `https://italianexperience.github.io/ItalianExperience/...`.  
- **3.4** Deploy/config: Ensure production build injects correct base (e.g. `/ItalianExperience`); local or staging can use `` for root. Update GitHub Pages (or the static host) if needed so that requests under `/ItalianExperience` still reach the same built files (or redirect).  
- **3.5** Run link check and image-dimension script against built output; fix any broken links.  
- **3.6** Archive: Optionally apply same placeholder to `archive/site/assets-img-stage1/**` for consistency; low priority.  

**Deliverable:** No hardcoded `/ItalianExperience` in live HTML; all paths derive from one base (placeholder or root); local preview and production both work.

---

## E. Risks of blind removal

If every occurrence of `/ItalianExperience` were removed or replaced blindly:

1. **Broken assets and nav**  
   - Replacing with `` or `/` everywhere would make links like `/assets/css/site.css` and `/contact/`. If the site is still deployed under `https://example.com/ItalianExperience/`, the browser would request `https://example.com/assets/...` and `https://example.com/contact/` (wrong origin path), yielding 404s and broken layout/nav.

2. **Config and runtime mismatch**  
   - If HTML were changed to relative paths but `config.js` still defaulted to `BASE_PATH: '/ItalianExperience'`, bootstrap and cookie-consent would fetch partials at `/ItalianExperience/partials/...` while the page might be at `/`. Mixed behavior and 404s.

3. **Portal job/apply URLs**  
   - Portal code builds public job and apply URLs from `IEConfig.BASE_PATH`. If that were removed or changed without updating deploy and HTML, links from dashboard to public job pages or apply could point to the wrong path.

4. **Zoho form submission**  
   - Replacing the `ItalianExperience` segment inside Zoho form `action` URLs would change the form identifier and break submission to Zoho.

5. **Tooling**  
   - `add-image-dimensions.mjs` and `check-links.mjs` assume paths start with `/ItalianExperience/`. Blind removal would break their logic until they are updated to support the new convention.

6. **Local preview**  
   - Today, serving at root with paths like `/ItalianExperience/...` only works if the server serves the repo under `/ItalianExperience` or the HTML is changed and server matches. Blind replace to `/` without serving at root would break local preview; blind replace to `/ItalianExperience` when serving at root would keep current behavior but not improve it.

**Conclusion:** A coordinated, phased approach with a single source of truth (config + placeholder or root-relative) and matching deploy/config is required. Do not perform a global find-replace.

---

## Safest first implementation slice (after audit)

**Objective:** Improve maintainability and prepare for root or configurable base **without** changing production URL behavior yet.

### 1. Safest first slice

- **Scope:** Config default remains `/ItalianExperience`. Add a **documented override** so that local or future root deploy can set base path without editing repo.  
- **Do not change:** Any live HTML, partials, or portal routing.  
- **Do change:**  
  - **1)** `assets/js/config.js`: Keep `BASE_PATH: '/ItalianExperience'` and `PORTAL_PATH: '/ItalianExperience'`. Add a short comment that an inline script may set `window.IEConfig` (including `BASE_PATH`/`PORTAL_PATH`) *before* this file to override (e.g. for local root preview).  
  - **2)** `scripts/add-image-dimensions.mjs`: Support both `/ItalianExperience/` and `/` when parsing `src`: e.g. if `src.startsWith('/ItalianExperience/')` use current strip; else if `src.startsWith('/')` treat as repo-root-relative and use `path.join(root, src.slice(1))`. So the script works whether HTML still has `/ItalianExperience/` or is later changed to `/`.  
  - **3)** `scripts/check-links.mjs`: When normalizing, if link is `'/ItalianExperience'` or `'/ItalianExperience/...'`, normalize to `'/'` and `'/...'` for resolution only (already does this). Add a comment that this supports both current and future base-path strategy. No behavioral change.  
  - **4)** `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md`: Add one paragraph under “Core configuration” describing the override (inline script or build inject) for `BASE_PATH`/`PORTAL_PATH` for local or alternate deploys.  

### 2. Exact files to modify first

| File | Change |
|------|--------|
| `assets/js/config.js` | Add comment: override via `window.IEConfig` set before this script (e.g. `BASE_PATH: ''` for root). |
| `scripts/add-image-dimensions.mjs` | Allow `src` starting with `/` (root-relative) in addition to `/ItalianExperience/` when resolving file path. |
| `scripts/check-links.mjs` | Add comment that normalization supports current and future base. (Optional: env var for base path later.) |
| `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md` | Document override mechanism for BASE_PATH/PORTAL_PATH. |

### 3. Expected effect

- **Local preview:** If you add a one-line inline script on a test page that sets `IEConfig.BASE_PATH = ''` before `config.js`, bootstrap and cookie-consent will request `/partials/header.html`, etc. That will only work if the server serves at document root; otherwise behavior is unchanged. So: **no regression**; optional improvement when serving at root.  
- **Production:** No change. Default remains `/ItalianExperience`; no HTML or deploy config changed.  
- **Maintainability:** Override is documented; tooling is ready for a future base-path migration.  
- **Security:** Unchanged; no new surface, no mixed path logic.

---

## Summary table: files with path-related `/ItalianExperience` (for quick reference)

| Owner | Path-related files |
|-------|--------------------|
| **Shared config** | `assets/js/config.js` |
| **Site HTML** | `index.html`, `404.html`, `contact/index.html`, `privacy/index.html`, `estates/index.html`, `flavors/index.html`, `flavors/for-your-home/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`, `recruitment/index.html`, `recruitment/employer/index.html`, `recruitment/candidate/index.html`, `recruitment/candidate/apply/index.html`, `recruitment/jobs/index.html`, `travel/index.html`, `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html` |
| **Partials** | `partials/header.html`, `partials/footer.html`, `partials/cookie-banner.html` |
| **Tooling** | `scripts/add-image-dimensions.mjs`, `scripts/check-links.mjs` |
| **Archive** | `archive/site/assets-img-stage1/index.html`, `archive/site/assets-img-stage1/travel/gapyear/index.html`, `archive/site/assets-img-stage1/travel/bespoke/index.html` |
| **Docs** | `README.md`, `docs/architecture/*.md`, `docs/refactor/*.md`, `docs/ai/README.md` (and portal docs as listed) |

**Do not change for base-path migration:** Zoho form `action` URLs in HTML, `package.json` repository/homepage URLs, and all `[ItalianExperience]` log-only strings in JS (optional cosmetic change later).
