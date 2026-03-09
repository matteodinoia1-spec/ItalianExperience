## Public UI – Migration Plan (Step 6)
_Static public site under `/ItalianExperience`, excluding `portal/**`_

---

## 1. Priority Matrix (Refactor Areas)

### 1.1 Foundations / Tokens Cleanup

- **Refactor Area**  
  Foundations / tokens cleanup

- **Why It Matters**  
  - Today brand tokens (`--brand-gold`, `--radius-premium`, `--ice-*`) and logo basics are duplicated between `index.html` and `assets/css/site.css`.  
  - Section spacing and header clearance are inconsistently applied, causing drift and fragile layout fixes.

- **Impact**  
  - Single source of truth for colors, radii, shadows, spacing, header offsets, and base typography.  
  - Makes all downstream refactors (buttons, heroes, cards, forms) safer, because they rely on consistent tokens.

- **Complexity**  
  - Moderate: mostly moving and consolidating CSS, plus sanity-checking that no page relies on inline overrides.  
  - No markup changes required if handled carefully.

- **Dependencies**  
  - None for starting, but it **unlocks** safe work on heroes, buttons, cards, templates, and home-page rebasing.

- **Recommended Priority**  
  - **Highest (Phase 0 / Phase 1)**

- **Main Files Affected**  
  - `assets/css/site.css` (top “Foundations” block)  
  - `index.html` (inline `<style>` in `<head>`)  
  - Any inline `<style>` blocks redefining tokens (e.g. `:root`, `.premium-card`, logo classes)

- **Risks**  
  - Silent visual changes if inline token overrides are removed before equivalent values live in `site.css`.  
  - Potential caching issues if `site.css` changes drastically without testing key pages.

---

### 1.2 Button System Normalization

- **Refactor Area**  
  Button system normalization

- **Why It Matters**  
  - There are many visually similar CTAs (`.btn-gold`, `.hero-form-cta`, `.service-btn`, `.gap-btn`, `.enroll-btn`, `.request-info-btn`, `.editorial-cta`, `.essence-cta`, `.cta-button`, `.btn-panel`) scattered across pages and inline styles.  
  - Changing radius, focus outline, or hover behavior currently requires editing multiple locations.

- **Impact**  
  - Consistent CTA look and accessibility across all public pages.  
  - Simplifies future updates to button styling and improves a11y (focus states, hit areas).

- **Complexity**  
  - Moderate: mapping legacy class names to a small canonical `ie-btn-*` family, then updating markup and CSS.  
  - Must be coordinated with forms and heroes so CTAs don’t regress.

- **Dependencies**  
  - Depends on **Foundations** (tokens, radii, color roles).  
  - Closely coupled with **Forms** and **Hero** refactors, but can start in isolation once tokens are stable.

- **Recommended Priority**  
  - **Very high (Phase 1 / 2)**

- **Main Files Affected**  
  - `assets/css/site.css` (“Buttons & CTAs” section)  
  - `404.html`, `flavors/for-your-home/index.html`, `travel/index.html`, `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`  
  - `flavors/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`  
  - `contact/index.html`, `estates/index.html`  
  - `recruitment/index.html`, `recruitment/employer/index.html`, `recruitment/candidate/index.html`  
  - `index.html` (editorial CTAs)

- **Risks**  
  - If legacy classes are removed too early, pages may lose CTA styling before their markup is updated.  
  - Focus styles or hover behavior might regress if not tested on each template type.

---

### 1.3 Hero System Unification

- **Refactor Area**  
  Hero system unification

- **Why It Matters**  
  - Many hero containers (`.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split-container`, `.business-hero`) duplicate responsibilities of `.ie-hero-shell` and friends.  
  - Any change in hero spacing, overlay, or typography must be patched across multiple inline styles.

- **Impact**  
  - Predictable hero behavior site-wide (viewport height, overlay, scroll indicator, typography).  
  - Enables template-level reasoning: Hub / Program / Advisory / Utility heroes become declared variants.

- **Complexity**  
  - High: requires both CSS and markup adjustments across most key pages.  
  - Must be staged by template family to avoid breaking hero layouts everywhere at once.

- **Dependencies**  
  - **Foundations** and **Button** system (hero CTAs).  
  - Useful to have **Card** and **Form** direction defined, but not strictly required to start.

- **Recommended Priority**  
  - **High (Phase 1 / 3)**

- **Main Files Affected**  
  - `assets/css/site.css` (“Hero primitives” and hero variants sections)  
  - `404.html`, `contact/index.html`, `estates/index.html`  
  - `flavors/index.html`, `flavors/for-your-home/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`  
  - `travel/index.html`, `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`  
  - `recruitment/index.html`, `recruitment/employer/index.html`, `recruitment/candidate/index.html`  
  - `index.html` (hero typography; layout remains home-specific but must lean on hero text/tokens)

- **Risks**  
  - Misalignment between new hero variants and existing content can cause cropping, text-overflows, or unreadable overlays.  
  - If Swiper hero is not unified correctly, Travel programs may end up with three separate slider skins.

---

### 1.4 Card System Normalization

- **Refactor Area**  
  Card system normalization

- **Why It Matters**  
  - Many card-like shells (`.glass-card`, `.hub-glass-card`, `.disclosure-card`, `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`, `.feature-card`, `.category-card`, `.program-card`, `.location-card`) share the same visual DNA but are named and tuned differently.  
  - This makes glass surfaces, disclosures, stats, and feature grids expensive to adjust consistently.

- **Impact**  
  - Unified glass vs solid vs disclosure vs stat surfaces.  
  - Stronger visual consistency for key selling surfaces (Travel, Flavors, Recruitment, Estates).

- **Complexity**  
  - Moderate: a combination of CSS refactors (introducing `ie-card-*` variants) and swapping class names in templates.  
  - Interacts with **Disclosure** and **Timeline** systems on some pages.

- **Dependencies**  
  - **Foundations** (radius, shadow, colors).  
  - Can be done in parallel with **Button** and **Hero** after tokens are stable.

- **Recommended Priority**  
  - **High (Phase 1 / 4)**

- **Main Files Affected**  
  - `assets/css/site.css` (“Cards & surfaces” and “Card systems” sections)  
  - `index.html` (portal/editorial cards, `premium-card`)  
  - `estates/index.html` (`.glass-card`, `.disclosure-card`)  
  - `flavors/index.html` (`.hub-glass-card`, `.disclosure-container`)  
  - `flavors/for-your-business/index.html` (`.feature-card`, `.category-card`)  
  - `flavors/aziende-italiane/index.html` (`.glass-card`, `.info-badge`, `.roadmap-step`)  
  - `travel/gapyear/index.html` (`.program-card`, `.location-card`)  
  - `recruitment/employer/index.html` (`.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`)  
  - `recruitment/candidate/index.html` (`.glass-card`, timeline cards)

- **Risks**  
  - If card padding or typography scale shifts unexpectedly, grids may reflow in undesirable ways (especially on mobile).  
  - Disclosure styling is shared between legal and marketing; conflating them too aggressively could reduce clarity.

---

### 1.5 Form System Normalization

- **Refactor Area**  
  Form system normalization

- **Why It Matters**  
  - Nearly every program/advisory page defines its own form shell and fields (`.service-*`, `.gap-*`, `.bespoke-*`, `.aziende-*`, `.field`, `.input-label`, `.contact-intl`, `.service-success`, etc.) despite an existing `ie-form-*` system in `site.css`.  
  - Changes to form styling, intl-tel behavior, or success states need updates across many pages.

- **Impact**  
  - Single, predictable form behavior (visual + UX) across all critical conversion pages.  
  - Easy to adjust forms for accessibility or brand updates.

- **Complexity**  
  - High: multiple pages, and forms are business-critical.  
  - Requires careful mapping of each legacy prefix into `ie-form-*` without changing semantics or endpoints.

- **Dependencies**  
  - **Foundations** and **Button** systems.  
  - Helpful if **Card** (form shells often are cards) is at least partly defined.

- **Recommended Priority**  
  - **Top-tier (Phase 2)**

- **Main Files Affected**  
  - `assets/css/site.css` (“Forms” and “Buttons & CTAs”)  
  - `contact/index.html`  
  - `estates/index.html`  
  - `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`  
  - `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`  
  - `recruitment/employer/index.html`, `recruitment/candidate/index.html`

- **Risks**  
  - Form layout or error states could break if class replacements are incomplete.  
  - Invisible functional coupling (JS selectors) may rely on old class names; these must be checked before renaming.

---

### 1.6 Disclosure System Normalization

- **Refactor Area**  
  Disclosure system normalization

- **Why It Matters**  
  - Legal/disclosure blocks are styled separately on Estates, Flavors hub, and Recruitment employer pages (`.disclosure-card`, `.disclosure-container`, `.legal-notice-text`, `.legal-notice`).  
  - These should look and feel consistent, and be easy to update.

- **Impact**  
  - Consistent legal presentation; clearer trust signals.  
  - Reduced risk of one page having outdated or misaligned legal formatting.

- **Complexity**  
  - Low–moderate: small set of blocks, but they span multiple templates.

- **Dependencies**  
  - **Card System** (disclosure cards)  
  - **Foundations** (text sizing, color roles)

- **Recommended Priority**  
  - **Medium-high (Phase 4)**

- **Main Files Affected**  
  - `assets/css/site.css` (Disclosure styles)  
  - `estates/index.html`  
  - `flavors/index.html`  
  - `recruitment/employer/index.html`  
  - Possibly `flavors/aziende-italiane/index.html` if disclosure-like blocks exist

- **Risks**  
  - Over-tightening style might hurt readability if not tested on long paragraphs.  
  - Some disclosures are also narrative; forcing them into too rigid a card format might feel off.

---

### 1.7 Timeline System Normalization

- **Refactor Area**  
  Timeline system normalization

- **Why It Matters**  
  - At least two strong multi-step flows exist (`.step-node`, `.timeline-line` on `recruitment/candidate/index.html`; `.roadmap-step`, `.roadmap-number` on `flavors/aziende-italiane/index.html`), plus process-like steps on `recruitment/employer/index.html`.  
  - These share intent but differ in implementation.

- **Impact**  
  - Clear, reusable pattern for representing multi-step journeys, recruitments flows, and advisory roadmaps.  
  - Reduces the temptation to reimplement process visuals per page.

- **Complexity**  
  - Moderate: CSS reshaping plus markup updates on a few pages.  
  - Needs coordination with Card system for step surfaces.

- **Dependencies**  
  - **Card System** (if steps are card-based)  
  - **Foundations** (spacing, colors)

- **Recommended Priority**  
  - **Medium (Phase 4)**

- **Main Files Affected**  
  - `assets/css/site.css` (Timeline system)  
  - `recruitment/candidate/index.html`  
  - `recruitment/employer/index.html`  
  - `flavors/aziende-italiane/index.html`

- **Risks**  
  - Over-generalizing could make specific narratives (e.g. Unesco roadmap) feel too generic.  
  - Timeline positioning might misalign on mobile if not tested.

---

### 1.8 Gallery / Slider Normalization

- **Refactor Area**  
  Gallery/slider normalization

- **Why It Matters**  
  - Swiper-based hero and gallery instances on `travel/gapyear`, `travel/culinary`, and `travel/bespoke` share patterns but define bullets, overlays, and slides per page.  
  - Any change to slider behavior currently requires touching each program page.

- **Impact**  
  - Unified hero slider (for Travel programs) and gallery visuals.  
  - Easier to adjust Swiper styling and overlays centrally.

- **Complexity**  
  - Moderate: CSS centralization plus ensuring JS config aligns with shared class names.

- **Dependencies**  
  - **Hero System** (for `ie-hero--swiper`)  
  - **Foundations** (colors, typography)

- **Recommended Priority**  
  - **Medium (Phase 3)**

- **Main Files Affected**  
  - `assets/css/site.css` (Gallery/slider styles)  
  - `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`  
  - `assets/js/site.js` or wherever Swiper is initialized

- **Risks**  
  - Swiper JS might break if selectors change without updating initialization code.  
  - Visual regressions in bullet / overlay readability if tokens are not tuned.

---

### 1.9 Hub System Normalization

- **Refactor Area**  
  Hub system normalization

- **Why It Matters**  
  - Travel, Flavors, and Recruitment each implement hub behavior with distinct structures (`.services-horizontal`, `.hub-grid`, `.portal-grid`), though all are variations of “multi-panel navigation”.  
  - This is a core IA pattern; inconsistent treatment makes the site feel less cohesive.

- **Impact**  
  - Unified Hub template variants: horizontal rail, three-panel hub, portal grid, and home portal.  
  - Easier to add a new hub or adjust hover/selection states.

- **Complexity**  
  - High: touches both hero + hub systems and card integration, and involves multiple major pages.

- **Dependencies**  
  - **Hero System**, **Card System**, **Button System**, **Foundations**.  
  - Should start after heroes and cards are at least partly stabilized.

- **Recommended Priority**  
  - **High (Phase 3 / 4)**

- **Main Files Affected**  
  - `assets/css/site.css` (Hub systems)  
  - `travel/index.html` (baseline hub)  
  - `flavors/index.html` (three-panel hub)  
  - `recruitment/index.html` (portal hub)  
  - `index.html` (home portal hub variant)

- **Risks**  
  - Breaking navigation flows if tile behaviors or links are mishandled.  
  - Visual misalignment between hub types if variants aren’t clearly defined.

---

### 1.10 Header/Footer Behavior Cleanup

- **Refactor Area**  
  Header/footer behavior cleanup

- **Why It Matters**  
  - Some pages override header behavior via `!important` inline rules (e.g. disabling shimmer in Flavors hub).  
  - This undermines the global chrome and makes header changes brittle.

- **Impact**  
  - Central control over header and footer look and behavior.  
  - Safer future changes to header glass/shimmer, stickiness, and nav layout.

- **Complexity**  
  - Low: main work is to introduce small modifiers (e.g. `ie-header--no-shimmer`) and replace ad-hoc overrides.

- **Dependencies**  
  - **Foundations** and `site.css` header section.  
  - No strict dependency on other systems.

- **Recommended Priority**  
  - **Medium (Phase 0 / 1)**

- **Main Files Affected**  
  - `partials/header.html`, `partials/footer.html`  
  - `assets/css/site.css` (header/footer sections)  
  - `flavors/index.html` (header overrides)  
  - Any other page with header/footer CSS inlined

- **Risks**  
  - If the new modifier is misapplied, some pages may unexpectedly lose shimmer or header behavior.  
  - Subtle sticky behavior differences may appear if not regression-tested.

---

### 1.11 Template Family Normalization

- **Refactor Area**  
  Template family normalization

- **Why It Matters**  
  - Each route has a target template (Home, Hub, Program, Advisory, Utility) but today many pages diverge from their template contracts.  
  - Without consistent templates, system refactors will be undermined by local exceptions.

- **Impact**  
  - Clear, enforceable page types, with known required systems and allowed local variation.  
  - Makes it obvious where a new page should start from.

- **Complexity**  
  - High: spans multiple pages and depends on hero, hub, card, form, and disclosure work.  
  - Primarily conceptual and markup re-structuring rather than low-level CSS.

- **Dependencies**  
  - **Hero**, **Card**, **Form**, **Hub**, **Disclosure**, **Timeline** systems at least partially in place.  
  - **Template mapping (Step 5)** as guidance.

- **Recommended Priority**  
  - **Later, but essential (Phase 5)**

- **Main Files Affected**  
  - All public HTML routes:  
    - `index.html`, `404.html`  
    - `travel/index.html`, `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`  
    - `flavors/index.html`, `flavors/for-your-home/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`  
    - `recruitment/index.html`, `recruitment/employer/index.html`, `recruitment/candidate/index.html`  
    - `contact/index.html`, `estates/index.html`

- **Risks**  
  - Over-constraining pages if template rules are applied without preserving important local storytelling.  
  - Might require copy/layout tweaks to fit into the new template contract.

---

### 1.12 Home Page Rebasing

- **Refactor Area**  
  Home page rebasing

- **Why It Matters**  
  - `index.html` is both a critical brand surface and the largest concentration of token/hero/hub duplication.  
  - If left unrebased, it will reintroduce drift after the rest of the site is normalized.

- **Impact**  
  - Ensures Home participates in the same token, button, card, and hero primitives as the rest of the site, while preserving its unique art direction.  
  - Solidifies Home as a baseline reference for the brand.

- **Complexity**  
  - High: complex inline CSS, unique layouts, and editorial sections.  
  - Should only be tackled once systems and templates are stable.

- **Dependencies**  
  - **Foundations** fully in `site.css`  
  - **Button**, **Card**, **Hero**, **Hub**, and **Header** systems in place  
  - Template normalization done enough that Home can be clearly defined as a special-case template.

- **Recommended Priority**  
  - **Last major step (Phase 6)**

- **Main Files Affected**  
  - `index.html`  
  - `assets/css/site.css` (to host formerly inline tokens and primitives)

- **Risks**  
  - Regressing Home’s visual storytelling if the rebasing is too aggressive or under-tested.  
  - Introducing circular dependencies between Home-specific CSS and global systems.

---

## 2. Phased Migration Plan

The phases below are deliberately incremental and template/system–aware. Each phase includes files to start with, what to touch vs avoid, and validation/exit criteria.

---

### Phase 0 — Preparation / Guardrails

- **Objective**  
  Put in place minimal guardrails to prevent further drift while refactors are in progress.

- **Why This Phase Comes Here**  
  - You need rules and light-touch changes before large refactors to avoid new inline tokens, new ad-hoc `.btn-*`, or header overrides creeping in.

- **Files To Touch First**  
  - `docs/PUBLIC-UI-STEP-3-GLOBAL-VS-LOCAL.md` (already written; treat as policy)  
  - `assets/css/site.css` (add comments and TODO anchors)  
  - `partials/header.html` and `partials/footer.html` (to ensure consistent inclusion)  
  - Optional: `assets/js/site.js` or linter-like scripts if you add simple checks later

- **What To Change**  
  - Add clear comment blocks in `site.css` marking:  
    - Foundations section  
    - Buttons & CTAs  
    - Cards & surfaces  
    - Hero primitives and variants  
    - Forms  
    - Hub systems  
    - Disclosure, Timeline, Gallery, Utility  
  - Adopt internal “no new inline tokens / no new local `.btn-*` / no new hero shells” rules.  
  - If needed, add a small checklist comment at top of key pages reminding contributors not to introduce new inline tokens or system-like classes.

- **What Not To Change Yet**  
  - Do not rename any classes.  
  - Do not move large CSS blocks across files yet.  
  - Do not restructure page templates.

- **Validation Checks**  
  - Manual scan of recent commits to confirm no new inline `:root` blocks, no new `.btn-*` families, no new `.hero-*` containers.  
  - `site.css` has clearly labeled sections for each system.

- **Exit Criteria**  
  - Guardrail conventions are documented and visible in `site.css` and in docs.  
  - Team is aligned that new work will be based on `ie-*` systems, not per-page styles.  

---

### Phase 1 — Foundations and Primitives

- **Objective**  
  Centralize tokens and basic primitives (buttons, core card surfaces, hero text roles) in `assets/css/site.css`, and remove duplicate token definitions from `index.html` and inline blocks.

- **Why This Phase Comes Here**  
  - All later phases depend on stable tokens and base primitives.  
  - This phase mostly moves CSS without changing layout semantics, making it a good first implementation step.

- **Files To Touch First**  
  - `assets/css/site.css`  
  - `index.html` (inline `<style>` in `<head>`)  
  - A small sample of pages with duplicated tokens/typography (e.g. `estates/index.html`, `flavors/index.html`)

- **What To Change**  
  - Move token and logo-related rules from `index.html` inline `<style>` into the Foundations section in `site.css`:  
    - `:root { --brand-gold, --brand-obsidian, --it-green, --it-red, --radius-premium, --ice-* }`  
    - `.brand-font`, `.premium-card`, `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore*`  
  - Ensure `site.css` contains the authoritative definitions for `ie-hero-*` text roles, `premium-card`, and `ie-card-*` surfaces.  
  - Introduce canonical button primitives in `site.css` (`ie-btn-primary`, `ie-btn-secondary`, `ie-btn-outline`, `ie-btn-link`) using the shared tokens.  
  - Add a minimal header modifier (e.g. `ie-header--no-shimmer`) in `site.css` to be used in later phases.

- **What Not To Change Yet**  
  - Do not update markup to use `ie-btn-*` (beyond small, carefully chosen test pages).  
  - Do not delete inline hero or card CSS yet; just centralize tokens.

- **Validation Checks**  
  - For Home and at least one Program and Advisory page, confirm visually that colors, radii, shadows, and logo behavior are unchanged after token moves.  
  - Confirm no remaining duplicate `:root` token blocks across HTML pages.  
  - Confirm button primitives exist and compile cleanly, even if not yet used everywhere.

- **Exit Criteria**  
  - All brand tokens, glass tokens, and logo mechanics live only in `site.css`.  
  - Button primitives and hero text roles exist and are ready for use.  
  - Header modifier class exists to replace per-page header overrides.

---

### Phase 2 — Forms and Buttons

- **Objective**  
  Migrate duplicated form shells and field styles to the `ie-form-*` system, and map legacy button classes to `ie-btn-*` primitives across Program/Advisory pages.

- **Why This Phase Comes Here**  
  - Forms and CTAs are the conversion core; normalizing them early yields substantial maintainability benefits.  
  - With tokens and primitives ready, forms and buttons can be unified without fighting foundational drift.

- **Files To Touch First**  
  - **Primary test/baseline pages**:  
    - `travel/gapyear/index.html` (Program baseline; form + Swiper hero)  
    - `estates/index.html` (Advisory baseline; form + disclosure)  
  - **Then apply to siblings**:  
    - `travel/culinary/index.html`, `travel/bespoke/index.html`  
    - `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`  
    - `contact/index.html`  
    - `recruitment/employer/index.html`, `recruitment/candidate/index.html`  
  - `assets/css/site.css` (“Forms” and “Buttons & CTAs”)

- **What To Change**  
  - For each chosen page:  
    - Replace per-page field/label classes (`.service-field`, `.gap-field`, `.bespoke-field`, `.aziende-*`, `.field`, `.input-label`, `.contact-intl`, `.contact-success`) with `ie-form-field`, `ie-form-label`, `ie-form-intl`, `ie-form-success`, while keeping markup structure.  
    - Replace form shell classes (`.service-contact-shell`, `.gap-contact-shell`, `.bespoke-contact-shell`, etc.) with `ie-form-section`, `ie-form-shell`, `ie-form-card`, `ie-form-grid*`, using patterns from `site.css`.  
    - Map submit buttons and key CTAs (`.service-btn`, `.gap-btn`, `.bespoke-btn`, `.enroll-btn`, `.request-info-btn`, `.hero-form-cta`) to `ie-btn-*` plus `ie-form-btn` where appropriate, ensuring CSS supports these new classes.  
  - Keep legacy class names temporarily as **aliases** in `site.css` (mapping them to `ie-*` primitives) during this phase, to avoid breaking pages mid-migration.

- **What Not To Change Yet**  
  - Do not remove legacy class definitions from `site.css` yet.  
  - Avoid touching hero containers in the same commit unless necessary; keep changes localized to forms and buttons to simplify QA.

- **Validation Checks**  
  - For each baseline page:  
    - Verify: fields still align correctly in desktop and mobile; intl-tel component still appears correctly; labels and required markers render as before.  
    - Confirm that CTAs look identical or better and that focus outlines still meet accessibility requirements.  
  - Ensure any JS that targets old form or button class names is either updated or relies on attributes/IDs instead.

- **Exit Criteria**  
  - All Program and Advisory pages use `ie-form-*` for fields and shells.  
  - All main CTAs / submit buttons on those pages use `ie-btn-*` primitives (with alias classes still in place for safety).  
  - No new `*-btn` or `*-field` classes are introduced outside the `ie-form-*` and `ie-btn-*` families.

---

### Phase 3 — Hero and Gallery Systems

- **Objective**  
  Unify hero implementations across templates using `ie-hero-*` primitives and hero variants; normalize Swiper heroes and galleries into `ie-gallery-*`.

- **Why This Phase Comes Here**  
  - Once forms and CTAs are consistent, hero unification becomes the main structural step influencing page layout.  
  - It allows Program/Hub/Advisory/Utility templates to stand on shared hero contracts.

- **Files To Touch First**  
  - **Program baseline**: `travel/gapyear/index.html`  
  - **Hub baseline**: `travel/index.html`  
  - **Utility baseline**: `404.html`  
  - `assets/css/site.css` (“Hero primitives”, hero variants, “Gallery/Slider systems”)  
  - Swiper initialization in JS (`assets/js/site.js` or similar)

- **What To Change**  
  - Introduce hero variants in `site.css`: `ie-hero--program`, `ie-hero--swiper`, `ie-hero--hub`, `ie-hero--advisory`, `ie-hero--utility`, `ie-hero--split`.  
  - For each baseline page:  
    - Replace hero container classes (`.hero-odyssey`, `.hero-swiper`, `.hero-narrative`, `.hero-coming`, etc.) with `ie-hero-shell` plus relevant `ie-hero--*` variant classes and `ie-hero-*` text roles.  
    - Move shared overlay mechanics to `.ie-hero-overlay-layer` and its modifiers; keep page-specific overlays as small local modifiers where necessary.  
  - Introduce Gallery/slider classes: `ie-gallery-swiper`, `ie-gallery-slide`, `ie-gallery-overlay`, `ie-gallery-bullet`, `ie-gallery-bullet--active`; map Swiper selectors accordingly.  
  - On Travel program pages, switch slide bullets and overlays to use these gallery classes.

- **What Not To Change Yet**  
  - Avoid fully refactoring Flavors advisory or Recruitment split heroes until the baseline variants are stable.  
  - Do not remove old hero class names from CSS until each family (Hub, Program, Advisory, Utility) has been migrated.

- **Validation Checks**  
  - On each baseline page, verify:  
    - Hero still fills viewport correctly and respects header clearance.  
    - Background images and overlays look the same or intentionally improved.  
    - Swiper heroes slide correctly, and bullets highlight active slide.  
  - Test desktop and mobile breakpoints manually.

- **Exit Criteria**  
  - `travel/gapyear`, `travel/index`, and `404` all use `ie-hero-*` primitives and hero variants exclusively in markup.  
  - Gallery/slider system (`ie-gallery-*`) works on at least one program page without regressions.  
  - Legacy hero container classes for these baseline pages are no longer required for their layout.

---

### Phase 4 — Cards, Disclosure, Timeline, and Hub Systems

- **Objective**  
  Normalize card surfaces and families, disclosure blocks, timelines, and hub layouts across key templates.

- **Why This Phase Comes Here**  
  - With tokens, buttons, forms, and heroes stable, you can safely standardize secondary systems that rely on them (cards, legal, timelines, hubs).

- **Files To Touch First**  
  - **Card & disclosure baseline**: `estates/index.html`, `flavors/index.html`, `recruitment/employer/index.html`  
  - **Timeline baseline**: `recruitment/candidate/index.html`, `flavors/aziende-italiane/index.html`  
  - **Hub baselines**: `travel/index.html`, `flavors/index.html`, `recruitment/index.html`  
  - `assets/css/site.css` (Card systems, Disclosure, Timeline, Hub)

- **What To Change**  
  - Card system:  
    - Map `.glass-card`, `.hub-glass-card`, `.disclosure-card`, `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`, `.feature-card`, `.category-card`, `.program-card`, `.location-card` to `ie-card-glass`, `ie-card-solid`, `ie-card-disclosure`, `ie-card-feature`, `ie-card-bento`, `ie-card-stat`, etc.  
  - Disclosure system:  
    - Introduce `ie-disclosure-section`, `ie-disclosure-text`, `ie-disclosure-divider` and update disclosure blocks on Estates, Flavors hub, Recruitment employer.  
  - Timeline system:  
    - Introduce `ie-timeline-shell`, `ie-timeline-line`, `ie-timeline-step`, `ie-timeline-step-number`, `ie-timeline-step-label`, `ie-timeline-step-body`.  
    - Map `.step-node`, `.timeline-line`, `.roadmap-step`, `.roadmap-number`, and any `.process-step` derivatives to these.  
  - Hub system:  
    - Introduce `ie-hub-shell`, `ie-hub-grid`, `ie-hub-rail`, `ie-hub-panel`, with variants `ie-hub--three-panel`, `ie-hub--horizontal-rail`, `ie-hub--portal`, `ie-hub--home`.  
    - Update `travel/index.html`, `flavors/index.html`, and `recruitment/index.html` grid/rail/portal markup to use these hub classes.

- **What Not To Change Yet**  
  - Do not remove all old card/hub/timeline class definitions from `site.css` in one go; keep them aliased while rolling through pages.  
  - Avoid rebasing Home’s portal hub in this phase; treat Home as a later special-case.

- **Validation Checks**  
  - For each baseline page:  
    - Confirm card surfaces still look correct and glass vs solid vs disclosure differences are preserved.  
    - Confirm legal/disclosure blocks read well and maintain spacing.  
    - Confirm timeline steps align and remain legible across breakpoints.  
    - Confirm hub tiles still behave as navigational elements and layout is intact.

- **Exit Criteria**  
  - At least one page for each system (Card, Disclosure, Timeline, Hub) uses only `ie-*` class families for that system.  
  - Old per-page class names for those systems are only present as temporary aliases, not required for layout.

---

### Phase 5 — Template Family Migrations

- **Objective**  
  Apply the normalized systems to each page family according to the template mapping, ensuring each route adheres to its template contract.

- **Why This Phase Comes Here**  
  - Systems are now mature enough to anchor templates.  
  - This phase composes existing work into coherent page families.

- **Files To Touch First**  
  - **Program family**:  
    - `travel/gapyear/index.html` (already baseline)  
    - `travel/culinary/index.html`, `travel/bespoke/index.html`  
    - `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`  
    - `recruitment/employer/index.html`, `recruitment/candidate/index.html`  
  - **Advisory family**:  
    - `estates/index.html`, `contact/index.html`  
  - **Hub family**:  
    - `travel/index.html`, `flavors/index.html`, `recruitment/index.html`  
  - **Utility family**:  
    - `404.html`, `flavors/for-your-home/index.html`

- **What To Change**  
  - For each page, align structure to its template contract from Step 5:  
    - Make sure required systems (Hero, Cards, Forms, Hub, Disclosure, Timeline, Utility) appear and use `ie-*` classes.  
    - Remove now-redundant local system-like wrappers that duplicate global behaviors.  
  - Normalize optional sections that should be shared (e.g. Advisory pages sharing a disclosure treatment).  
  - Ensure markup is annotated (even just by class names) clearly enough to identify template and system composition.

- **What Not To Change Yet**  
  - Do not fully rework Home structure; that’s reserved for Phase 6.  
  - Avoid major copy changes; keep this focused on layout and class migrations.

- **Validation Checks**  
  - For each template type, pick its **baseline page** and verify:  
    - It uses only canonical systems and primitives for its required responsibilities.  
    - Its siblings (other pages of that template) match system usage and layout roles, allowing for content differences.  
  - Spot-check conversions (form submissions), navigation flows, and error behaviours.

- **Exit Criteria**  
  - All non-Home public routes cleanly map to their templates and use shared systems; no major page still depends on page-local hero/form/button/card systems.  
  - Template mapping document remains accurate and can be used as a quick reference for future pages.

---

### Phase 6 — Home Page Rebase

- **Objective**  
  Rebase `index.html` onto the shared Foundations / Buttons / Cards / Hero primitives while preserving its unique portal and editorial layout.

- **Why This Phase Comes Here**  
  - Home is the most complex and highest-risk page; by now, global systems are stable and can support rebasing.  
  - Doing this last prevents Home from dragging system APIs around during earlier phases.

- **Files To Touch First**  
  - `index.html`  
  - `assets/css/site.css` (to absorb any remaining token or primitive logic)  

- **What To Change**  
  - Remove any remaining inline token or logo redefinitions (now fully in `site.css`).  
  - Map editorial CTAs (`.editorial-cta`, `.essence-cta`) onto `ie-btn-*` plus optional Home-specific wrappers.  
  - Ensure portal and editorial cards use `premium-card` / `ie-card-*` surfaces.  
  - Ensure hero text uses hero typographic primitives (`ie-hero-title`, `ie-hero-lead`, `ie-hero-copy`) even if container layout remains home-only.  
  - Optionally, treat the Home hub as `ie-hub--home`, built on `ie-hub-panel` + `ie-card-*`.

- **What Not To Change Yet**  
  - Do not radically change Home’s content or IA; keep this a refactor, not a redesign.  
  - Avoid extracting Home-specific CSS into a separate file unless strictly necessary.

- **Validation Checks**  
  - Before/after visual comparison of Home on desktop and mobile, focusing on hero, portal tiles, cards, and editorial sections.  
  - Smoke-test navigation from Home into other templates.  
  - Confirm no token duplication remains in Home’s `<style>`.

- **Exit Criteria**  
  - `index.html` uses shared tokens and primitives; only truly unique Home art-direction CSS remains page-local.  
  - No `index.html` CSS redefines brand colors, radii, or logo behavior.

---

### Phase 7 — Deprecation and Cleanup

- **Objective**  
  Remove legacy class definitions and inline styles that have been fully replaced by canonical systems; tidy CSS and docs.

- **Why This Phase Comes Here**  
  - Only safe after systems and templates are in use across all pages.  
  - This locks in the new architecture and reduces cognitive load for future contributors.

- **Files To Touch First**  
  - `assets/css/site.css` (remove old aliases, dead selectors)  
  - Inline `<style>` blocks across pages  
  - `docs/PUBLIC-UI-STEP-1–6` (update references to legacy classes where necessary)

- **What To Change**  
  - For each system, delete legacy selectors that are no longer referenced in any HTML:  
    - Old hero containers (`.hero-coming`, `.contact-hero`, etc.)  
    - Old button classes (`.btn-gold`, `.service-btn`, `.gap-btn`, etc.)  
    - Old form prefixes (`.service-*`, `.gap-*`, `.bespoke-*`, `.aziende-*`)  
    - Card aliases (`.glass-card`, `.hub-glass-card`, `.feature-card`, etc.)  
    - Timeline and hub-specific local names now replaced by `ie-*`.  
  - Strip out any inline `<style>` blocks that no longer contain page-unique art direction.  
  - Optionally, reorder `site.css` sections for clarity and add final comments.

- **What Not To Change Yet**  
  - Do not remove any legacy selector that’s still referenced in any HTML; run a search before deleting.  
  - Avoid changing system APIs (class names) in this phase; this is cleanup, not redesign.

- **Validation Checks**  
  - Run a global search for each removed legacy selector in the repo.  
  - Load all public pages and visually confirm no obvious broken styles (esp. heroes, buttons, forms, cards).  
  - Confirm CSS bundle size decreases or at least doesn’t grow.

- **Exit Criteria**  
  - Legacy classes are gone or isolated to rare, deliberate exceptions.  
  - All shared responsibilities are handled by `ie-*` systems and tokens, with minimal page-local styling.  

---

## 3. First Real Implementation Sequence

This is the very first concrete execution path a developer should follow when starting implementation.

1. **Stabilize foundations in `site.css`**  
   - Move the `:root` token block and shared logo mechanics from `index.html` into the Foundations section of `assets/css/site.css`.  
   - Confirm no other page still defines `:root` tokens.

2. **Define canonical button primitives**  
   - In `site.css`, create `ie-btn-primary`, `ie-btn-secondary`, `ie-btn-outline`, `ie-btn-link` using existing gold/obsidian tokens and premium radius/shadows.  
   - Add `ie-form-btn` as a thin wrapper for form submit buttons.

3. **Normalize one Program page’s form and buttons**  
   - On `travel/gapyear/index.html`, replace `.gap-field`, `.gap-label`, `.gap-intl`, `.gap-success`, `.gap-btn` with `ie-form-field`, `ie-form-label`, `ie-form-intl`, `ie-form-success`, `ie-form-btn ie-btn-primary`.  
   - Keep `.gap-*` classes as temporary HTML classes, but ensure visual behavior is fully provided by `ie-*`.

4. **Normalize one Advisory page’s form and disclosure**  
   - On `estates/index.html`, convert `.service-contact-shell`, `.service-contact-card`, `.service-field`, `.service-intl`, `.service-success`, `.service-btn` to `ie-form-*` + `ie-btn-*`.  
   - Map `.disclosure-card` + `.legal-notice-text` to `ie-card-disclosure` + `ie-disclosure-text`.

5. **Extract Utility hero system from 404**  
   - In `404.html`, wrap hero markup in `ie-hero-shell ie-hero--utility`, using hero primitives for background, overlay, and content.  
   - Replace `.btn-gold` / `.btn-outline` with `ie-btn-primary` / `ie-btn-outline`, keeping old classes as temporary aliases.  
   - Move shared utility hero CSS into `site.css`.

6. **Apply Utility hero to `flavors/for-your-home`**  
   - Replace `flavors/for-your-home/index.html` hero markup and classes with the canonical Utility hero structure from `404.html`.  
   - Remove duplicated hero/button CSS from its inline `<style>`.

7. **Normalize Travel hub hero + rail**  
   - On `travel/index.html`, convert `.hero-narrative` hero to `ie-hero-shell ie-hero--hub` and `.services-horizontal` rail to `ie-hub-shell ie-hub--horizontal-rail` + `ie-hub-panel` using card primitives.  
   - Map `.btn-panel` CTAs to `ie-btn-*`.

8. **Normalize Gap Year Swiper hero and gallery**  
   - On `travel/gapyear/index.html`, convert `.hero-odyssey` / `.hero-swiper` / `.hero-slide` to `ie-hero-shell ie-hero--swiper` + `ie-gallery-swiper ie-gallery-slide`.  
   - Map `.swiper-pagination-bullet` classes to `ie-gallery-bullet` / `ie-gallery-bullet--active`.

9. **Propagate Program template to Culinary and Bespoke**  
   - Apply the same Program + Gallery + Form mapping from Gap Year to `travel/culinary/index.html` and `travel/bespoke/index.html`.

10. **Update Flavors and Recruitment hubs to shared hub system**  
    - Normalize `flavors/index.html` to `ie-hero--hub` + `ie-hub--three-panel`.  
    - Normalize `recruitment/index.html` to `ie-hub--portal`.  
    - Replace header shimmer overrides with the global `ie-header--no-shimmer` modifier where needed.

11. **Only then begin Home rebasing**  
    - After the above steps are working, start mapping Home’s CTAs, cards, and tokens onto shared systems, keeping layout mostly intact.

---

## 4. Recommended First Pages to Convert

Using baseline/outlier logic from Step 5, these are the first pages that should be migrated and why:

- **`travel/gapyear/index.html` (Program baseline)**  
  - Rich exercise in **Hero (swiper)**, **Cards**, **Gallery**, **Forms**, and **Buttons** all together.  
  - Siblings (Culinary, Bespoke) are structurally similar, so work here generalizes quickly.

- **`estates/index.html` (Advisory baseline)**  
  - Combines **Advisory hero**, **glass/disclosure cards**, **legal text**, and **Advisory form**.  
  - Normalizing it creates strong building blocks for Contact and Flavors advisory pages.

- **`travel/index.html` (Hub baseline)**  
  - Clean example of **Hub** with narrative hero and horizontal rail; less header override noise than Flavors hub.  
  - Provides a stable contract for `ie-hub--horizontal-rail`.

- **`404.html` (Utility baseline)**  
  - Small but high-leverage surface — defines **Utility hero** and shared button system for status pages.  
  - Enables fast follow on `flavors/for-your-home/index.html`.

- **`flavors/index.html` (Hub strong reference)**  
  - Ideal to use after Travel hub: defines **three-panel hub** variant plus disclosure usage.  
  - Includes header shimmer overrides that should be normalized via header modifiers.

- **`flavors/aziende-italiane/index.html` (High-value outlier)**  
  - Once core systems are in place, this page will stress-test **Timeline**, **Advisory hero (split)**, **Cards**, and **Forms** together.  
  - It should be converted only after Program and Advisory baselines are stable, but before Home.

---

## 5. Safe Deprecation Rules

- **When a legacy class can be removed**  
  - The class is **not referenced** in any HTML page (checked via repo-wide search).  
  - The visual behavior it once provided is now fully handled by an `ie-*` system or token.  
  - At least one full release cycle (or a defined period) has passed since the last migration that touched that system, with no regressions reported.

- **When it should temporarily coexist**  
  - During migration of a system family (e.g. forms), both the legacy class and new `ie-*` class may be present in markup, but:  
    - CSS should define the behavior **via `ie-*`**, with the legacy class acting only as an alias selector.  
    - New code must never introduce additional usages of the legacy class; it is read-only and shrinking.

- **How to avoid breaking pages mid-migration**  
  - Stage changes by template family and by baseline page first; only propagate once they’re visually verified.  
  - For each system, follow a three-step cycle:  
    1. **Add** `ie-*` system classes and CSS, keep legacy CSS unchanged.  
    2. **Update markup** to add `ie-*` alongside legacy classes; ensure visuals are identical.  
    3. **Switch CSS** to rely on `ie-*` and make legacy selectors thin aliases, then clean them up in Phase 7.  
  - Never remove a selector until both HTML and CSS confirm it is unused.

- **What should never be deleted early**  
  - **Token definitions** in `site.css` (`:root` variables, `premium-card`, `ie-hero-*`, `ie-form-*`, `ie-btn-*`, `ie-card-*`) — these are the new core.  
  - **Header/footer selectors** that power `partials/header.html` and `partials/footer.html`.  
  - Any **JS hooks** that rely on specific classes or IDs until they are explicitly migrated to new selectors or data attributes.  
  - The inline art-direction CSS that is truly unique to a page (e.g. map glow and Unesco-specific gradients) unless you have a deliberate plan to move or redesign them.

---

## 6. Deferrable Work

These tasks can safely wait until after the main migration without harming the architecture:

- **Optional partial extraction**  
  - Turning shared systems (e.g. Advisory hero, Program contact form) into `partials/*.html` is valuable but optional.  
  - Defer until systems are stable and the benefit of extraction is clear.

- **Deeper Home-page polish**  
  - After Home is rebased on shared tokens and primitives, further aesthetic refinements (animations, editorial layouts) can be done later without risking global architecture.

- **Secondary utility variants**  
  - Alternate Utility hero flavors (maintenance mode, scheduled downtime pages) can be handled once `ie-hero--utility` is proven in 404 and Flavors for-your-home.

- **Minor Tailwind cleanups**  
  - Converting every lingering `py-24`, `py-28` to `.ie-section-*` is desirable but not required for initial migration; focus first on high-impact sections.

- **Route-specific micro-interactions**  
  - Small hover tweaks, micro-animations, and one-off transitions can be added after the systems are in place, as long as they don’t reintroduce new primitives.

---

## 7. Go / No-Go Checkpoint

Before starting code changes, confirm:

- **Documentation sufficiency**  
  - Steps 1–5 plus this migration plan clearly specify:  
    - Canonical systems (`ie-*` naming and responsibilities).  
    - Template mapping for each public route.  
    - Migration phases and first concrete implementation sequence.  
  - A developer can answer, for any given class: “Which system does this belong to, and what is its keep/migrate/deprecate status?”

- **Minimum conditions for coding to start**  
  - Agreement that **`assets/css/site.css` is the single source of truth** for Foundations, Primitives, and Systems (no new tokens or systems inline).  
  - Consensus on the **baseline pages for Program, Advisory, Hub, and Utility**:  
    - Program: `travel/gapyear/index.html`  
    - Advisory: `estates/index.html`  
    - Hub: `travel/index.html` (with Flavors and Recruitment as follow-ons)  
    - Utility: `404.html`  
  - A shared understanding that **Home (`index.html`) will be tackled last**, after other templates are stable.

If those conditions are met, **this migration blueprint is sufficient to begin implementation**, starting with Phase 0/1 and the “First Real Implementation Sequence” outlined above.

