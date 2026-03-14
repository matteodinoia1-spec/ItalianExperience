## Static website overview

This repository contains a static marketing website at the root of the project, plus a separate `portal/` web application. This document describes only the static website portion outside `portal/`, without proposing any refactors or changes. For BASE_PATH, PORTAL_PATH, and runtime URL rules, see also `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md`.

The static website is deployed under a `/ItalianExperience` base path. Internal links between pages and references to shared CSS, JS, and image assets use absolute URLs such as `/ItalianExperience/recruitment/employer/` and `/ItalianExperience/assets/css/site.css`. When running a local static file server for preview, the site must be served in a way that preserves this base path; serving the repository directly at `/` without a `/ItalianExperience` prefix will cause requests like `/ItalianExperience/recruitment/employer/` to return `Cannot GET` errors even though the underlying files (for example `recruitment/employer/index.html`) are present. The archival move of the legacy `_stage1_backup` subtree into `archive/website/assets-img-stage1/` did not change these HTML routes or live asset paths.

## Website Reorganization Summary

- Legacy backup assets previously stored under `assets/img/_stage1_backup/` have been moved into `archive/website/assets-img-stage1/` as non-runtime backups.
- Clearly unused test assets that were confirmed to have no references in HTML, CSS, or JavaScript have been moved into `archive/website/assets-unused/`.
- All production assets remain under `assets/img/`, and no live HTML, CSS, or JS paths were modified as part of this reorganization.
- No runtime behavior, layout, or visuals were changed; only archive locations and documentation were updated.

## FINAL ARCHITECTURE SUMMARY

- **Static marketing site at repo root**: The static website lives at the repository root under the `/ItalianExperience` base path and is composed of a small set of HTML entry points (`index.html`, `404.html`) plus section folders for `contact/`, `estates/`, `flavors/`, `recruitment/`, and `travel/`, each with its own `index.html`.
- **Shared assets and partials**: All runtime CSS, JavaScript, and image assets used by the static site live under `assets/` (`assets/css/`, `assets/js/`, `assets/img/`), and shared header/footer markup is centralized in `partials/header.html` and `partials/footer.html` and included from the static pages.
- **Archive separation**: Legacy backup content and explicitly unused assets have been moved out of the live `assets/img/` tree into `archive/website/assets-img-stage1/` and `archive/website/assets-unused/`; these archived files are preserved for reference but are not part of the production asset tree and do not change any existing HTML routes or asset paths.
- **Portal isolation**: The `portal/` directory continues to host a separate, app-like web application with its own assets and documentation; it remains architecturally and operationally separate from the static marketing website described in this document.

## Root-level website structure (excluding `portal/`)

- **Root pages**
  - `index.html` – main landing page of the static site.
  - `404.html` – not-found page for invalid routes.

- **Section folders**
  - `contact/` – contact section.
    - `contact/index.html` – contact page.
  - `estates/` – real estate section.
    - `estates/index.html` – estates page.
  - `flavors/` – food and flavors section.
    - `flavors/index.html` – section overview.
    - `flavors/for-your-home/index.html` – flavors offering for home customers.
    - `flavors/for-your-business/index.html` – flavors offering for business customers.
    - `flavors/aziende-italiane/index.html` – flavors offering for Italian companies.
  - `recruitment/` – recruitment section.
    - `recruitment/index.html` – recruitment overview.
    - `recruitment/employer/index.html` – employer-focused recruitment page.
    - `recruitment/candidate/index.html` – candidate-focused recruitment page.
  - `travel/` – travel section.
    - `travel/index.html` – travel overview.
    - `travel/gapyear/index.html` – gap year travel page.
    - `travel/culinary/index.html` – culinary travel page.
    - `travel/bespoke/index.html` – bespoke travel page.

- **Shared assets and partials**
  - `assets/` – shared CSS, JS, and image files used by the static site.
  - `partials/` – shared HTML partials (header and footer) included into pages.
  - `scripts/` – Node-based tooling scripts for the static site.
  - `netlify.toml` – deployment configuration (headers, caching, etc.) for the static site.

## Shared assets

- **CSS stylesheets (`assets/css/`)**
  - `assets/css/site.css` – main compiled stylesheet used by the static site.
  - `assets/css/tailwind.css` – Tailwind-generated stylesheet.
  - `assets/css/tailwind.input.css` – Tailwind input/source file used for builds.

- **JavaScript (`assets/js/`)**
  - `assets/js/site.js` – single shared JavaScript entry for the static website, included by the HTML pages.

- **Images (`assets/img/` and `archive/website/`)**
  - `assets/img/` – root for all static site images that are part of the live static website.
  - Production images are organized into subfolders by domain/section (for example: home, estates, flavors, recruitment, travel and their subfolders).
  - `archive/website/` – root for website archives that are **not** part of the production asset tree.
    - `archive/website/assets-img-stage1/` – archive location containing the former `assets/img/_stage1_backup/` legacy/backup subtree with older HTML snapshots and images; this archive is explicitly skipped by tooling scripts.
    - `archive/website/assets-unused/` – holding area for explicitly confirmed-unused assets that have been moved out of `assets/img/` after verification that they are not referenced anywhere.

## Partials

- `partials/header.html` – shared header markup used across static pages.
- `partials/footer.html` – shared footer markup used across static pages.

These partials are referenced from static HTML pages to keep the header and footer consistent across sections.

## Website tooling (`scripts/`)

The static website uses Node-based scripts under the `scripts/` directory:

- `scripts/check-links.mjs` – scans HTML pages and checks links. It is configured to ignore the archived backup tree under `archive/website/assets-img-stage1/` (and the historical `assets/img/_stage1_backup/` path).
- `scripts/add-image-dimensions.mjs` – walks `assets/img/` to inject image dimensions into HTML (it operates only on live production assets and does not touch the archived backup tree).
- `scripts/generate-all-avif.mjs` – generates AVIF variants for images under `assets/img/`, skipping archived backup content under `archive/website/assets-img-stage1/` (and the historical `_stage1_backup` path, if present).
- `scripts/generate-gapyear-avif.mjs` – AVIF generator focused on gap year travel images.

These scripts operate on the existing layout and paths; they are part of tooling only and do not change the static site’s runtime structure by themselves.

## Relationship to `portal/`

- `portal/` is a separate, app-like web application that lives alongside the static website at the repository root.
- The current documentation intentionally **excludes** `portal/` from the website structure description.
- No assumptions, refactors, or structural changes are made to `portal/`; it is only mentioned here to clarify that it exists and is out of scope for this static website documentation.

