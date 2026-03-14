## Asset inventory overview

This document describes the current asset layout for the static website, focusing on images and related tooling under `assets/`. It reflects the structure as it exists today and does not propose any changes.

## FINAL ARCHITECTURE SUMMARY

- **Active runtime asset tree**: All CSS and JavaScript used by the static website live under `assets/css/` and `assets/js/`, and all live production images live under `assets/img/`, organized by domain and section (home, estates, flavors, recruitment, travel and their subfolders).
- **Archived backup subtree moved out of `assets/img/`**: The historical `_stage1_backup` subtree has been moved from `assets/img/_stage1_backup/` into `archive/site/assets-img-stage1/` (previously `archive/website/assets-img-stage1/`), where it is treated as legacy backup content rather than active production assets.
- **Tooling scoped to production assets only**: Image-related scripts under `scripts/` operate on the live `assets/img/` tree and are explicitly configured to skip archived backup content under `archive/site/assets-img-stage1/` (and the historical `_stage1_backup` path) so that legacy snapshots do not affect checks or AVIF generation.
- **Clear separation for unused assets and portal**: Explicitly unused images confirmed to have no references are held under `archive/site/assets-unused/` (previously `archive/website/assets-unused/`), and the `portal/` directory maintains its own independent asset structure that is acknowledged but out of scope for this static website asset inventory.

## CSS and JavaScript assets

- **CSS (`assets/css/`)**
  - `assets/css/site.css` – main compiled stylesheet used by the static pages.
  - `assets/css/tailwind.css` – Tailwind-generated CSS output.
  - `assets/css/tailwind.input.css` – Tailwind input/source file for builds.

- **JavaScript (`assets/js/`)**
  - `assets/js/site.js` – shared JavaScript entry for the static website.

These files are part of the active runtime for the static site and are referenced by multiple HTML pages.

## Image directory layout (`assets/img/`)

All **live production** static website images live under `assets/img/`. The structure is organized primarily by domain and section, with AVIF and JPEG variants stored together.

High-level layout:

- `assets/img/home/` – images used on the home page and shared hero/section tiles.
- `assets/img/estates/` – images used in the estates section (for example estate hero images at various resolutions).
- `assets/img/flavors/` – images used in the flavors section, including subfolders:
  - `assets/img/flavors/for-your-home/`
  - `assets/img/flavors/for-your-business/`
  - `assets/img/flavors/aziende-italiane/`
- `assets/img/recruitment/` – recruitment-related imagery, with subfolders such as:
  - `assets/img/recruitment/employer/`
  - `assets/img/recruitment/candidate/`
  - background imagery under paths like `assets/img/recruitment/recruitment-bg-*/`.
- `assets/img/travel/` – travel imagery, including:
  - `assets/img/travel/gapyear/`
  - `assets/img/travel/culinary/`
  - `assets/img/travel/bespoke/`
  - a `.gitkeep` file under `assets/img/travel/` to ensure the folder exists in version control.

Within these folders, images are typically stored in multiple resolutions and formats (for example, `.jpg` and `.avif` files with suffixes like `-960`, `-1280`, `-1920`, `-2560`).

## Legacy backup subtree: `_stage1_backup` (archived)

- Historically, `assets/img/_stage1_backup/` existed as a legacy and backup subtree within `assets/img/`, containing:
  - HTML snapshots:
    - `assets/img/_stage1_backup/index.html`
    - `assets/img/_stage1_backup/travel/gapyear/index.html`
    - `assets/img/_stage1_backup/travel/bespoke/index.html`
  - Nested image backups:
    - `assets/img/_stage1_backup/assets/img/home/...`
    - `assets/img/_stage1_backup/assets/img/travel/...`
    - other image files mirrored from earlier stages of the site.
- This subtree is treated as backup/legacy content rather than active production assets.
- As part of the website reorganization, the entire `_stage1_backup` tree was moved out of `assets/img/` into `archive/site/assets-img-stage1/` (previously `archive/website/assets-img-stage1/`), so it no longer lives under the production asset tree.
- Tooling scripts that operate on `assets/img/` are configured to **skip** any paths pointing at the archived backup content (and, for historical compatibility, may still skip the old `/assets/img/_stage1_backup/` marker).

## Image tooling scripts

The repository includes several scripts under `scripts/` that operate on image assets:

- `scripts/check-links.mjs`
  - Scans HTML files to validate links.
  - Configured to ignore the archived backup tree under `archive/site/assets-img-stage1/` (and the historical `assets/img/_stage1_backup/` path) so that legacy HTML snapshots and backup assets do not affect link checks.

- `scripts/add-image-dimensions.mjs`
  - Walks `assets/img/` to inject width and height attributes into HTML image tags.
  - Operates on live production assets under `assets/img/` only; the archived backup tree under `archive/site/assets-img-stage1/` is not part of its input.

- `scripts/generate-all-avif.mjs`
  - Generates AVIF variants for images under `assets/img/`.
  - Uses skip markers such as `archive/site/assets-img-stage1/` (and the historical `/assets/img/_stage1_backup/`) to avoid processing archived backup content.

- `scripts/generate-gapyear-avif.mjs`
  - Focused AVIF generation for gap year travel images under `assets/img/travel/gapyear/`.

These scripts are part of the website tooling layer and reflect the current folder names and paths.

## Archive status and asset policy

- The `_stage1_backup` subtree has been archived under `archive/site/assets-img-stage1/` (previously `archive/website/assets-img-stage1/`) as part of the website file reorganization plan.
- No live production asset paths under `assets/img/` were changed as part of this archival step.
- `archive/site/` (previously `archive/website/`) is the root for all website archives and unused assets that are intentionally kept outside the production tree.
- **Asset policy**:
  - Production assets that are part of the live static website remain under `assets/img/`.
- Archived and explicitly unused assets live outside the production tree under `archive/site/` (for example, `archive/site/assets-img-stage1/` and `archive/site/assets-unused/`).

## Unused asset archive

- `archive/site/assets-unused/` (previously `archive/website/assets-unused/`) is the holding area for image assets that have been **explicitly confirmed as unused** by the static website.
- Assets are only moved here when end-to-end searches show **no references** in HTML, CSS, or JavaScript, and after link checks confirm that no image paths are broken.
- As of this audit, the only asset moved into this folder is a gap year test image (`gapyear-bologna-test.avif`) from `assets/img/travel/gapyear/`, which is not referenced anywhere in the site.
- Other assets that are not clearly referenced (for example, alternate AVIF resolutions generated by tooling) are treated as **possibly unused** and are left in place under `assets/img/` until there is stronger evidence they are safe to archive.

## Out-of-scope assets

- The `portal/` directory maintains its own asset structure (CSS, JS, images, and other resources) that is separate from the static website.
- This asset inventory focuses solely on `assets/` used by the static website outside `portal/`; `portal/` assets are acknowledged here but not detailed.

