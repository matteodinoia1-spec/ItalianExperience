## Public UI layered architecture model (static site, public routes only)

This document defines the **future layered UI architecture** for the static public site (excluding `portal/**`). It builds directly on the duplication analysis in `docs/refactor/PUBLIC-UI-STEP-1-CURRENT-DUPLICATION.md` and the constraints of the current stack: static HTML pages, partial injection via `assets/js/bootstrap.js`, shared `assets/css/site.css`, Tailwind utilities from `assets/css/tailwind.css`, and no framework rewrite. For URL/base‑path ownership (BASE_PATH, PORTAL_PATH, SITE_URL), see `docs/architecture/WEBSITE-URL-AND-PATH-CONVENTIONS.md`.

The goal is to **centralize shared behavior**, **stabilize class contracts**, and make future changes **predictable and low-risk**, while remaining fully compatible with the existing static site.

Layers:

- **Layer 0 — Tokens / Foundations**
- **Layer 1 — Primitives**
- **Layer 2 — Shared UI Systems**
- **Layer 3 — Page Templates**
- **Layer 4 — Page Composition**

All examples and recommendations are grounded in existing files such as:

- `assets/css/site.css`
- `assets/css/tailwind.css`
- `assets/css/tailwind.input.css`
- `assets/js/bootstrap.js`
- `assets/js/site.js`
- `partials/header.html`
- `partials/footer.html`
- `index.html`
- `travel/index.html`
- `flavors/index.html`
- `recruitment/index.html`
- `contact/index.html`
- `estates/index.html`
- `travel/gapyear/index.html`

---

## Layer 0 — Tokens / Foundations

### Purpose

**Layer 0** defines the **global visual vocabulary** and low-level mechanics that everything else leans on:

- Color roles (brand gold / obsidian / accent colors).
- Radii and glass surface tokens.
- Timing, easing, and motion tokens.
- Global paddings, header clearance, and section spacing tiers.
- Typographic base choices (font families, basic smoothing).

This layer is **purely presentational** and **does not know about specific components or pages**.

### What belongs in Layer 0

- **CSS custom properties and reset rules** that are shared across the public site:
  - From `assets/css/site.css`:
    - `:root` variables such as `--brand-gold`, `--brand-obsidian`, `--it-green`, `--it-red`, `--radius-premium`, `--ice-bg`, `--ice-border`, `--ice-shadow`, `--ie-space-section-y`, `--ie-space-section-y-mobile`, `--ie-header-h`, `--ie-header-clearance`, `--ie-content-padding-inline`, `--ie-ease-standard`, `--ie-dur-*`.
    - Global element-level rules: `*`, `html`, `body`, `a`, `img`, base input typography, etc.
  - From `index.html` inline `<style>` (today, to be centralized):
    - The duplicated `:root` token block.
    - Global `html, body` setup and `.brand-font`, `.premium-card` definitions that are now partially in `site.css`.
- **Global logo and brand mechanics** that are cross-page, not page-specific:
  - `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore` / `.tricolore-line` as defined in `assets/css/site.css` and repeated in `index.html`.
- **Global spacing and header clearance**:
  - `#site-header` height reservation (`assets/css/site.css`).
  - `--ie-header-h`, `--ie-header-clearance`, `--ie-content-padding-inline`.
  - Section spacing tokens such as `--ie-space-section-y` and `--ie-space-section-y-mobile`.
- **Base utility helpers that are not tied to a single system**:
  - `.brand-font`, `.text-gold`.
  - Very generic helpers like `.desktop-only`, `.mobile-only` once centralized.

### What must NOT belong in Layer 0

- Any **layout for a specific system** (hero shells, hubs, grids, forms).
- Any **component-level class** (buttons, cards, timelines, form fields).
- Any **page-specific background-image URLs** or page-unique gradients.
- Any **per-template class** (e.g. `.recruitment-portal`, `.hub-grid`, `.services-horizontal`).

### Where it should live in the repo

- **Primary home**: a clearly marked **“Foundations” section at the very top of `assets/css/site.css`**.
- **Optional future split**: if foundations become too large or need to be built separately, a dedicated `assets/css/foundations.css` can be created and imported by `site.css`. For the near term, **a separate file is optional, not required** (see “Recommended Minimal Future File Ownership Model”).
- **Tailwind integration**:
  - Tailwind’s base reset is already compiled into `assets/css/tailwind.css`. Layer 0 should **not duplicate Tailwind’s reset**, but can provide brand-specific variables and overrides that Tailwind utilities rely on.

### Which current files/classes map into Layer 0

- `assets/css/site.css`
  - `:root` block (lines around `--brand-gold`, `--radius-premium`, `--ice-*`, `--ie-space-section-y*`, `--ie-header-*`, `--ie-content-padding-inline`).
  - Global selectors: `*`, `html`, `body`, `a`, `img,video,svg,canvas`, basic input/font defaults.
  - Logo and brand helpers: `.brand-font`, `.text-gold`, `.pure-logo`, `.logo-wrap`, `.font-it`, `.font-ex`, `.letter`, `.tricolore`.
- `index.html`
  - Duplicated root tokens and `.brand-font`, `.premium-card`, `.pure-logo`, `.font-it`, `.font-ex`, `.tricolore`, `.letter`, `.scroll-indicator` definitions in the large inline `<style>` in `<head>`.
- `flavors/index.html`, `estates/index.html`, `recruitment/employer/index.html`, `recruitment/candidate/index.html`
  - Repeated disclosure text styling (`.legal-notice-text`) which should be expressed as a global text style token, not per-page.

### What should move into Layer 0 during refactor

- From `index.html`:
  - The entire `:root` block.
  - `.brand-font`, `.premium-card`.
  - The logo-related class definitions when they are not already in `site.css`, to avoid split definitions.
- From page-level inline styles:
  - Any **recurring color and radius use** that is currently hard-coded in components:
    - E.g. card radii and box-shadows that replicate `premium-card` on `estates/index.html`, `travel/gapyear/index.html`, `flavors/index.html`, recruitment pages.
  - Any **repeated legal/disclosure typography**:
    - `.legal-notice-text` in `estates/index.html` and `flavors/index.html`.
- From `assets/css/tailwind.input.css`:
  - If there are **custom Tailwind theme extensions** for colors, spacing, or fonts that mirror the CSS variables, ensure the naming is aligned so Tailwind utilities map cleanly onto Layer 0 tokens.

### What should move out of Layer 0

- Any **system-specific or page-specific rules** that currently live at the top of `assets/css/site.css`:
  - If there are hero, card, or form-specific selectors accidentally mixed into the root section, they belong in Layers 1–2.
- Any **experimental page-only tokens** that are not meant to be global:
  - For example, one-off gradients unique to `flavors/aziende-italiane/index.html` should live with that system or page, not in Layer 0.

---

## Layer 1 — Primitives

### Purpose

**Layer 1** defines **reusable, globally available building blocks** that sit on top of foundations but **do not encode business context**. They are the **“UI atoms/molecules” that many pages can share**:

- Buttons, links, and CTAs.
- Generic cards and surfaces.
- Grids and section wrappers.
- Form fields and shared form shells.
- Base hero content container and typography primitives (`.ie-hero-*`).

These primitives are **Global**: they should be defined once and consumed across all public pages.

### What belongs in Layer 1

- **Buttons & CTAs**:
  - Canonical button classes to normalize repeated behavior:
    - Proposed future contract (naming is descriptive here, not enforcing implementation yet):
      - `.ie-btn-primary`, `.ie-btn-secondary`, `.ie-btn-outline`, `.ie-btn-link`.
    - Backed by Layer 0 tokens: `--brand-gold`, `--radius-premium`, `--ice-*`.
  - Today’s scattered button classes:
    - `.btn-gold`, `.btn-outline` (`404.html`, `flavors/for-your-home/index.html`).
    - `.hero-form-cta` (`estates/index.html`, `travel/gapyear/index.html`, `travel/bespoke/index.html`, `travel/culinary/index.html`, others).
    - `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn` (program pages like `travel/gapyear/index.html`).
    - `.editorial-cta`, `.essence-cta` (`index.html`).
    - `.cta-button` (`recruitment/index.html`).
    - `.btn-panel` (`travel/index.html`).
- **Cards & surfaces**:
  - Shared card primitives expressed via `.ie-card-*` and the glass token:
    - `.premium-card`, `.ie-card`, `.ie-card-glass`, `.ie-card-solid`, `.ie-card-hover`, `.ie-card-panel`, `.ie-card-panel-thick` in `assets/css/site.css`.
  - Reused containers that should normalize as primitives:
    - `.glass-card` (used in `estates/index.html`, `recruitment/candidate/index.html`, flavors/advisory pages).
    - `.hub-glass-card` (`flavors/index.html`).
    - `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box` (`recruitment/employer/index.html`).
    - `.feature-card`, `.category-card` (`flavors/for-your-business/index.html`).
- **Layout wrappers and grids**:
  - Section wrappers and spacing primitives:
    - `.ie-section-core`, `.ie-section-dense`, `.ie-form-section` in `assets/css/site.css`.
  - Grid primitives:
    - Tailwind utility-based grids used across pages (`grid`, `grid-cols-*`, etc.) should align with named wrappers for common patterns:
      - e.g. `.ie-grid-two-up`, `.ie-grid-three-up`, `.ie-grid-feature`, `.ie-grid-form` (these names describe the intended future contract).
  - Header shell primitives:
    - `.glass-header`, `.nav-container`, `.nav-link`, `.dropdown`, `.dropdown-menu` in `assets/css/site.css` and `partials/header.html`.
- **Form primitives**:
  - The existing `ie-form-*` system in `assets/css/site.css`:
    - `.ie-form-section`, `.ie-form-shell`, `.ie-form-meta`, `.ie-form-card`, `.ie-form-grid`, `.ie-form-grid--responsive`, `.ie-form-grid--single`, `.ie-form-full`.
    - Field and label primitives: `.ie-form-label.is-required`, `.ie-form-field`, `.ie-form-field--lg`, `.ie-form-select`, `.ie-form-select--lg`, `.ie-form-textarea`, `.ie-form-intl`, `.ie-form-success`.
- **Hero content primitives**:
  - From `assets/css/site.css`:
    - `.ie-hero-shell`, `.ie-hero-offset`, `.ie-hero-bg-layer`, `.ie-hero-overlay-layer`, `.ie-hero-overlay-soft`, `.ie-hero-content-layer`, `.ie-hero-lockup`, `.ie-hero-eyebrow`, `.ie-hero-title`, `.ie-hero-title-compact`, `.ie-hero-lead`, `.ie-hero-copy`.
    - `.explore-indicator`, `.scroll-track`, `.scroll-dot`.

### What must NOT belong in Layer 1

- Page-specific variants that change **content semantics or program context**:
  - `.portal-card--employer`, `.portal-card--candidate` (recruitment hub).
  - `.hero-odyssey`, `.hero-culinary` (Gap Year and Culinary hero wrappers).
  - `.business-hero`, `.hero-split`, `.hero-staffing` (advisory and recruitment heroes).
  - `.roadmap-step`, `.info-badge`, `.atmospheres-section` (advisory timelines and galleries).
- Per-template composition patterns:
  - `.services-horizontal` (Travel hub horizontal rail).
  - `.hub-grid` (Flavors hub hero).
  - `.portal-grid` (Recruitment hub).
- Data or content-level attributes (e.g. everything tied directly to a specific ZOHO form or a particular hero copy).

### Where it should live in the repo

- **Main definition**: `assets/css/site.css`, grouped in clearly labelled sections:
  - “Buttons & CTAs”.
  - “Cards & surfaces”.
  - “Forms”.
  - “Hero primitives”.
  - “Layout wrappers & grids”.
- **HTML usage**:
  - Throughout the public pages:
    - `index.html`, `travel/index.html`, `flavors/index.html`, `recruitment/index.html`, `contact/index.html`, `estates/index.html`, `travel/gapyear/index.html` and other program pages.

### Which current files/classes map into Layer 1

- `assets/css/site.css`
  - Button primitives and CTA-related selectors near `.hero-form-cta`, `.ie-form-btn`, etc.
  - `.ie-card-*` and `.premium-card` definitions.
  - `.ie-form-*` suite.
  - `.ie-hero-*` primitives.
- `index.html`
  - Button/CTA styles (`.editorial-cta`, `.essence-cta`).
  - Card-like containers (`.hero-glass-card`, `.editorial-grid` cards) that share the same visual DNA as `premium-card`.
- `travel/index.html`
  - `.btn-panel` (CTA).
- `travel/gapyear/index.html`
  - `.enroll-btn`, `.program-card`, `.location-card`, `.location-info`, `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`.
- `flavors/index.html`
  - `.hub-glass-card`, `.disclosure-container`, `.legal-notice-text`.
- `recruitment/index.html`
  - `.portal-card`, `.portal-card-inner`, `.portal-cta`, `.cta-button`.
- `estates/index.html`
  - `.glass-card`, `.disclosure-card`, `.gold-divider`, `.legal-notice-text`.
- `contact/index.html`
  - `.contact-card`, `.gold-line`, `.contact-footnote` built using hero and form primitives.

### What should move into Layer 1 during refactor

- All **button-like classes** that currently live inline:
  - `.btn-gold`, `.btn-outline`, `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn`, `.editorial-cta`, `.essence-cta`, `.request-info-btn`, `.cta-button`, `.btn-panel`, `.hero-form-cta`.
  - These should be remapped to a **small set of canonical `.ie-btn-*` primitives**, while preserving semantics via text and data attributes.
- All **repeated glass card shells**:
  - `.glass-card`, `.hub-glass-card`, `.bento-card`, `.info-box`, `.feature-card`, `.category-card` should be expressed in terms of base primitives:
    - Base: `.ie-card-glass` or `.ie-card-solid`.
    - Optional modifiers: `.ie-card-disclosure`, `.ie-card-panel`.
- **Form shells and fields** currently duplicated:
  - `.service-*` form classes in `estates/index.html` and Flavors advisory pages.
  - `.gap-*` and `.bespoke-*` form classes in Gap Year and Bespoke.
  - These should converge on `.ie-form-*` primitives.
- **Hero containers that are structurally equivalent**:
  - Use `.ie-hero-shell`, `.ie-hero-bg-layer`, `.ie-hero-overlay-layer`, `.ie-hero-content-layer`, `.ie-hero-lockup`, `.ie-hero-title*`, `.ie-hero-copy`, `.explore-indicator` instead of page-local hero implementations redefining the same behavior.

### What should move out of Layer 1

- System or template-level behaviors that are currently expressed as “primitives”:
  - `.services-horizontal`, `.hub-grid`, `.portal-grid` should be **system-level** (Layer 2) or **template-level** (Layer 3) constructs, not primitives.
  - `.hero-odyssey`, `.hero-culinary`, `.contact-hero`, `.estates-hero` should not be primitives; they are system/template modifiers.

---

## Layer 2 — Shared UI Systems

### Purpose

**Layer 2** defines **reusable, semantics-aware UI systems** that are **built from primitives** and can be composed into different pages and templates. These systems **encode UX patterns**, not just visuals:

- Hero systems (standard hero, hub hero, carousel hero, “coming soon” / utility hero).
- Hubs and multi-panel navigation rails.
- Card families for features, programs, legal disclosures, timelines.
- Form shells tailored for “Advisor contact”, “Program inquiry”, “Recruitment” patterns.
- Timeline / roadmap systems, map cards, legal disclosure strips.

Each system is:

- **Named and documented** (via class sets and example pages).
- **Implemented primarily in `assets/css/site.css`** (CSS).
- **Expressed as markup patterns** in static HTML (optional future extraction into partials where useful).

### What belongs in Layer 2

- **Hero systems** (built on `.ie-hero-*` primitives):
  - **Standard hero**:
    - Used in pages like `estates/index.html`, `contact/index.html`, program pages after normalization.
    - Built from `.ie-hero-shell`, `.ie-hero-bg-layer`, `.ie-hero-overlay-layer`, `.ie-hero-content-layer`, `.ie-hero-lockup`, `.ie-hero-eyebrow`, `.ie-hero-title*`, `.ie-hero-lead`, `.ie-hero-copy`, `.explore-indicator`.
  - **Hub hero**:
    - Flavors hub: `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`, `.hub-sub`, `.hub-disclaimer`.
    - Travel hub: `.hero-narrative`, `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.gold-line`, `.btn-panel`.
    - Recruitment hub: `.recruitment-portal`, `.portal-grid`, `.portal-card`, `.portal-overlay`, `.portal-card-inner`, `.portal-label`, `.portal-title`, `.portal-copy`, `.portal-list`, `.portal-cta`, `.cta-button`.
  - **Carousel / Swiper hero**:
    - `travel/gapyear/index.html`: `.hero-odyssey`, `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`.
    - (Also `travel/culinary/index.html`, `travel/bespoke/index.html` with similar patterns).
  - **Utility / “coming soon” hero**:
    - `404.html` and `flavors/for-your-home/index.html`: `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.soon-badge`, `.pulse-dot`, `.coming-title`, `.coming-sub`, `.coming-divider`, `.coming-actions`, `.btn-gold`, `.btn-outline`.
- **Hub and navigation systems**:
  - Flavors hub panels, Travel horizontal rail, Recruitment portal grid: all are **multi-tile navigational systems**.
- **Card and disclosure systems**:
  - Advisory cards, program feature cards, disclosure cards, “glass” cards:
    - `estates/index.html`: `.glass-card`, `.disclosure-card`, `.legal-notice-text`.
    - `flavors/index.html`: `.hub-glass-card`, `.disclosure-container`, `.legal-notice-text`.
    - `recruitment/employer/index.html`: `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`, `.legal-notice`.
    - `recruitment/candidate/index.html`: `.glass-card`, `.step-node`, `.timeline-line`.
    - `flavors/aziende-italiane/index.html`: `.glass-card`, `.info-badge`, `.roadmap-step`, `.roadmap-number`.
- **Timeline / roadmap systems**:
  - `recruitment/candidate/index.html`: `.step-node`, `.timeline-line`.
  - `flavors/aziende-italiane/index.html`: `.roadmap-step`, `.roadmap-number`.
- **Form shells** as systems:
  - Program/advisory “Contact” blocks:
    - `estates/index.html`, `travel/gapyear/index.html`, `travel/bespoke/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html` share **very similar form sections**, just with different prefixes.
  - These should be standardized as:
    - “Program contact form shell”.
    - “Advisory contact form shell”.
    - “Recruitment inquiry form shell”.
  - All built using Layer 1 `ie-form-*` primitives.

### What must NOT belong in Layer 2

- Pure tokens or primitives:
  - Direct `:root` variables.
  - `ie-hero-*` base definitions (those are Layer 1).
  - `ie-form-*` field primitives.
- **Full page templates**:
  - The overall skeleton of “Home”, “Hub”, “Program”, “Advisory” is Layer 3.
- **Page-local tweaks**:
  - A special `background-image` for one specific hero.
  - A particular copy block or a single unique illustration alignment.

### Where it should live in the repo

- **CSS**:
  - In `assets/css/site.css`, grouped into named sections like:
    - “Hero systems”.
    - “Hub systems”.
    - “Card systems”.
    - “Timeline systems”.
    - “Program/advisory form shells”.
- **Markup patterns**:
  - Examples in existing pages:
    - `travel/index.html` for “horizontal rail hub”.
    - `flavors/index.html` for “three-panel hero hub”.
    - `recruitment/index.html` for “two-tile recruitment hub”.
    - `estates/index.html` for “advisory hero + disclosure”.
    - `travel/gapyear/index.html` for “swiper hero” and “atmospheres gallery”.
  - Optional future:
    - Highly reused systems (e.g. “coming soon hero”, “standard advisory contact form”) can turn into partials under `partials/`, wired by `assets/js/bootstrap.js`, but **that is optional** and can be a later migration step.

### Which current files/classes map into Layer 2

- `travel/index.html`
  - Hero and service rail system: `.hero-narrative`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.gold-line`, `.btn-panel`.
- `flavors/index.html`
  - Hub hero system: `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`, `.hub-sub`, `.hub-disclaimer`, `.split-content`, `.disclosure-container`, `.legal-notice-text`, `.lang-divider`.
- `recruitment/index.html`
  - Recruitment portal system: `.recruitment-portal`, `.recruitment-portal-bg`, `.recruitment-portal-inner`, `.portal-grid`, `.portal-card`, `.portal-overlay`, `.portal-card-inner`, `.portal-label`, `.portal-title`, `.portal-copy`, `.portal-list`, `.portal-cta`, `.cta-button`.
- `contact/index.html`
  - Conversion/advisory hero + form system: `.contact-hero`, `.hero-bg`, `.hero-overlay`, `.contact-wrapper`, `.contact-card`, `.contact-meta`, `.gold-line`, `.contact-footnote`.
- `estates/index.html`
  - Advisory hero and legal system: `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates`, `.glass-card`, `.gold-divider`, `.disclosure-card`, `.legal-notice-text`.
- `travel/gapyear/index.html`
  - Swiper hero system and gallery:
    - `.hero-odyssey`, `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`, `.atmospheres-section`, `.location-swiper`, `.location-card`, `.location-info`, `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`.
- `recruitment/employer/index.html`, `recruitment/candidate/index.html`
  - Employer and Candidate “systems” for bento cards, timelines, and legal notes.
- `flavors/for-your-home/index.html`, `404.html`
  - “Coming soon / utility hero” system: `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.soon-badge`, `.pulse-dot`, `.coming-title`, `.coming-sub`, `.coming-divider`, `.coming-actions`, `.btn-gold`, `.btn-outline`.

### What should move into Layer 2 during refactor

- All **hero container families** that currently re-implement hero behavior:
  - `.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split`, `.business-hero`.
  - These should become **hero system variants** built on `.ie-hero-*` primitives:
    - e.g. `.ie-hero--hub`, `.ie-hero--swiper`, `.ie-hero--conversion`, `.ie-hero--utility`, `.ie-hero--split`.
- All **repeated card and disclosure containers**:
  - `.glass-card`, `.hub-glass-card`, `.disclosure-card`, `.disclosure-container`, `.legal-notice-text`, `.info-badge`, `.bento-card`, `.economic-chart-box`, `.economic-stat-box`.
- All **timeline / roadmap patterns**:
  - `.step-node`, `.timeline-line`, `.roadmap-step`, `.roadmap-number`.
- Reused **form shells**:
  - Program/advisory and recruitment forms that share layout and tone, currently expressed via `service-`, `gap-`, `bespoke-`, `aziende-` prefixes.

### What should move out of Layer 2

- Any **page-only “system”** that will never be reused (after review):
  - For example, a one-off map plus special copy layout in `flavors/aziende-italiane/index.html` could remain at Layer 4 (page composition) if it is truly unique.
- Raw tokens (variables) and low-level type/spacing resets should be in Layer 0/1.

---

## Layer 3 — Page Templates

### Purpose

**Layer 3** defines a **small set of page templates** that describe how Layer 2 systems are arranged for each type of page. Templates are **mostly global** but can allow controlled local variation.

Each template:

- Has a **name** and **intended use**.
- Lists **required systems** (Layer 2) and **allowed optional systems**.
- Provides a **baseline reference page** in the current repo.
- Defines **where page-local CSS is allowed** (Layer 4).

### Template taxonomy and baseline pages

These template types are derived from `docs/refactor/PUBLIC-UI-STEP-1-CURRENT-DUPLICATION.md` and current routes.

- **Home Template**
  - **Baseline**: `index.html`.
  - **Characteristics**:
    - Home-specific “portal” hero and hub behavior.
    - Heavy use of premium cards and editorial sections.
  - **Core systems**:
    - Custom home hero system (Layer 2) with pillars and portal cards.
    - Card systems (premium cards, editorial cards).
  - **Notes**:
    - Home is allowed to be special, but its **tokens and primitives must still come from Layers 0–1**.

- **Hub Template**
  - **Baseline**:
    - `travel/index.html` (Travel hub).
    - `flavors/index.html` (Flavors hub).
    - `recruitment/index.html` (Recruitment hub).
  - **Characteristics**:
    - A hero area introducing the domain (Travel / Flavors / Recruitment).
    - A hub/grid/rail of options (cards or panels that navigate to sub-pages).
  - **Core systems**:
    - Hero: `.ie-hero-*` primitives plus a hub-specific variant such as `.ie-hero--hub`.
    - Hub system: horizontal rail or multi-panel grid built using shared card primitives.
  - **Optional systems**:
    - Disclosure section (e.g. Flavors hub’s legal block).

- **Program / Service Template**
  - **Baseline**:
    - `travel/gapyear/index.html` (Gap Year program).
    - `travel/bespoke/index.html`, `travel/culinary/index.html` (similar pattern).
    - `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html` (advisory-style service pages).
  - **Characteristics**:
    - A hero focused on a single program or service.
    - Feature cards, timelines, or galleries explaining the offer.
    - A contact form shell targeting a specific audience.
  - **Core systems**:
    - Program hero system (standard or carousel).
    - Card systems for features.
    - Program/advisory form system.

- **Advisory / Conversion Template**
  - **Baseline**:
    - `contact/index.html` (global contact).
    - `estates/index.html` (heritage estates advisory).
  - **Characteristics**:
    - Hero oriented around **conversion** or **high-touch advisory**.
    - A mix of narrative, bullet points, and a strong contact form.
    - Often includes legal/disclosure sections.
  - **Core systems**:
    - Conversion-focused hero variant (e.g. `.ie-hero--conversion`).
    - Form shell system (Layer 2).
    - Card or disclosure system where needed.

- **Utility / “Coming Soon” Template**
  - **Baseline**:
    - `404.html`.
    - `flavors/for-your-home/index.html` (currently “coming soon”).
  - **Characteristics**:
    - Simpler hero messaging.
    - Prominent CTA(s) to other parts of the site.
  - **Core systems**:
    - Utility hero variant (coming soon / 404 hero system).

### What belongs in Layer 3

- **Template contracts**:
  - For each template, a **documented set of Layer 2 systems** that must or may appear.
  - Examples:
    - Hub template must include:
      - Hero (Layer 2 hero variant).
      - Hub grid/rail (Layer 2 hub system).
    - Program template must include:
      - Program hero.
      - Feature cards section.
      - Contact form shell.
- **Routing-to-template mapping**:
  - Example mapping (not exhaustive):
    - `/ItalianExperience/` → Home Template.
    - `/ItalianExperience/travel/`, `/ItalianExperience/flavors/`, `/ItalianExperience/recruitment/` → Hub Template.
    - `/ItalianExperience/travel/gapyear/`, `/ItalianExperience/travel/culinary/`, `/ItalianExperience/travel/bespoke/` → Program Template.
    - `/ItalianExperience/flavors/for-your-business/`, `/ItalianExperience/flavors/aziende-italiane/` → Program/Advisory Template.
    - `/ItalianExperience/estates/`, `/ItalianExperience/contact/` → Advisory / Conversion Template.
    - `/ItalianExperience/flavors/for-your-home/`, `/ItalianExperience/404.html` → Utility / “Coming Soon” Template.

### What must NOT belong in Layer 3

- Raw CSS tokens and generic primitives.
- Business copy, content text, or ZOHO form details.
- Page-specific experiments or one-off sections that have no template-wide meaning.

### Where it should live in the repo

- **Documentation**:
  - In this architecture doc (and future docs) as a **clear template matrix**.
- **Implementation**:
  - The templates themselves are still **plain static HTML pages**, but:
    - The top of each page can be annotated (in comments and in class naming) with its **template type**.
    - The page structure should be arranged using **Layer 2 systems** according to the template contract.
  - Optional future:
    - If partials are used for repeating template chunks (for example, a shared “advisory hero” partial), those would live in `partials/` and get injected by `assets/js/bootstrap.js`. This is **not required** for the layered model to work.

### Which current files map into Layer 3

- `index.html` → Home Template.
- `travel/index.html`, `flavors/index.html`, `recruitment/index.html` → Hub Template.
- `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html` → Program Template.
- `contact/index.html`, `estates/index.html` → Advisory / Conversion Template.
- `404.html`, `flavors/for-your-home/index.html` → Utility / “Coming Soon” Template.

### What should move into Layer 3 during refactor

- An **explicit template classification** for each route, recorded in documentation (later todos will cover the full matrix).
- Consistent structuring of HTML:
  - Pages sharing a template should have **similar section ordering and layout roles**, even if their copy and images differ.
- Where possible, extract or annotate sections so that future developers can see, at a glance, which template a page belongs to and which Layer 2 systems it composes.

### What should move out of Layer 3

- Any truly page-local design experiments that only apply to a single route should be handled at Layer 4 (page composition) and **not encoded as template-wide rules**.

---

## Layer 4 — Page Composition

### Purpose

**Layer 4** is where **individual pages compose templates and systems** and provide **page-specific content and limited styling**:

- Order of sections on a page.
- Which systems appear (within the template’s allowed set).
- Page-specific images and copy.
- A constrained set of page-local CSS rules for truly unique layouts or art direction.

Critically, Layer 4 **must not redefine global behavior** that belongs in Layers 0–2.

### What belongs in Layer 4

- **Section composition and ordering**:
  - Example: `travel/gapyear/index.html` chooses to include:
    - Swiper hero.
    - Growth narrative.
    - Program cards.
    - Atmospheres gallery.
    - Program contact form.
- **Page-specific imagery and background details**:
  - Specific `background-image` URLs in hero backgrounds.
  - Page-specific imagery used in cards or galleries.
- **Page-unique UX pieces** that will not generalize (after review):
  - A particularly complex map animation only used on `flavors/aziende-italiane/index.html`.
  - Special layout for an experimental section on the home page.
- **Minimal page-local CSS**:
  - For example, a one-off tweak so a particular hero background uses a special gradient that is not reused elsewhere.
  - The **home hero system** in `index.html` may keep some page-local CSS, but after refactor its **tokens and shared behaviors** will derive from Layers 0–2.

### What must NOT belong in Layer 4

- **Tokens / foundations**:
  - No redefinition of `:root` brand variables or core radii/shadows.
  - No redefinition of global base fonts.
- **Primitives or systems**:
  - No new hero shells that replicate `.ie-hero-shell` responsibilities.
  - No new mini-form systems when `ie-form-*` can be used.
  - No new “button-lookalike” classes that should be `.ie-btn-*`.
- **Layout logic that should be templates**:
  - If multiple “program pages” need the same section order and structure, that belongs in the Program Template (Layer 3), not re-specified independently in each page.

### Where it should live in the repo

- Primarily in the **page HTML files** themselves:
  - `index.html`, `travel/index.html`, `flavors/index.html`, `recruitment/index.html`, `contact/index.html`, `estates/index.html`, `travel/gapyear/index.html`, and similar.
- **Page-local CSS**:
  - Prefer **small, page-scoped `<style>` blocks or separate per-page CSS files** only when the design is truly unique, and after ensuring that primitives and systems are fully leveraged.
  - The refactor should significantly **reduce** the volume of Layer 4 CSS by migrating shared behavior upwards.

### Which current files/classes map into Layer 4

- `index.html`:
  - Home-specific hero and portal layout: `.portal-wrapper`, `.portal-pillar`, `.pillar-bg`, `.pillar-inner`, `.label`, `.gold-line` (home-specific usage), `.title-portal`, `.description`, `.hero-glass-card` (home variant), `.hero-submenu-list`, `.hero-scroll-indicator`, `.portal-container`, `.portal-card`, `.card-bg`, `.logo-interaction-area`, `.card-desc`, `.card-cta`, `.editorial-section`, `.editorial-grid`, `.quote-box`, `.mobile-editorial`, `.mobile-footer`.
- `travel/gapyear/index.html`:
  - Behavior unique to Gap Year:
    - `.atmospheres-section` height, `.location-swiper`, `.location-card`, `.location-info`.
  - After refactor, some of these may partly move into a shared “gallery system”, but page-specific bits can remain here.
- `flavors/aziende-italiane/index.html`:
  - Page-specific advisory layout:
    - `.advisory-section`, `.glow-bg`, `.export-map-wrapper`, `.route-line`, `.hub-point`, `.unesco-text`, `.gold-line-long`, plus any page-only art direction around the map.
- Recruitment pages:
  - Page-specific storytelling sections that won’t be reused elsewhere even across recruitment.

### What should move into Layer 4 during refactor

- **Residual, truly unique styling** that has been reviewed and confirmed to be one-off:
  - e.g. Unesco-specific map glow and bilingual layout that is not intended to generalize.
- Experimental or marketing-specific art direction that would create unnecessary coupling if generalized.

### What should move out of Layer 4

- All **inline `<style>` blocks** that currently define:
  - Tokens (`:root`, `.brand-font`, `.premium-card`, etc.).
  - Hero containers and overlay behavior that match `.ie-hero-*`.
  - Button and form shell styles.
  - Reusable cards and disclosures.

These should migrate upward into Layers 0–2.

---

## Layer Boundaries and Failure Modes

This section explains what goes wrong if the boundaries between layers are not respected.

### If tokens remain inline in pages (Layer 0 leakage into Layer 4)

- **Symptoms**:
  - `index.html` continues to redefine `:root { --brand-gold ... }` and `.premium-card`.
  - Pages like `estates/index.html` and `flavors/index.html` define their own version of `.legal-notice-text` or card radius/shadow tokens.
- **Failure modes**:
  - **Brand drift**: a change to a color or radius must be applied in multiple inline blocks; some pages will always lag behind.
  - **Inconsistent shadows and radii**: glass cards on one page feel subtly different from another, even though they should look the same.
  - **Unclear source of truth**: future contributors will not know if Layer 0 is authoritative or if the inline tokens override it.

### If primitives are redefined page-by-page (Layer 1 leakage into Layer 4)

- **Symptoms**:
  - Every new hero or card section introduces its own `.btn-*` class with the same gold border and uppercase tracking.
  - Form fields are styled with local `.field` or `.service-field` classes instead of `.ie-form-field`.
  - Those classes get copy-pasted into new routes.
- **Failure modes**:
  - **Button explosion**: small differences in hover or focus states are introduced inadvertently, and updating them becomes a whack-a-mole problem.
  - **Inconsistent accessibility**: some button classes get focus styles, others are forgotten.
  - **Forms diverge**: error states, success states, and intl-tel behavior become fragile because each page has its own implementation instead of relying on `ie-form-*`.

### If systems and templates get mixed together (Layer 2 vs Layer 3 confusion)

- **Symptoms**:
  - Changes that should be Template-wide (e.g. all Program pages require a timeline section) are implemented by editing **each page individually**.
  - A Hub system (like `.hub-grid`) is modified in one page with local overrides, instead of adjusting the shared system and the template definition.
- **Failure modes**:
  - **Inconsistent experiences across same template type**:
    - Example: one Hub page shows a disclosure block, another does not, but the difference is not intentional.
  - **Fragile refactors**:
    - When you want to add a new required section to all Program pages, it is not obvious which files to touch or which class patterns to rely on.
  - **Unclear responsibilities**:
    - Developers don’t know if a change belongs in a system (Layer 2 CSS) or a template-level decision (Layer 3 composition).

### If page composition starts owning layout logic again (Layer 4 swallowing 2–3)

- **Symptoms**:
  - New pages manually re-create complex layouts like horizontal rails or hero splits by copying sections from other pages and then tweaking them locally.
  - Tailwind utilities are stacked directly in page markup for section spacing and grids, bypassing `.ie-section-core`, `.ie-grid-*`, or hub systems.
- **Failure modes**:
  - **Duplication returns quickly**:
    - Even after an initial refactor, copy-paste patterns reintroduce multiple versions of the same layout logic.
  - **Difficult to change global rhythm and responsiveness**:
    - Changing the vertical rhythm of sections or the behavior of hero spacing requires editing each page’s Tailwind utilities instead of adjusting a shared primitive.
  - **Template erosion**:
    - Over time, pages that were meant to share a template diverge visually because layout decisions moved back into page-local CSS and markup.

---

## Recommended Minimal Future File Ownership Model

This section defines a practical ownership model that can be applied **without introducing a new build pipeline** or a framework rewrite.

### What remains in `site.css`

- **Layer 0 + Layer 1 + Layer 2** for the public site:
  - **Foundations**:
    - Root variables for colors, radii, shadows, timing, header clearance, section spacing, base typography.
  - **Primitives**:
    - Buttons, cards, forms, hero primitives, section wrappers, basic grids, header shell and nav links.
  - **Shared systems**:
    - Hero variants (standard, hub, swiper, utility, conversion).
    - Hub and rail systems.
    - Card families.
    - Timeline and disclosure systems.
    - Shared form shells (Program / Advisory / Recruitment).
- **No page-specific overrides**:
  - `site.css` should **not contain** CSS that only applies to one route, unless:
    - That route is the **Home page**, and the styles are clearly documented as “Home-only, but still built on tokens and primitives”.

### Whether a new `foundations.css` is truly needed

- **Short-term recommendation**: **Do NOT introduce a new `foundations.css` yet.**
  - Rationale:
    - The project already hinges on a single shared `site.css` loaded on almost all public pages (except that Home currently uses mainly inline styles).
    - Introducing an additional CSS file adds coordination and build complexity (import order, caching, etc.) without immediate payoff.
- **Mid-term option**:
  - If `site.css` grows unwieldy or if you introduce more environments, you can:
    - Extract the foundation block (Layer 0) into `foundations.css`.
    - `@import` or otherwise include it into `site.css` as part of the build or static link order.
  - But the layered model **does not depend** on this split; clear segments and comments in `site.css` are sufficient.

### What Tailwind should and should not be used for

- **Tailwind SHOULD be used for**:
  - **Simple, local layout utilities** where you are **not defining system behavior**:
    - Margins, padding, and gaps within a section (e.g. `mt-10`, `mb-8`, `gap-6`).
    - Typography utilities for minor emphasis (e.g. `text-sm`, `text-slate-400`).
  - **Fast local composition** in Layer 4:
    - Example: adjusting spacing inside a single heroic quote or within a unique content block.
- **Tailwind should NOT be used for**:
  - **Global spacing patterns**:
    - Section-level `py-24`, `py-28`, `py-32` should generally be replaced with `.ie-section-core`, `.ie-section-dense` etc.
  - **System-defining classes**:
    - The basic layout and behavior of hero systems, hub grids, or form shells should be expressed with named CSS selectors in `site.css`, not with long Tailwind utility chains in markup.
  - **Token values**:
    - Where a consistent design token exists (e.g. `--brand-gold`), prefer using CSS variables and primitives, not arbitrary Tailwind color utilities.

### Whether page-specific CSS should remain inline or move elsewhere

- **Guideline**:
  - **Shared or likely-to-be-reused behavior** (Layer 0–2) must **not** remain inline.
  - **Genuinely unique, one-off styling** may remain inline, but should be:
    - Scoped, minimal, and clearly documented.
    - Separated from tokens/primitives that belong in `site.css`.
- **Practical approach**:
  - Short term:
    - Inline `<style>` blocks can be kept where truly necessary, but cleaned:
      - Remove tokens, primitives, and systems.
      - Keep only page-unique art direction or layout.
  - Mid term:
    - If there is a lot of page-specific CSS for a given route, consider **moving it into a small, route-specific CSS file** (e.g., `assets/css/home.css`), but:
      - Only after tokens and primitives are centralized.
      - With explicit documentation that files like `home.css` belong to Layer 4.

### How partials should relate to templates and systems

- **Current behavior**:
  - `assets/js/bootstrap.js` injects:
    - `partials/header.html` into `<div id="site-header"></div>`.
    - `partials/footer.html` into `<div id="site-footer"></div>`.
- **Future model**:
  - Header and footer partials are considered part of **Layer 1–2**:
    - They use primitives (`.glass-header`, `.nav-link`, `.pure-logo`) and are reused across templates.
  - For **other systems**:
    - Partial extraction is **optional**, not required.
    - A system may remain as a documented markup pattern plus CSS in `site.css` without becoming its own partial.
  - If you do create new partials:
    - They should represent **Layer 2 systems** or **repeated chunks of a Layer 3 template**, not page-specific content.
    - They should be named and structured according to the template/system they implement (e.g. `partials/hero-advisory.html`, `partials/form-program-contact.html`).

---

## Architecture Decision Summary

### Recommended layered model in one paragraph

The public site will be organized into **five practical layers**: **Layer 0 (Tokens / Foundations)** for global design tokens and resets; **Layer 1 (Primitives)** for shared buttons, cards, forms, hero primitives, and layout wrappers in `assets/css/site.css`; **Layer 2 (Shared UI Systems)** for semantics-aware hero, hub, card, form, and timeline systems built from those primitives; **Layer 3 (Page Templates)** for a small set of canonical page types (Home, Hub, Program, Advisory/Conversion, Utility) that declare which systems they use; and **Layer 4 (Page Composition)** for individual pages that compose templates and systems with minimal, constrained page-local CSS, all within the existing static HTML + partial injection stack.

### 8–10 key architectural decisions

1. **Foundations stay in `site.css`**: Brand tokens, base typography, header clearance, and global spacing remain at the top of `assets/css/site.css` as the single source of truth.
2. **Primitives are centralized**: Buttons, cards, forms, hero primitives, and section wrappers are defined once in `assets/css/site.css` as `.ie-*` primitives and must not be redefined inline.
3. **Hero behavior is systemized**: All hero implementations (`.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-narrative`, `.hero-odyssey`, etc.) will be expressed as variants of a single `.ie-hero-*` system.
4. **Form shells converge on `ie-form-*`**: All service, gap, bespoke, and advisory forms will use the existing `ie-form-*` primitives instead of prefixed copies.
5. **Card families are normalized**: Glass and feature cards across Travel, Flavors, Estates, and Recruitment will share `.ie-card-*` primitives, with page semantics carried by markup, not ad-hoc class names.
6. **Page templates are explicit**: Each route is assigned a template type (Home, Hub, Program, Advisory/Conversion, Utility) with a documented set of required systems.
7. **Tailwind is local, not structural**: Tailwind utilities are used for local layout and typography adjustments, while global spacing and system behavior are expressed via named CSS selectors.
8. **Partials are for shared shells**: `header.html` and `footer.html` remain partials; any future partials must represent shared systems or template chunks, not page-specific content.
9. **Inline styles are minimized**: Inline `<style>` blocks are restricted to genuinely one-off art direction; shared behavior is moved into `site.css`.
10. **Home is special but disciplined**: `index.html` can keep a custom hero/hub system, but its tokens and primitives must come from the same foundations and primitive layers as the rest of the site.

### 5–8 warnings to remember during implementation

1. **Do not reintroduce tokens inline**: If you find yourself copying `:root` variables or redefining `.premium-card` or logo styles in a page `<style>`, stop and use Layer 0/1 instead.
2. **Avoid new one-off button classes**: New CTAs should extend or re-use `.ie-btn-*`; introducing `.btn-something` in a single page is a red flag.
3. **Don’t bypass hero primitives**: Any full-viewport hero should start with `.ie-hero-shell` and friends; rolling your own hero shell breaks the system.
4. **Resist copying whole sections between pages**: If a section is copied as-is from another page, that is an indicator it belongs in Layer 2 (system) or Layer 3 (template), not Layer 4.
5. **Be careful with Tailwind-only sections**: Large blocks that rely only on Tailwind utilities for layout and spacing are easy to duplicate and hard to tweak globally; prefer wrapping them in named classes tied to primitives and systems.
6. **Don’t hide header or global behavior ad hoc**: Page-level overrides like disabling header shimmer should become small shared utilities, not inline `!important` rules.
7. **Home exceptions need explicit justification**: Any home-only styling that cannot be expressed via shared primitives should be documented as intentionally unique, not left as silent divergence.
8. **Template changes must be system-aware**: When you change a template’s structure, update both the relevant systems (Layer 2) and the documented template contract (Layer 3), not just one page’s markup.

