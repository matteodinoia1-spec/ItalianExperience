## Website file map (static site only)

This file map lists the static website pages and shared files that live at the repository root, excluding the `portal/` application. Paths are documented as they exist today, without proposing any changes.

## FINAL ARCHITECTURE SUMMARY

- **Finite set of static entry points**: The static website is composed of a well-defined set of HTML entry points at the repo root (`index.html`, `404.html`) and within section folders for contact, estates, flavors, recruitment, and travel, each with its own `index.html` file.
- **Centralized shared runtime files**: Shared layout fragments (`partials/header.html`, `partials/footer.html`), stylesheets under `assets/css/`, JavaScript under `assets/js/`, and images under `assets/img/` are referenced across sections and form the single set of runtime assets for the static site.
- **Archived content outside the production tree**: Archived backups (`archive/website/assets-img-stage1/`) and explicitly unused assets (`archive/website/assets-unused/`) live under `archive/website/` and do not alter any existing HTML routes or live asset paths documented in this file map.
- **Portal remains out of scope**: The `portal/` directory continues to house a separate application with its own HTML, CSS, JS, and assets; it is intentionally excluded from this static website file map even though it lives alongside the website in the same repository.

## Root-level pages

- **Home**
  - `index.html`
- **Not found**
  - `404.html`

## Section: Contact

- **Contact**
  - `contact/index.html`

## Section: Estates

- **Estates**
  - `estates/index.html`

## Section: Flavors

- **Section root**
  - `flavors/index.html`

- **Subpages**
  - `flavors/for-your-home/index.html`
  - `flavors/for-your-business/index.html`
  - `flavors/aziende-italiane/index.html`

## Section: Recruitment

- **Section root**
  - `recruitment/index.html`

- **Subpages**
  - `recruitment/employer/index.html`
  - `recruitment/candidate/index.html`

## Section: Travel

- **Section root**
  - `travel/index.html`

- **Subpages**
  - `travel/gapyear/index.html`
  - `travel/culinary/index.html`
  - `travel/bespoke/index.html`

## Shared partials

- `partials/header.html`
- `partials/footer.html`

These partials are used by multiple pages across sections to provide a common header and footer.

## Shared CSS and JS

- **CSS (`assets/css/`)**
  - `assets/css/site.css`
  - `assets/css/tailwind.css`
  - `assets/css/tailwind.input.css`

- **JavaScript (`assets/js/`)**
  - `assets/js/site.js`

These files are referenced from the HTML pages and are shared across sections.

## Image assets (high-level)

- `assets/img/` – root image directory.
  - Contains production images organized by topic/section (for example: `assets/img/home/`, `assets/img/estates/`, `assets/img/flavors/`, `assets/img/recruitment/`, `assets/img/travel/` and deeper subfolders such as `travel/gapyear/`, `travel/culinary/`, `travel/bespoke/`).
  - Historically contained a legacy backup subtree at `assets/img/_stage1_backup/` (with HTML snapshots and nested `assets/img/_stage1_backup/assets/img/...` image files); this subtree has been archived under `archive/website/assets-img-stage1/` as a non-runtime backup without changing any live image paths used by the site.

## Archive folders (static site only)

- `archive/website/` – root for archived static website content that is **not** part of the production asset tree.
  - `archive/website/assets-img-stage1/` – contains the former `assets/img/_stage1_backup/` legacy/backup subtree (HTML snapshots plus mirrored images).
  - `archive/website/assets-unused/` – holds image assets that have been explicitly confirmed as unused (for example, the `gapyear-bologna-test.avif` test image) and moved out of `assets/img/` without affecting any live routes or asset paths.

## Tooling and configuration

- `scripts/check-links.mjs`
- `scripts/add-image-dimensions.mjs`
- `scripts/generate-all-avif.mjs`
- `scripts/generate-gapyear-avif.mjs`
- `netlify.toml`

These files support the static website (link checking, image processing, and deployment configuration) and operate on the existing structure documented above.

## Out-of-scope: `portal/`

- The repository also contains a `portal/` directory with its own HTML, CSS, JS, and documentation, representing a separate application.
- `portal/` and its contents are intentionally **excluded** from this website file map; they are only mentioned here to clarify that they exist alongside the static website.

