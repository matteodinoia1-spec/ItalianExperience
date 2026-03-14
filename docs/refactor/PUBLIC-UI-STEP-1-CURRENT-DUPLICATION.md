## Public UI current duplication analysis (Step 1)

**Scope**: Static public site under `/ItalianExperience` (excluding `portal/**`).  
**Sources**: `index.html`, `404.html`, `contact/index.html`, `estates/index.html`, `flavors/**`, `recruitment/**`, `travel/**`, shared CSS/JS, `partials/header.html`, `partials/footer.html`.

---

## 1. Duplicated UI patterns across pages

### 1.1 Hero implementations

- **Shared hero system (KEEP, canonical)**
  - **Patterns / classes**:
    - Shell: `.ie-hero-shell`, `.ie-hero-offset`, `.ie-hero-bg-layer`, `.ie-hero-overlay-layer`, `.ie-hero-content-layer`, `.ie-hero-lockup`
    - Typographic primitives: `.ie-hero-eyebrow`, `.ie-hero-title`, `.ie-hero-title-compact`, `.ie-hero-lead`, `.ie-hero-copy`
    - Scroll affordance: `.explore-indicator`, `.scroll-track`, `.scroll-dot`
  - **Where found**:
    - `404.html` (hero uses `.ie-hero-shell ie-hero-offset`, `.ie-hero-lockup`, `.ie-hero-copy`)
    - `contact/index.html` (`.contact-hero ie-hero-shell ie-hero-offset`, `.ie-hero-title`, `.ie-hero-copy`)
    - `estates/index.html` (`.estates-hero ie-hero-shell`, `.ie-hero-eyebrow`, `.ie-hero-title`, `.ie-hero-copy`)
    - `flavors/index.html` (`.hub-grid ie-hero-shell hero--flavors`, `.ie-hero-content-layer.hero-layout--split`)
    - `recruitment/index.html` (`.ie-hero-shell recruitment-portal`)
    - `travel/index.html` (`.hero-narrative ie-hero-shell ie-hero-offset`)
    - `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`
    - `recruitment/employer/index.html`, `recruitment/candidate/index.html`
    - `flavors/for-your-home/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`
  - **Notes**:
    - This is the de-facto canonical hero layout and typography system defined in `assets/css/site.css`.
    - Many pages combine these with page-local hero container classes and inline `<style>` definitions.

- **Page-specific hero shells duplicating system responsibilities (MIGRATE / DEPRECATE where overlapping)**
  - **Examples**:
    - `404.html` inline:
      - `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.coming-title`, `.coming-sub`, `.coming-actions`, `.btn-gold`, `.btn-outline`
    - `contact/index.html` inline:
      - `.contact-hero`, `.hero-bg`, `.hero-overlay`, `.contact-wrapper`, `.contact-card`, `.contact-meta`, `.gold-line`, `.contact-footnote`
    - `estates/index.html` inline:
      - `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates`, `.glass-card`, `.gold-divider`, `.disclosure-card`
    - `flavors/index.html` inline:
      - `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`, `.hub-disclaimer`
    - `travel/index.html` inline:
      - `.hero-narrative`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.services-horizontal`, `.service-panel`, `.panel-bg`, `.btn-panel`
    - `travel/gapyear/index.html` inline:
      - `.hero-odyssey`, `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`
    - `travel/culinary/index.html` inline:
      - `.hero-culinary`, `.hero-swiper`, `.hero-overlay-content`
    - `travel/bespoke/index.html` inline:
      - `.hero-odyssey`, `.hero-swiper`, `.hero-overlay-content`
    - `recruitment/employer/index.html` inline:
      - `.hero-staffing`, `.hero-content` (re-implements sizing), `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`
    - `recruitment/candidate/index.html` inline:
      - `.hero-split-container`, `.hero-side`, `.side-italy`, `.side-usa`, `.hero-overlay-final`, `.glass-card`, `.step-node`, `.timeline-line`
    - `flavors/for-your-home/index.html` inline:
      - Reuses `404`-style `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.soon-badge`, `.btn-gold`, `.btn-outline`, `.coming-*`
    - `flavors/for-your-business/index.html` inline:
      - `.business-hero`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.feature-card`, `.category-card`, `.category-overlay`
    - `flavors/aziende-italiane/index.html` inline:
      - `.hero-split`, `.hero-image`, `.advisory-section`, `.export-map-wrapper`, `.info-badge`, `.roadmap-step`, `.roadmap-number`
  - **Structural issue**:
    - Multiple hero “families” recreate container, background, overlay, content alignment, and scroll-indicator behaviors rather than leaning fully on the `.ie-hero-*` primitives.
  - **Recommendation**:
    - **MIGRATE** common hero container behaviors (full-height, background handling, overlay gradients, vertical spacing) into the shared `.ie-hero-*` system and page-neutral modifiers (e.g. `.ie-hero--hub`, `.ie-hero--split`, `.ie-hero--swiper`).
    - **DEPRECATE** bespoke hero container class names once pages are switched to the canonical modifiers.
    - **KEEP_PAGE_LOCAL** only page-unique visual treatments (e.g. specialized SVG maps, complex split layout for `flavors/aziende-italiane`).

- **Home page bespoke hero (KEEP, but isolate as home-only)**
  - **Patterns / classes**:
    - Desktop: `.hero-container-root`, `.hero-top-nav`, `.hero-logo-container`, `.hero-pure-logo`, `.hero-portal-wrapper`, `.hero-pillar`, `.hero-glass-card`, `.hero-submenu-list`, `.hero-scroll-indicator`
    - Mobile: `.portal-container`, `.portal-card`, `.card-bg`, `.logo-interaction-area`, `.card-content`, `.card-label`, `.card-title.fit-title`, `.card-cta`
  - **Where found**: `index.html` only.
  - **Notes**:
    - This is effectively a *home-specific hero+hub* system, separate from the generic `.ie-hero-*` pages.
  - **Recommendation**:
    - **KEEP** as the canonical “Home / portal” hero system but **MIGRATE** the token-level styles (CSS variables, base typography, shared logo behaviors) out of `index.html` into `site.css`.

### 1.2 Buttons and CTAs

- **Shared / system-level button primitives (MIGRATE into a canonical button family)**
  - **Patterns / classes**:
    - From `assets/css/site.css` and inline:
      - `.hero-form-cta` (hero “contact form” CTA)
      - `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.ie-form-btn` (form submit CTAs)
      - `.btn-gold`, `.btn-outline` (404 + “coming soon” pattern, also reused in `flavors/for-your-home`)
      - `.enroll-btn` (gap year cards)
      - `.editorial-cta`, `.essence-cta` (home page)
      - `.cta-button` (recruitment portal tiles)
      - `.btn-panel` (travel hub panels)
      - `.request-info-btn` (culinary “Request Information”)
      - Header-level CTAs: `.hero-contact-link`, `.contact-desktop`, `.contact-mobile`
  - **Structural issue**:
    - These buttons share very similar visual DNA:
      - Gold border, uppercase, high letter spacing, pill or rounded corners, glass/blur backgrounds, hover transitions that invert gold/black.
    - The rules are spread across:
      - `index.html` inline `<style>`
      - Page-specific `<style>` blocks (404, contact, travel, gapyear, culinary, bespoke, employer, candidate, flavors home/business)
      - Shared `site.css` segments (the bottom section unifying CTAs and radius).
  - **Recommendation**:
    - **MIGRATE** to a minimal canonical hierarchy:
      - e.g. `.ie-btn-primary`, `.ie-btn-secondary`, `.ie-btn-outline`, `.ie-btn-link`.
    - Map legacy classes:
      - `.btn-gold`, `.hero-form-cta`, `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn`, `.editorial-cta`, `.essence-cta`, `.request-info-btn` → **MIGRATE** to canonical `.ie-btn-*` tokens and **DEPRECATE** old class names post-migration.
      - Header links (`.hero-contact-link`, `.contact-desktop`, `.contact-mobile`) → **KEEP** but normalize as “nav-level CTA” variant (shared) with tailored positioning per layout.

### 1.3 Card systems

- **Glass / premium cards (KEEP as one system, normalize names)**
  - **Patterns / classes**:
    - Shared tokens: `.premium-card`, `.ie-card`, `.ie-card-glass`, `.ie-card-solid`, `.ie-card-hover`, `.ie-card-panel`, `.ie-card-panel-thick`
    - Page-level card shells:
      - Estates: `.glass-card`, `.disclosure-card`
      - Gap year: `.program-card`, `.location-card`
      - Culinary: `.support-card`, `.service-contact-card`, `.service-contact-meta`
      - Bespoke: `.location-card`, `.bespoke-contact-card`
      - Flavors hub: `.hub-glass-card`
      - Recruitment employer: `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`
      - Flavors business: `.feature-card`, `.category-card`
      - Flavors aziende: `.glass-card`, `.info-badge`
      - Recruitment candidate: `.glass-card` (timeline), `.step-node`
      - Portal/home: `.portal-card.hero-card.premium-card`, `.card-bg`, `.quote-box`
  - **Where found**: multiple pages across travel, flavors, recruitment, estates.
  - **Structural issue**:
    - Many of these classes are subsequently aliased into `.premium-card` via `site.css` (radius/blur unification), but naming is inconsistent and intent (card vs. panel vs. disclosure) is not encoded.
  - **Recommendation**:
    - **KEEP** `.premium-card` as the base “glass” token and **MIGRATE** card shells into a small surface taxonomy:
      - e.g. `.ie-card-glass`, `.ie-card-solid`, `.ie-card-disclosure`, `.ie-card-panel`.
    - **DEPRECATE** one-off container names where they are purely stylistic and not semantic (e.g. raw `.glass-card` used in multiple unrelated pages).

### 1.4 Layout wrappers, section spacing, containers, grids

- **Header and layout shell (KEEP)**
  - `partials/header.html` + `assets/css/site.css`:
    - Header glass shell: `.glass-header`, `#main-header.glass-header`, `.header-main-row`
    - Navigation containers: `.nav-container-desktop`, `.nav-container-mobile`, `.mobile-nav-item`, `.mobile-submenu`, `.dropdown`, `.dropdown-menu`
    - Logo system: `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore-line`
  - Pages that mount header/footer:
    - All non-home routes use `<div id="site-header"></div>`, `<div id="site-footer"></div>` plus `assets/js/bootstrap.js` → dynamic partial injection.
  - **Recommendation**:
    - **KEEP** this as the canonical shell; avoid page-specific header overrides unless absolutely necessary (see flavors `hub-grid` note below).

- **Section spacing and wrappers (MIGRATE usage, clean up drift)**
  - Shared tokens in `site.css`:
    - Spacing: `--ie-space-section-y`, `--ie-space-section-y-mobile`, `.ie-section-core`, `.ie-section-dense`, `.ie-form-section`, `.service-contact`, `.bespoke-contact`, `.gap-contact`
  - Tailwind spacing scattered across pages:
    - Many sections use `py-24`, `py-28`, `py-32`, `py-48`, `px-6`, `px-8`, `px-10` variants directly instead of the shared tokens.
  - **Structural issue**:
    - Both Tailwind utilities and CSS tokens are used for vertical rhythm, leading to inconsistent section spacing.
  - **Recommendation**:
    - **MIGRATE** recurring section types (hero follow-up content, disclosures, form sections) to `.ie-section-core` / `.ie-section-dense` where possible.
    - **KEEP_PAGE_LOCAL** only when a section needs clearly distinct rhythm (e.g. extremely tall immersive galleries).

- **Grid systems (KEEP, but converge on shared patterns)**
  - Card / hub grids:
    - `.portal-grid` (recruitment), `.services-horizontal` (travel hub horizontal layout), `.hub-grid` (flavors hub), `.editorial-grid` (home), `.service-grid.ie-form-grid`, `.gap-grid`, `.bespoke-grid`, `.split-content`
  - **Recommendation**:
    - **MIGRATE** toward a small set of named grid primitives:
      - e.g. `.ie-grid-two-up`, `.ie-grid-three-up`, `.ie-grid-form`, `.ie-grid-feature`.
    - **DEPRECATE** semantically vague names (`.services-horizontal`, `.split-content`) once pages are mapped onto shared grids.

### 1.5 Form shells and fields

- **Shared form system (KEEP, canonical)**
  - **Patterns / classes**:
    - Shell: `.ie-form-section`, `.ie-form-shell`, `.ie-form-meta`, `.ie-form-card`
    - Grid: `.ie-form-grid`, `.ie-form-grid--responsive`, `.ie-form-grid--single`, `.ie-form-full`
    - Labels: `.ie-form-label.is-required`
    - Fields: `.ie-form-field`, `.ie-form-field--lg`, `.ie-form-select`, `.ie-form-select--lg`, `.ie-form-textarea`, `.ie-form-intl`
    - Utility: `.ie-form-success`
  - **Where found**:
    - `estates/index.html` (`.service-contact-shell`, `.service-contact-card` wired into `.ie-form-*`)
    - `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`
    - `recruitment/employer/index.html`, `recruitment/candidate/index.html`
    - `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`
  - **Recommendation**:
    - **KEEP** these as the single global form system.
    - **MIGRATE** legacy `.field`, `.input-label`, `.service-field` etc. into the `.ie-form-*` naming.

- **Legacy / page-specific form classes (MIGRATE / DEPRECATE)**
  - Examples:
    - `contact/index.html`: `.field`, `.input-label`, `.contact-intl`, `.contact-success`
    - `estates/index.html`: `.service-contact`, `.service-contact-shell`, `.service-contact-meta`, `.service-contact-card`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-btn`, `.service-success`
    - `travel/gapyear/index.html`: `.gap-contact`, `.gap-contact-shell`, `.gap-contact-meta`, `.gap-contact-card`, `.gap-grid`, `.gap-label`, `.gap-field`, `.gap-intl`, `.gap-full`, `.gap-btn`, `.gap-success`
    - `travel/bespoke/index.html`: `.bespoke-contact`, `.bespoke-contact-shell`, `.bespoke-contact-meta`, `.bespoke-contact-card`, `.bespoke-grid`, `.bespoke-label`, `.bespoke-field`, `.bespoke-intl`, `.bespoke-full`, `.bespoke-btn`, `.bespoke-success`
    - `flavors/for-your-business/index.html`: `.service-contact`, `.service-contact-shell`, `.service-contact-meta`, `.service-contact-card`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-btn`, `.service-success`
    - `flavors/aziende-italiane/index.html`: `.service-contact`, `.service-contact-shell`, `.service-contact-meta`, `.service-contact-card`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-btn`, `.service-success`
  - **Structural issue**:
    - Nearly identical form shells, grids, and field styles are redefined per service page with different prefixes (`service-`, `gap-`, `bespoke-`, `aziende-`), even though `site.css` already implements a shared `ie-form-*` layer.
  - **Recommendation**:
    - **MIGRATE** these to the shared `ie-form-*` naming and shared selectors in `site.css`.
    - **DEPRECATE** prefixed variants once mappings are in place; keep only semantic differences (e.g. copy, headings).

---

## 2. Inline `<style>` blocks classification

### 2.1 Home page (`index.html`)

- **Inline block**: very large `<style>` in `<head>` defining:
  - Tokens: `:root { --brand-gold, --brand-obsidian, --it-green, --it-red, --radius-premium, --ice-* }`, base `html, body`, `.brand-font`, `.premium-card`.
  - Interaction systems: `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore`, `.fit-title`, `.reveal`, `.scroll-indicator`, `.scroll-track`, `.scroll-dot`.
  - Hero / layout: `.portal-wrapper`, `.portal-pillar`, `.pillar-bg`, `.pillar-inner`, `.label`, `.gold-line`, `.title-portal`, `.description`, `.essence-section`, `.essence-card`, `.editorial-section`, `.editorial-grid`, `.quote-box`, `.footer-bar`.
  - Mobile: `.portal-container`, `.portal-card`, `.hero-overlay`, `.logo-interaction-area`, `.card-desc`, `.card-cta`, `.mobile-editorial`, `.mobile-footer`, `.copyright`.
  - New hero experiment: `.hero-container-root`, `.hero-top-nav`, `.hero-contact-link`, `.hero-logo-container`, `.hero-pure-logo`, `.hero-tricolore-line`, `.hero-portal-wrapper`, `.hero-pillar`, `.hero-glass-card`, `.hero-submenu-list`, `.hero-scroll-indicator`.
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - Token definitions and global resets (`:root` variables, `html, body`, `.brand-font`, `.premium-card`).
    - Shared logo classes `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore*` (already partially replicated in `site.css`).
    - Generic helper classes `.reveal`, `.scroll-indicator`, `.scroll-track`, `.scroll-dot`, `.desktop-only`, `.mobile-only`.
  - **KEEP_PAGE_LOCAL**:
    - Home-specific “portal pillar” layout and interactions:
      - `.portal-wrapper`, `.portal-pillar`, `.pillar-bg`, `.pillar-inner`, `.label`, `.gold-line`, `.title-portal`, `.description`, `.hero-glass-card` behaviors, `.hero-pillar-*`.
    - Home-specific editorial/essence section styling that doesn’t repeat elsewhere.

### 2.2 `404.html` and “coming soon” pages (`flavors/for-your-home/index.html`)

- **Shared pattern**:
  - Classes: `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.soon-badge`, `.pulse-dot`, `.coming-title`, `.coming-sub`, `.coming-divider`, `.coming-actions`, `.btn-gold`, `.btn-outline`.
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - Whole “coming soon / utility hero” system as a shared hero variant, since it is re-used.
    - `.btn-gold`, `.btn-outline` should move under the canonical button system (and then map to `.ie-btn-*`).
  - **REPLACE_WITH_TAILWIND**:
    - Minor alignment and spacing rules inside `.coming-actions` (flex alignment, gap) could be simplified to Tailwind utilities atop shared tokens.

### 2.3 `contact/index.html`

- **Inline block**:
  - Layout and hero: `.contact-hero`, `.hero-bg`, `.hero-overlay`, `.contact-wrapper`, `.contact-card`, `.contact-meta`, `.gold-line`, `.contact-footnote`.
  - Responsive tweaks for mobile on hero and wrapper.
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - `.contact-wrapper` grid behavior belongs under shared hero/content layout for “Conversion” templates.
    - `.contact-card` can be another `ie-card` variant (form card).
  - **MIGRATE / DEPRECATE**:
    - `.contact-hero`, `.hero-bg`, `.hero-overlay` should be folded into `.ie-hero-shell` + modifiers (`.ie-hero--conversion`), and the bespoke names deprecated post-migration.
  - **KEEP_PAGE_LOCAL**:
    - Minor visual details like `background-image` URL on `.hero-bg` (once moved to CSS) remain specific to contact hero.

### 2.4 `estates/index.html`

- **Inline block**:
  - Hero: `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates`.
  - Utility: `.glass-card`, `.gold-divider`, `.disclosure-card`, `.legal-notice-text`.
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - `.legal-notice-text` can be a shared “legal / disclosure text” style.
    - `.disclosure-card` should map to the canonical disclosure card (`.ie-card-disclosure`).
  - **MIGRATE / DEPRECATE**:
    - `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates` → integrate into hero system modifiers; deprecate local names.
  - **KEEP_PAGE_LOCAL**:
    - If any estates-only gradient tuning is required, that can be a small modifier class (e.g. `.ie-hero--estates-bg`) retained as local.

### 2.5 `flavors/index.html` (hub)

- **Inline block**:
  - `.hub-grid`, `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`, `.hub-sub`, `.hub-disclaimer`, `.split-content`, `.disclosure-container`, `.legal-notice-text`, `.lang-divider`.
  - Header overrides for shimmer (`#main-header.glass-header::after`, `.hub-grid .hub-panel::after`).
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - `.legal-notice-text` pattern and `.disclosure-container` can share with `estates` and other legal sections.
    - Hub layout scaffolding (`.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`) can be the canonical “Hub” template system.
  - **MIGRATE / DEPRECATE**:
    - Header shimmer overrides should migrate into a small, shared “disable shimmer” utility (e.g. `.ie-no-header-shimmer`) instead of inline rules.
  - **KEEP_PAGE_LOCAL**:
    - `Italiano/English` copy-specific typography in `.split-content` where the bilingual layout is unique to this hub.

### 2.6 `travel/index.html`

- **Inline block** for hub-style services:
  - `.hero-narrative`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.gold-line`, `.btn-panel` plus responsive behaviors.
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - Shared hub “rail” layout (`.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.gold-line`, `.btn-panel`) is used conceptually like flavors hub and should become a shared system (e.g. “horizontal rail” template).
  - **MIGRATE / DEPRECATE**:
    - Custom hero container naming (`.hero-narrative`, `.hero-bg`, `.hero-overlay`) into `.ie-hero-*` modifiers.

### 2.7 `travel/gapyear`, `travel/culinary`, `travel/bespoke`

- **Inline blocks**:
  - All three rely on Swiper-based hero carousels with nearly identical pattern classes:
    - `.hero-odyssey` / `.hero-culinary`, `.hero-swiper`, `.swiper-wrapper`, `.swiper-slide.hero-slide`, `.hero-overlay-content`.
  - Gap year adds `.atmospheres-section`, `.location-swiper`, `.location-card`, `.location-info`, `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`.
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - Swiper hero wrapper and overlay classes should be generalized into a single “carousel hero” variant (`.ie-hero--swiper` with `.ie-hero-carousel` children).
    - Location/atmosphere cards and pagination styles can be a shared “strip gallery” system used by both Gap Year and Bespoke.
  - **KEEP_PAGE_LOCAL**:
    - Chart- and program-specific color tokens (icons in gap year cards) are safe as one-off page accents.

### 2.8 Recruitment pages (`recruitment/employer`, `recruitment/candidate`)

- **Employer**
  - Inline block provides:
    - Hero: `.hero-staffing`, `.hero-swiper`, `.hero-slide`, `.hero-content.ie-hero-lockup` overrides.
    - Content: `.bento-card`, `.info-box`, `.chart-container`, `.economic-chart-box`, `.economic-stat-box`, `.legal-notice`, `.process-step`, `.economic-stat-box`.
- **Candidate**
  - Inline block provides:
    - Hero: `.hero-split-container`, `.hero-split-bg`, `.hero-side.side-italy/side-usa`, `.hero-overlay-final`, `.hero-content.ie-hero-lockup`.
    - Systemic components: `.glass-card`, `.step-node`, `.timeline-line`, `.service-checks`, `.service-check`, `.service-note`, `.service-file`.
- **Classification**:
  - **MOVE_TO_SHARED_CSS**:
    - `.legal-notice` style should be unified with `estates`/`flavors` disclosures.
    - Reusable process steps and “numbered timeline” (.process-step / .roadmap-step / .step-node equivalents) should be centralized as a single “timeline” system.
    - Shared card primitives (bento, info boxes) can reuse `.ie-card-*` tokens.
  - **KEEP_PAGE_LOCAL**:
    - Candidate’s split Italy/USA hero is conceptually unique, but should still reuse shared hero typographic tokens.

### 2.9 Flavors sub-pages (`for-your-home`, `for-your-business`, `aziende-italiane`)

- **For Your Home**
  - Reuses `404` “coming soon” styles almost verbatim.
  - **Classification**: see 2.2 – **MOVE_TO_SHARED_CSS** for the entire “coming soon” hero, then **DEPRECATE** page-level duplicates.

- **For Your Business**
  - Business hero + product categories inline:
    - `.business-hero`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.feature-card`, `.category-card`, `.category-img`, `.category-overlay`, `.category-line`.
  - **Classification**:
    - **MOVE_TO_SHARED_CSS**:
      - `.feature-card` and `.category-card` should map to shared card primitives.
    - **MIGRATE / DEPRECATE**:
      - The hero container can be migrated into `.ie-hero-*` with a “business hero” modifier; local `.business-hero` can be deprecated.

- **Aziende Italiane**
  - Complex inline block:
    - `.hero-split`, `.hero-image`, `.hero-content`, `.advisory-section`, `.glow-bg`, `.export-map-wrapper`, `.route-line`, `.hub-point`, `.info-badge`, `.unesco-text`, `.gold-line-long`, `.glass-card`, `.roadmap-step`, `.roadmap-number`.
  - **Classification**:
    - **MOVE_TO_SHARED_CSS**:
      - `.info-badge`, `.roadmap-step`, `.roadmap-number` patterns are reusable across advisory pages.
      - `.export-map-wrapper` is a candidate for a generic “map card” style, but the SVG inside is page-specific.
    - **KEEP_PAGE_LOCAL**:
      - The actual SVG map animations and the Unesco-specific gradient text remain unique to this advisory page.

---

## 3. Classification table (KEEP / MIGRATE / DEPRECATE)

> This table focuses on high-impact patterns; many minor Tailwind utilities are intentionally omitted.

| Pattern / Class / Selector            | Where Found (examples)                                                                 | Purpose                                                | Recommended Action | Notes |
|--------------------------------------|----------------------------------------------------------------------------------------|--------------------------------------------------------|--------------------|-------|
| `.ie-hero-shell` / `.ie-hero-*`      | `404.html`, `contact`, `estates`, `travel/*`, `flavors/*`, `recruitment/*`            | Canonical hero layout/typography system                | **KEEP**           | Use as base for all heroes; extend with modifiers, not new shells. |
| `.hero-coming` / `.coming-*`         | `404.html`, `flavors/for-your-home`                                                   | “Coming soon” / utility hero                           | **MIGRATE**        | Move to `site.css` as `ie-hero--utility`; remove per-page duplication. |
| `.contact-hero`                      | `contact/index.html`                                                                   | Contact hero container                                 | **MIGRATE**        | Map to `.ie-hero-shell` + `ie-hero--conversion` modifier; deprecate. |
| `.estates-hero`, `.hero-bg-estates`  | `estates/index.html`                                                                   | Estates hero container + background                     | **MIGRATE**        | Convert to hero modifiers; keep only background image class local. |
| `.hero-narrative`                    | `travel/index.html`                                                                    | Travel hub hero container                              | **MIGRATE**        | Same hero responsibilities as `.ie-hero-shell`. |
| `.hero-odyssey`, `.hero-culinary`    | `travel/gapyear`, `travel/culinary`, `travel/bespoke`                                 | Swiper-based hero containers                           | **MIGRATE**        | Normalize as `.ie-hero--swiper` variant. |
| `.hero-staffing`                     | `recruitment/employer/index.html`                                                     | Employer hero container                                | **MIGRATE**        | Same hero responsibilities; move to system, deprecate name. |
| `.hero-split-container`              | `recruitment/candidate/index.html`                                                    | Split Italy/USA hero layout                            | **KEEP / MIGRATE** | KEEP as a specialized layout modifier but rely on `.ie-hero-*` for typography and vertical spacing. |
| `.hub-grid`, `.hub-panel`, `.hub-*`  | `flavors/index.html`                                                                   | Flavors hub navigation system                          | **MIGRATE**        | Canonical “hub” template; move to shared CSS; reuse for travel/recruitment hubs where appropriate. |
| `.services-horizontal`, `.service-panel` | `travel/index.html`                                                                  | Horizontal rail of three services                      | **MIGRATE**        | Convert into a shared “horizontal rail” system; possibly reuse `.hub-panel`. |
| `.portal-card`, `.card-*` (home)     | `index.html`                                                                           | Mobile home “pillar cards”                             | **KEEP**           | Treat as home-specific card system; unify radius/shadows via `premium-card`. |
| `.premium-card`                      | `site.css` + many pages (`index`, `404`, `flavors`, `travel`, `recruitment`)          | Glass “ice” card shell                                 | **KEEP**           | Already used as global; preserve as primary glass surface token. |
| `.glass-card`                        | `estates`, `flavors`, `candidate`, others                                             | Generic glass cards (semantic overlap)                 | **MIGRATE**        | Replace with `.ie-card-glass` / `.ie-card-solid` naming; deprecate. |
| `.bento-card`, `.info-box`           | `recruitment/employer/index.html`                                                     | Employer feature cards                                 | **MIGRATE**        | Map to `.ie-card-*` primitives; keep “bento” only as semantic alias if needed. |
| `.category-card`, `.category-overlay`| `flavors/for-your-business/index.html`                                                | Product category tiles                                 | **MIGRATE**        | Fit under a “media card” primitive; keep only copy-specific details local. |
| `.legal-notice-text` / `.legal-notice` | `estates`, `flavors`, `recruitment/employer`                                         | Legal / disclosure paragraphs                          | **MIGRATE**        | Single shared disclosure text style in `site.css`; deprecate page-level duplicates. |
| `.btn-gold`, `.btn-outline`         | `404`, `flavors/for-your-home`, other CTAs                                            | Gold/outline pill CTAs                                 | **MIGRATE**        | Map to `.ie-btn-primary` / `.ie-btn-outline`; remove in favor of primitives. |
| `.hero-form-cta`                     | Many hero sections on program pages                                                   | Hero “Contact Form” CTA                                | **KEEP / MIGRATE** | KEEP as canonical hero CTA variant; ensure visuals derive from `.ie-btn-*`. |
| `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn` | Program forms and cards                         | Submit/enroll CTAs                                     | **MIGRATE**        | Normalize to shared `.ie-btn-*` variants; use semantic data attributes if needed. |
| `.ie-form-*` suite                   | `site.css` + estates, travel, recruitment, flavors forms                              | Global form system (layout, fields, CTAs)              | **KEEP**           | This is the correct shared abstraction; make all service forms use it. |
| `.service-*`, `.gap-*`, `.bespoke-*` form classes | Estates, travel pages, flavors business/aziende                             | Prefixed duplicates of form shells and fields          | **MIGRATE / DEPRECATE** | Map properties into `.ie-form-*`; deprecate custom prefixes. |
| `.recruitment-portal` + `.portal-card` | `recruitment/index.html`                                                            | Recruitment hub hero                                   | **MIGRATE**        | Should be a hub template built atop shared hero + card systems. |
| `.explore-indicator`                | Many hero sections (404, travel, flavors, recruitment, flavors subpages)             | Scroll/section affordance                              | **KEEP**           | Already in `site.css` as shared; ensure all pages use shared styles instead of local variants. |

---

## 4. Major structural maintainability issues

- **1. Fragmented hero implementations**
  - Multiple pages re-implement full-viewport hero containers (`.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split`, `.business-hero`) even though `site.css` already defines a robust `.ie-hero-*` system.
  - **Impact**: Hero behavior changes (offset relative to header, overlay gradients, typography scale) must be patched in multiple inline blocks and in `site.css`.

- **2. Multiple overlapping button systems**
  - At least 10+ button/CTA class names exist across pages, all visually similar:
    - `.btn-gold`, `.btn-outline`, `.hero-form-cta`, `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn`, `.editorial-cta`, `.essence-cta`, `.request-info-btn`, `.cta-button`, `.btn-panel`.
  - **Impact**: Any change to button radius, focus ring, or color requires hunting through inline styles and `site.css`. It also encourages new per-page button classes instead of reusing a canonical primitive.

- **3. Card and layout “drift”**
  - Many card containers (`.glass-card`, `.premium-card`, `.hub-glass-card`, `.program-card`, `.support-card`, `.bento-card`, `.category-card`) have subtle variations in padding, border, and shadow that are not encoded as explicit modifiers.
  - Structural layouts like `.services-horizontal`, `.hub-grid`, `.portal-grid`, `.split-content`, `.location-swiper` each implement their own grid/rhythm for similar use cases (three-panel hubs, galleries).
  - **Impact**: Difficult to normalize card behavior; new pages copy-paste existing blocks instead of reaching for a shared “card family” or grid primitive.

- **4. Redundant form shells**
  - While the `ie-form-*` system exists in `site.css`, most service/program pages define their own form prefixes (`service-`, `gap-`, `bespoke-`, `aziende-`, etc.) with nearly identical rules.
  - **Impact**: Changing the form look-and-feel (field radius, label typography, intl-tel integration) requires synchronized edits across several inline style blocks, increasing risk of subtle visual regressions.

- **5. Inline token and logo re-definition**
  - `index.html` redeclares core brand tokens (`--brand-gold`, `--brand-obsidian`, `--it-green`, `--it-red`, `--radius-premium`, glass shadow values) and logo classes (`.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore`) that are also present in `site.css`.
  - **Impact**: Future changes to brand color or radius must be done in multiple places; it’s unclear which definition is source-of-truth.

- **6. Mixed spacing vocabulary**
  - Section gaps and vertical rhythm are expressed both via Tailwind (`py-24`, `py-28`, `py-32`) and CSS tokens (`--ie-space-hero`, `.ie-section-core`, `.ie-section-dense`, `.service-contact`), often on the same page.
  - **Impact**: Inconsistent spacing across pages and difficulty establishing a clean “Tier A/B/C” spacing scale for the refactor.

- **7. Header behavior overrides scattered in pages**
  - Some pages, like `flavors/index.html`, explicitly override header shimmer and boundaries:
    - `#main-header.glass-header::after { display:none !important; }`, `.hub-grid .hub-panel::after { content:none !important; }`
  - Others rely on `site.css` behavior only.
  - **Impact**: Header behavior becomes page-dependent, making global header updates risky and harder to reason about.

---

## 5. Summary: KEEP / MIGRATE / DEPRECATE (high-level)

- **KEEP (as canonical)**:
  - `ie-hero-*` hero system, `premium-card` glass token, `ie-card-*` card primitives, `ie-form-*` form system, header/footer partials and nav shell, `explore-indicator` scroll affordance.

- **MIGRATE (to shared systems)**:
  - Page-specific hero container classes (`.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split`, `.business-hero`) → hero modifiers.
  - All button/CTA variants → a small `.ie-btn-*` primitive family.
  - Form prefixes (`service-*`, `gap-*`, `bespoke-*`, `aziende-*`) → `ie-form-*`.
  - Legal/disclosure text and cards → shared disclosure styles.
  - Hub/horizontal rail layouts → shared “Hub” and gallery systems.

- **DEPRECATE (post-migration)**:
  - Redundant hero/container/CTA class names once mapped to canonical systems.
  - Inline `<style>` blocks for shared behavior (tokens, logos, buttons, hero containers, form shells), retaining only minimal truly page-unique styling in local CSS or scoped utilities.

