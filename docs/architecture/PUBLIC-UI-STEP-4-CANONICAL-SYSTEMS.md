## Public UI – Canonical Shared Systems and Legacy Mapping (Step 4)

**Scope**: Static public site under `/ItalianExperience` (excluding `portal/**`).  
**Goal**: Define the **canonical shared UI systems** for the public site, the **canonical naming direction**, and an explicit **legacy → canonical mapping** grounded in current files and classes.

This step assumes the layered model and responsibility matrix in:

- `docs/refactor/PUBLIC-UI-STEP-1-CURRENT-DUPLICATION.md`
- `docs/architecture/PUBLIC-UI-STEP-2-LAYERED-ARCHITECTURE.md`
- `docs/architecture/PUBLIC-UI-STEP-3-GLOBAL-VS-LOCAL.md`

It focuses on **what the shared systems are**, **what they own**, and **how legacy classes map into them or are deprecated**. No HTML/CSS changes are made yet; this is a **source-of-truth contract** for the migration.

---

## 1. Canonical Shared UI Systems (Public Site)

Canonical systems for the public site (excluding `portal/**`):

1. **Foundations / Token System**
2. **Button / CTA System**
3. **Hero System**
4. **Card System**
5. **Hub / Selection System**
6. **Form / Contact System**
7. **Disclosure / Legal System**
8. **Timeline / Roadmap System**
9. **Gallery / Slider System**
10. **Header / Footer Shell System**
11. **Utility / Status Page System**

Each system below follows this structure:

- **System Name**  
- **Purpose**  
- **Where It Lives**  
- **Core Elements**  
- **What Is Configurable**  
- **What Must Stay Fixed**  
- **Current Repo Examples**  
- **Legacy Classes / Patterns To Migrate In**  
- **Legacy Classes / Patterns To Deprecate**  
- **Notes / Risks**

---

## 2. System Sheets

### 2.1 Foundations / Token System

**System Name**  
Foundations / Token System

**Purpose**  
Single source of truth for **brand colors, radii, shadows, spacing tiers, header clearance, and base typography** for the public site. All other systems consume these tokens; no page may redefine them.

**Where It Lives**

- **Primary**: top of `assets/css/site.css` (Layer 0 in STEP 2).
- Optional future extraction to `assets/css/foundations.css`, imported by `site.css` (not required short-term).

**Core Elements**

- `:root` tokens in `assets/css/site.css`:
  - Colors and glass: `--brand-gold`, `--brand-obsidian`, `--it-green`, `--it-red`, `--ice-bg`, `--ice-border`, `--ice-shadow`.
  - Radii: `--radius-premium` and related radius tokens.
  - Spacing & header: `--ie-space-section-y`, `--ie-space-section-y-mobile`, `--ie-header-h`, `--ie-header-clearance`, `--ie-content-padding-inline`.
  - Motion: `--ie-ease-standard`, `--ie-dur-*`.
- Base typography and reset:
  - `html`, `body`, `a`, generic element resets in `site.css`.
  - `.brand-font`, `.text-gold`.
- Global logo/brand mechanics:
  - `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore`, `.tricolore-line`.

**What Is Configurable**

- **Token values**, via edits in `assets/css/site.css`:
  - Changing `--brand-gold` or `--radius-premium`.
  - Adjusting section spacing tiers (`--ie-space-section-y*`).
  - Adjusting motion curves/durations.
- **Adding new tokens**:
  - E.g. `--ie-card-shadow-strong` or additional spacing tiers.

**What Must Stay Fixed**

- Tokens **live only in `assets/css/site.css`** (or a future foundations file imported there).
- Pages must **not** redefine:
  - `:root { --brand-gold ... }`, `--radius-premium`, `--ice-*`, `--ie-space-section-y*`, `--ie-header-*`.
  - Base `html, body` typography defaults.
  - Core logo mechanics (`.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore*`).

**Current Repo Examples**

- `assets/css/site.css`:
  - Root tokens, section spacing, header clearance.
  - Logo and brand helpers (`.pure-logo`, `.brand-font`, `.tricolore`).
- `index.html`:
  - Large inline `<style>` duplicating `:root` tokens, `.brand-font`, `.premium-card`, `.pure-logo`, `.font-it`, `.font-ex`, `.tricolore`.

**Legacy Classes / Patterns To Migrate In**

- `index.html` inline:
  - `:root { --brand-gold, --brand-obsidian, --it-green, --it-red, --radius-premium, --ice-* }`.
  - `.brand-font`, `.premium-card`, `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore`/`.tricolore-line`.
- Duplicated disclosure text styles that are effectively tokens (font-size/line-height for legal copy).

**Legacy Classes / Patterns To Deprecate**

- Any **page-local** redeclaration of:
  - Brand tokens in `:root`.
  - Core logo classes.
  - Section spacing logic that should use `--ie-space-section-y*`.

**Notes / Risks**

- If this system is not enforced, **brand drift** and **unknown source-of-truth** for colors/radii will persist (as seen between `index.html` and `site.css`).
- Moving tokens to `site.css` must be sequenced with hero/card/form refactors so overrides don’t disappear unexpectedly.

---

### 2.2 Button / CTA System

**System Name**  
Button / CTA System

**Purpose**  
Provide a **small, canonical family of CTA styles** for the public site (visual appearance, hover, focus, disabled) so new CTAs do **not** create new `.btn-*` classes.

**Where It Lives**

- `assets/css/site.css`:
  - Section “Buttons & CTAs” (Layer 1 primitives + small Layer 2 variants).
- HTML templates:
  - Used in `index.html`, `404.html`, `contact/index.html`, `estates/index.html`, `flavors/**`, `recruitment/**`, `travel/**`.

**Core Elements**

- Canonical naming direction:
  - **Base primitives**:
    - `ie-btn-primary`, `ie-btn-secondary`, `ie-btn-outline`, `ie-btn-link`.
  - Contextual modifiers:
    - `ie-btn-hero` (hero CTA treatment).
    - `ie-btn-form` (form submit styling, built on base).
    - `ie-btn-utility` (utility/404 CTAs).
- Behaviors:
  - Hover state (gold/obsidian inversions).
  - Focus and active states (accessibility).
  - Border radius (from `--radius-premium`).

**What Is Configurable**

- **Which variant** is used:
  - Template-level decision: Home may use more editorial CTAs, Program pages may prefer `ie-btn-primary` + `ie-btn-outline`.
- **Copy, icon, destination URL**:
  - Completely page-local.
- **Minor layout wrappers**:
  - Alignment within a section (e.g. using Tailwind `justify-center`, `gap-4`).

**What Must Stay Fixed**

- Visual primitives:
  - Shared radius, border width, font treatment, focus outlines.
- Naming/contract:
  - New CTAs **must reuse** `ie-btn-*` classes or well-defined modifiers.
  - No new base `.btn-*` classes for shared roles.

**Current Repo Examples**

- `404.html` and `flavors/for-your-home/index.html`:
  - `.btn-gold`, `.btn-outline` inside `hero-coming` pattern.
- Program and advisory/contact pages:
  - `.hero-form-cta`, `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn`, `.request-info-btn`.
- Home:
  - `.editorial-cta`, `.essence-cta`.
- Recruitment:
  - `.cta-button`, header-level CTAs `.hero-contact-link`, `.contact-desktop`, `.contact-mobile`.
- Travel hub:
  - `.btn-panel`.

**Legacy Classes / Patterns To Migrate In**

- `.btn-gold`, `.btn-outline` → `ie-btn-primary`, `ie-btn-outline`.
- `.hero-form-cta`, `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn`, `.request-info-btn` → `ie-btn-primary` / `ie-btn-form` variants.
- `.editorial-cta`, `.essence-cta` → editorial flavor built on `ie-btn-secondary` / `ie-btn-link`.
- `.cta-button`, `.btn-panel` → mapped into appropriate `ie-btn-*` variant plus local layout wrappers.

**Legacy Classes / Patterns To Deprecate**

- All above legacy `.btn-*`/`*-btn` classes once mapped and updated:
  - `.btn-gold`, `.btn-outline`, `.service-btn`, `.gap-btn`, `.bespoke-btn`, `.enroll-btn`, `.request-info-btn`, `.btn-panel`, `.cta-button`, `.editorial-cta`, `.essence-cta`.

**Notes / Risks**

- Risk of **“semantic alias sprawl”**: keeping `.service-btn` etc. as permanent aliases instead of actually switching markup to `ie-btn-*`.
- Risk of **focus-state regressions** if old buttons are not carefully mapped to new accessible behavior.

---

### 2.3 Hero System

**System Name**  
Hero System

**Purpose**  
Define a **single, composable hero architecture** for the public site: full-viewport or prominent section with background, overlay, content lockup, and optional scroll affordance. Prevent page-level hero shells from re-implementing behavior.

**Where It Lives**

- `assets/css/site.css`:
  - Hero primitives: `.ie-hero-shell`, `.ie-hero-bg-layer`, `.ie-hero-overlay-layer`, `.ie-hero-overlay-soft`, `.ie-hero-content-layer`, `.ie-hero-lockup`, `.ie-hero-eyebrow`, `.ie-hero-title`, `.ie-hero-title-compact`, `.ie-hero-lead`, `.ie-hero-copy`.
  - Hero variants (Layer 2): `ie-hero--hub`, `ie-hero--program`, `ie-hero--conversion`, `ie-hero--utility`, `ie-hero--swiper`, `ie-hero--split`.
- HTML pages:
  - `404.html`, `contact/index.html`, `estates/index.html`, `flavors/index.html`, `flavors/*`, `recruitment/*`, `travel/*`.

**Core Elements**

- Base structure:
  - `ie-hero-shell` (outer container, spacing vs header).
  - `ie-hero-bg-layer` (background image/color).
  - `ie-hero-overlay-layer` / `ie-hero-overlay-soft` (gradients).
  - `ie-hero-content-layer` + `ie-hero-lockup` (text column).
  - Text roles: `ie-hero-eyebrow`, `ie-hero-title`, `ie-hero-title-compact`, `ie-hero-lead`, `ie-hero-copy`.
  - Scroll affordance: `.explore-indicator`, `.scroll-track`, `.scroll-dot`.
- Variants:
  - `ie-hero--hub`, `ie-hero--program`, `ie-hero--advisory`, `ie-hero--utility`, `ie-hero--swiper`, `ie-hero--split`.

**What Is Configurable**

- Template-level:
  - Which hero variant each template uses (Hub, Program, Advisory, Utility, Home).
  - Overlay palette tokens (still based on shared overlay mechanics).
- Page-level:
  - Background images/gradients (URLs, art direction).
  - Exact copy, CTA arrangement (while using shared button system).

**What Must Stay Fixed**

- Hero **structural behavior**:
  - Viewport height/offset relative to header.
  - Layer stacking model (bg / overlay / content).
  - Text roles and spacing.
- Scroll affordance implementation.
- No page-specific hero shell that re-implements the above.

**Current Repo Examples**

- Shared hero system already used:
  - `404.html`, `contact/index.html`, `estates/index.html`, `flavors/index.html`, `travel/index.html`, `travel/gapyear/index.html`, `flavors/for-your-business/index.html`, `recruitment/*`.
- Page-local hero shells:
  - `.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split-container`, `.business-hero`.

**Legacy Classes / Patterns To Migrate In**

- Utility / “coming soon”:
  - `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.soon-badge`, `.pulse-dot`, `.coming-title`, `.coming-sub`, `.coming-divider`, `.coming-actions`.
- Conversion / advisory:
  - `.contact-hero`, `.contact-wrapper`, `.contact-card`, `.contact-meta`, `.gold-line`, `.contact-footnote`.
  - `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates`.
- Hub:
  - `.hero--flavors.hub-grid`, `.hub-bg`, `.hub-gradient`, `.hub-content`.
  - `.hero-narrative`, `.hero-bg`, `.hero-overlay`, `.hero-content` on `travel/index.html`.
- Swiper:
  - `.hero-odyssey`, `.hero-culinary`, `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`.
- Recruitment:
  - `.hero-staffing`, `.hero-split-container`, `.hero-split-bg`, `.hero-side`, `.hero-overlay-final`.

All should become **modifiers/wrappers** built on `ie-hero-*` primitives (e.g. `ie-hero--utility`, `ie-hero--program ie-hero--swiper`, `ie-hero--split`).

**Legacy Classes / Patterns To Deprecate**

- Once mapped to hero variants, **deprecate**:
  - `.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split-container`, `.business-hero`.
- Keep only page-specific “accent” classes (e.g. background image modifiers) as local.

**Notes / Risks**

- If refactor is partial, you can end up with half of pages on `ie-hero-*` and half on bespoke hero shells, breaking the contract.
- Swiper hero needs careful consolidation to avoid three separate slider implementations.

---

### 2.4 Card System

**System Name**  
Card System

**Purpose**  
Provide **consistent card surfaces and card families** for features, programs, disclosures, and hub tiles, built on shared glass/solid tokens, to stop card drift across pages.

**Where It Lives**

- `assets/css/site.css`:
  - Card primitives: `.premium-card`, `.ie-card`, `.ie-card-glass`, `.ie-card-solid`, `.ie-card-hover`, `.ie-card-panel`, `.ie-card-panel-thick`.
  - System-level families (Layer 2): `ie-card-feature`, `ie-card-program`, `ie-card-disclosure`, `ie-card-bento`, `ie-card-stat`.

**Core Elements**

- Surfaces:
  - Glass (`ie-card-glass`), solid (`ie-card-solid`), disclosure (`ie-card-disclosure`), panel (`ie-card-panel`).
- Structural variants:
  - `ie-card-feature` (icon + title + body).
  - `ie-card-program` (program highlights).
  - `ie-card-disclosure` (legal copy).
  - `ie-card-bento`, `ie-card-stat` (data/metric cards).

**What Is Configurable**

- Template-level:
  - Which card family is used (e.g. Program pages use `ie-card-program`; Advisory uses `ie-card-disclosure`).
- Page-level:
  - Card content (titles, copy, icons, images).
  - Minor grid layout (2-up vs 3-up) through layout utilities or hub system.

**What Must Stay Fixed**

- Visual tokens: radii, shadows, border, background for core card types.
- Shared hover/focus behaviors.
- Base padding and typography tiers for card titles/body text.

**Current Repo Examples**

- Surfaces:
  - `.premium-card` + `.ie-card-*` in `assets/css/site.css`.
  - `.glass-card` and `.disclosure-card` in `estates/index.html` and `flavors/aziende-italiane/index.html`.
  - `.hub-glass-card` in `flavors/index.html`.
  - `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box` in `recruitment/employer/index.html`.
  - `.feature-card`, `.category-card` in `flavors/for-your-business/index.html`.
  - `.program-card`, `.location-card` in `travel/gapyear/index.html`.
  - `.glass-card` and timeline cards in `recruitment/candidate/index.html`.
  - Home: `.portal-card.hero-card.premium-card`, `.quote-box`, editorial cards.

**Legacy Classes / Patterns To Migrate In**

- Generic glass cards:
  - `.glass-card`, `.hub-glass-card`, `.premium-card` uses across pages.
- Disclosure:
  - `.disclosure-card`, `.disclosure-container`.
- Bentos/stats:
  - `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`.
- Program/service cards:
  - `.program-card`, `.location-card`, `.feature-card`, `.category-card`.
- Home editorial:
  - `.hero-glass-card`, `.editorial-grid` cards, `.quote-box`.

**Legacy Classes / Patterns To Deprecate**

- Generic style-only names:
  - `.glass-card` (used in multiple contexts), `.hub-glass-card`, `.feature-card`/`.category-card` when their semantics are covered by `ie-card-feature` or `ie-card-program`.
- Redundant disclosure containers:
  - `.disclosure-card`, `.disclosure-container` (replaced by `ie-card-disclosure` + global disclosure text).

**Notes / Risks**

- Risk of **over-fragmenting card families** (too many variants vs a small stable set).
- Need to ensure `premium-card` token remains the **only** glass surface token; don’t reintroduce ad-hoc shadows.

---

### 2.5 Hub / Selection System

**System Name**  
Hub / Selection System

**Purpose**  
Canonicalize the **multi-tile navigation patterns** used in Travel, Flavors, Recruitment, and the Home hero/hub so new hubs don’t reinvent layout or card behavior.

**Where It Lives**

- `assets/css/site.css`:
  - Hub layouts and panel behaviors (Layer 2).
  - Built from card and hero primitives.
- HTML pages:
  - `travel/index.html`, `flavors/index.html`, `recruitment/index.html`, `index.html` (home portal).

**Core Elements**

- Canonical naming direction:
  - Base: `ie-hub-shell`, `ie-hub-grid`, `ie-hub-rail`.
  - Panel: `ie-hub-panel`, `ie-hub-panel-card`, `ie-hub-panel-meta`.
  - Variants: `ie-hub--three-panel`, `ie-hub--horizontal-rail`, `ie-hub--portal`.
- Integration with card system:
  - Hub tiles are `ie-card-*` inside hub grids/rails.

**What Is Configurable**

- Which hub variant per template:
  - Hub template: `ie-hub--three-panel` (Flavors) or `ie-hub--horizontal-rail` (Travel).
  - Recruitment hub: uses `ie-hub--portal`.
- Per-hub:
  - Number of tiles, ordering, copy, destination URLs.
  - Background imagery on hub tiles (page-level).

**What Must Stay Fixed**

- Overall layout behavior:
  - Responsive column counts, hover states, tile padding.
- Naming and relationship between hub and card systems:
  - Hubs use `ie-card-*` surfaces, not bespoke card surfaces.

**Current Repo Examples**

- Flavors hub:
  - `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`, `.hub-sub`, `.hub-disclaimer`.
- Travel hub:
  - `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.gold-line`, `.btn-panel`.
- Recruitment hub:
  - `.recruitment-portal`, `.recruitment-portal-bg`, `.recruitment-portal-inner`, `.portal-grid`, `.portal-card`, `.portal-overlay`, `.portal-card-inner`, `.portal-label`, `.portal-title`, `.portal-copy`, `.portal-list`, `.portal-cta`, `.cta-button`.
- Home:
  - `.hero-portal-wrapper`, `.portal-card`, `.portal-container`, `.portal-grid`-like behavior inside `index.html`.

**Legacy Classes / Patterns To Migrate In**

- `.hub-grid`, `.hub-panel`, `.hub-glass-card` → `ie-hub-grid`, `ie-hub-panel` + `ie-card-glass`.
- `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content` → `ie-hub-rail` / `ie-hub-panel` pattern.
- `.recruitment-portal`, `.portal-grid`, `.portal-card`, `.portal-overlay`, `.portal-card-inner`, `.portal-label`, `.portal-title`, `.portal-copy`, `.portal-list`, `.portal-cta`.
- Home’s `portal-*` card cluster as the **Home hub variant**.

**Legacy Classes / Patterns To Deprecate**

- Once mapped:
  - `.hub-grid`, `.services-horizontal`, `.portal-grid` in favor of `ie-hub-*`.
  - Stylistic-only names like `.hub-glass-card` if replaced by `ie-card-glass` inside `ie-hub-panel`.

**Notes / Risks**

- Home hub is intentionally special; it should be treated as `ie-hub--home` and **not cloned** to other templates without a deliberate decision.
- Without a hub system, future “third hub” pages will copy either Travel or Flavors code, reintroducing drift.

---

### 2.6 Form / Contact System

**System Name**  
Form / Contact System

**Purpose**  
Centralize **form fields, labels, layouts, and shells** for contact/inquiry flows (Program, Advisory, Recruitment) so that all forms share accessibility and visual behavior.

**Where It Lives**

- `assets/css/site.css`:
  - Primitives: `ie-form-section`, `ie-form-shell`, `ie-form-meta`, `ie-form-card`, `ie-form-grid`, `ie-form-grid--responsive`, `ie-form-grid--single`, `ie-form-full`, `ie-form-label`, `ie-form-field`, `ie-form-field--lg`, `ie-form-select`, `ie-form-select--lg`, `ie-form-textarea`, `ie-form-intl`, `ie-form-success`, `ie-form-btn`.
  - Shell variants for Program, Advisory, Recruitment.
- HTML pages:
  - `contact/index.html`, `estates/index.html`, `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html`, `recruitment/employer/index.html`, `recruitment/candidate/index.html`.

**Core Elements**

- Shared field primitives and label behavior.
- Shared grid patterns for 1–2 column layouts.
- Shared shells:
  - Program contact: hero-adjacent form.
  - Advisory contact: card with meta + legal text.
  - Recruitment inquiry: employer/candidate forms.

**What Is Configurable**

- Template:
  - Which shell variant is used (Program vs Advisory vs Recruitment).
- Page:
  - Copy, field list, ZOHO endpoints, placeholders.
  - Minor layout choices (which fields share a row).

**What Must Stay Fixed**

- Visual treatment of inputs, labels, helper text, success states.
- Intl-tel integration box model and spacing.
- Submit buttons using the **Button / CTA System** (`ie-btn-*` + `ie-form-btn`), not bespoke classes.

**Current Repo Examples**

- `assets/css/site.css`:
  - `ie-form-*` system.
- Legacy per-page forms:
  - `contact/index.html`: `.field`, `.input-label`, `.contact-intl`, `.contact-success`.
  - `estates/index.html`: `.service-contact`, `.service-contact-shell`, `.service-contact-meta`, `.service-contact-card`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-btn`, `.service-success`.
  - `travel/gapyear/index.html`: `.gap-contact`, `.gap-contact-shell`, `.gap-contact-meta`, `.gap-contact-card`, `.gap-grid`, `.gap-label`, `.gap-field`, `.gap-intl`, `.gap-full`, `.gap-btn`, `.gap-success`.
  - `travel/bespoke/index.html`: `.bespoke-contact`, `.bespoke-*` equivalents.
  - Flavors advisory pages: same `service-*` forms.

**Legacy Classes / Patterns To Migrate In**

- All `service-*`, `gap-*`, `bespoke-*`, `aziende-*` form classes → mapped to `ie-form-*` equivalents.
- `.field`, `.input-label`, `.contact-intl`, `.contact-success` → mapped to `ie-form-field`, `ie-form-label`, `ie-form-intl`, `ie-form-success`.

**Legacy Classes / Patterns To Deprecate**

- After mapping:
  - `.service-contact*`, `.gap-contact*`, `.bespoke-contact*`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-success`, `.gap-label`, `.gap-field`, `.gap-intl`, `.gap-full`, `.gap-success`, `.bespoke-*` equivalents.

**Notes / Risks**

- This is one of the **highest-impact systems**: leaving per-page form shells in place means every form change is a multi-file patch.
- Need to ensure markup is updated consistently (class names only, no change to form semantics/endpoints).

---

### 2.7 Disclosure / Legal System

**System Name**  
Disclosure / Legal System

**Purpose**  
Unify **legal/disclosure text styling and disclosure card layouts** across Estates, Flavors, Recruitment, and Program pages so that legal content is consistent and maintainable.

**Where It Lives**

- `assets/css/site.css`:
  - Text style: `ie-disclosure-text`.
  - Card: `ie-card-disclosure` (built on card system).
  - Container: `ie-disclosure-section`, `ie-disclosure-divider`.

**Core Elements**

- Typography:
  - Smaller, high-contrast body text; adjusted line-height.
- Containers:
  - Disclosure cards and horizontal sections.
- Dividers:
  - Shared “gold divider” pattern.

**What Is Configurable**

- Which template includes disclosures and where:
  - Program/Advisory templates typically include them.
- Page-level:
  - Legal copy text itself.
  - Whether disclosures are inline paragraphs vs card deck.

**What Must Stay Fixed**

- Visual style of disclosure text (`ie-disclosure-text`).
- Base disclosure card layout (`ie-card-disclosure`).

**Current Repo Examples**

- `estates/index.html`:
  - `.disclosure-card`, `.legal-notice-text`, `.gold-divider`.
- `flavors/index.html`:
  - `.disclosure-container`, `.legal-notice-text`.
- `recruitment/employer/index.html`:
  - `.legal-notice`.

**Legacy Classes / Patterns To Migrate In**

- `.disclosure-card`, `.disclosure-container`, `.legal-notice-text`, `.legal-notice`, `.gold-divider`.

**Legacy Classes / Patterns To Deprecate**

- Page-local disclosure styles once mapped to `ie-disclosure-text` and `ie-card-disclosure`.

**Notes / Risks**

- Legal copy often gets last-minute changes; centralized styling reduces risk of mismatch between pages.

---

### 2.8 Timeline / Roadmap System

**System Name**  
Timeline / Roadmap System

**Purpose**  
Provide a shared **multi-step path visual** (timeline, roadmap, process steps) used across Recruitment and Advisory-style pages.

**Where It Lives**

- `assets/css/site.css`:
  - `ie-timeline-shell`, `ie-timeline-line`, `ie-timeline-step`, `ie-timeline-step-number`, `ie-timeline-step-label`, `ie-timeline-step-body`.

**Core Elements**

- Vertical/ horizontal timeline line (`ie-timeline-line`).
- Numbered or icon-labeled steps (`ie-timeline-step`, `ie-timeline-step-number`).
- Optionally integrated with card system for richer steps.

**What Is Configurable**

- Direction/orientation (vertical vs horizontal).
- Number of steps and copy.
- Whether steps use glass/solid cards from card system.

**What Must Stay Fixed**

- Basic step alignment and connection to the line.
- Visual hierarchy of numbers vs step titles.

**Current Repo Examples**

- `recruitment/candidate/index.html`:
  - `.step-node`, `.timeline-line`.
- `flavors/aziende-italiane/index.html`:
  - `.roadmap-step`, `.roadmap-number`.
- `recruitment/employer/index.html`:
  - `.process-step`-style patterns (noted in STEP 1).

**Legacy Classes / Patterns To Migrate In**

- `.step-node`, `.timeline-line`, `.roadmap-step`, `.roadmap-number`, `.process-step`.

**Legacy Classes / Patterns To Deprecate**

- All per-page step/timeline classes once unified into `ie-timeline-*`.

**Notes / Risks**

- Easy to build three slightly different “4-step” visuals; migration should converge them soon to avoid further drift.

---

### 2.9 Gallery / Slider System

**System Name**  
Gallery / Slider System

**Purpose**  
Standardize **Swiper-based hero carousels and image galleries**, especially for Travel programs, using shared overlay and control styling.

**Where It Lives**

- `assets/css/site.css`:
  - `ie-gallery-shell`, `ie-gallery-swiper`, `ie-gallery-slide`, `ie-gallery-overlay`.
  - `ie-gallery-pagination`, `ie-gallery-bullet`, `ie-gallery-bullet--active`.
  - For hero usage: integrated with `ie-hero--swiper`.

**Core Elements**

- Wrapper for Swiper instance.
- Slide overlay pattern for text-on-image.
- Pagination bullets styling, arrows if used.

**What Is Configurable**

- Which pages use hero-embedded slider vs standalone gallery.
- Number of slides, images, captions.

**What Must Stay Fixed**

- Base styling of bullets, active state, overlay text legibility.
- Hero slider integration with hero system (no separate hero shell).

**Current Repo Examples**

- `travel/gapyear/index.html`, `travel/culinary/index.html`, `travel/bespoke/index.html`:
  - `.hero-odyssey` / `.hero-culinary`, `.hero-swiper`, `.swiper-wrapper`, `.swiper-slide.hero-slide`, `.hero-overlay-content`.
  - `.location-swiper`, `.location-card`, `.location-info`, `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`.

**Legacy Classes / Patterns To Migrate In**

- All Swiper-specific hero/galleries:
  - `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`.
  - `.location-swiper`, `.location-card`, `.location-info`, `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`.

**Legacy Classes / Patterns To Deprecate**

- Duplicated Swiper bullet and slide overlays defined separately per page.
- Hero-specific slider wrappers like `.hero-odyssey`, `.hero-culinary` once represented as `ie-hero--swiper` + `ie-gallery-*`.

**Notes / Risks**

- Swiper config (JS) is out of scope here but must align with CSS naming when refactored.

---

### 2.10 Header / Footer Shell System

**System Name**  
Header / Footer Shell System

**Purpose**  
Provide a single **global site chrome** for the public site: glass header with logo/nav, and footer with shared content structure.

**Where It Lives**

- Markup:
  - `partials/header.html`, `partials/footer.html` injected by `assets/js/bootstrap.js`.
- CSS:
  - `assets/css/site.css` sections for header/footer (`.glass-header`, `.header-main-row`, `.nav-container-desktop`, `.nav-container-mobile`, `.nav-link`, `.dropdown`, `.dropdown-menu`, footer classes).

**Core Elements**

- Header:
  - Glass shell (`.glass-header`, `#main-header.glass-header`), nav containers and dropdowns, logo block.
- Footer:
  - Core footer layout, text styles, links.

**What Is Configurable**

- Template‑level:
  - Whether header shimmer is on/off via a utility (e.g. `ie-header--no-shimmer`) on specific pages/templates.
  - Footer content blocks where templates choose which modules to include.
- Page-level:
  - Footer copy, some link sets.

**What Must Stay Fixed**

- Header structure and base interactions.
- Core footer layout (grid, main sections).
- No per-page modifications to header DOM.

**Current Repo Examples**

- `partials/header.html`, `partials/footer.html` included on all non-home routes.
- `flavors/index.html`:
  - Inline overrides: `#main-header.glass-header::after { display:none !important; }`, `.hub-grid .hub-panel::after { content:none !important; }`.

**Legacy Classes / Patterns To Migrate In**

- Header behavior overrides (e.g. “no shimmer”) → `ie-header--no-shimmer` or similar.

**Legacy Classes / Patterns To Deprecate**

- Inline `!important` header/footer overrides in pages.

**Notes / Risks**

- Modifying header/footer per-page is a primary source of hidden regressions; moving to utilities is critical.

---

### 2.11 Utility / Status Page System

**System Name**  
Utility / Status Page System

**Purpose**  
Provide a consistent **“utility hero”** for 404/coming-soon/maintenance-style pages with simple message + CTAs.

**Where It Lives**

- `assets/css/site.css`:
  - `ie-hero--utility` (variant of hero system).
  - `ie-utility-shell`, `ie-utility-badge`, `ie-utility-subtitle`.
- HTML:
  - `404.html`, `flavors/for-your-home/index.html` (currently “coming soon”).

**Core Elements**

- Hero:
  - Utility hero variant of `ie-hero-*`.
- Badges/labels:
  - “Coming soon” or “404” elements.
- CTAs:
  - Mapped to `ie-btn-*`.

**What Is Configurable**

- Utility message, subtitle, CTAs used.
- Background image choice.

**What Must Stay Fixed**

- Overall visual affordance for “status/utility” (badge, clear title, supporting text, CTA layout).

**Current Repo Examples**

- `404.html`, `flavors/for-your-home/index.html`:
  - `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.soon-badge`, `.pulse-dot`, `.coming-title`, `.coming-sub`, `.coming-divider`, `.coming-actions`, `.btn-gold`, `.btn-outline`.

**Legacy Classes / Patterns To Migrate In**

- Those utility hero classes → `ie-hero--utility`, `ie-utility-*` plus `ie-btn-*`.

**Legacy Classes / Patterns To Deprecate**

- `.hero-coming`, `.soon-badge`, `.coming-*`, `.btn-gold`, `.btn-outline` once converted.

**Notes / Risks**

- This is a relatively small surface but reused; it is an easy early win for normalization.

---

## 3. Canonical Naming Direction

Canonical prefix: **`ie-`** for all shared primitives and systems on the public site.

High-level naming rules:

- **Tokens & foundations**
  - CSS vars: `--ie-*`, e.g. `--ie-space-section-y`, `--ie-header-h`.
  - Brands: `--brand-*`, `--ice-*` remain but are considered part of foundations.
- **Buttons**
  - `ie-btn-primary`, `ie-btn-secondary`, `ie-btn-outline`, `ie-btn-link`, `ie-btn-hero`, `ie-btn-form`, `ie-btn-utility`.
- **Hero**
  - Primitives: `ie-hero-shell`, `ie-hero-bg-layer`, `ie-hero-overlay-layer`, `ie-hero-content-layer`, `ie-hero-lockup`, `ie-hero-eyebrow`, `ie-hero-title`, `ie-hero-title-compact`, `ie-hero-lead`, `ie-hero-copy`.
  - Variants: `ie-hero--hub`, `ie-hero--program`, `ie-hero--advisory`, `ie-hero--utility`, `ie-hero--swiper`, `ie-hero--split`.
- **Cards**
  - Surfaces: `ie-card-glass`, `ie-card-solid`, `ie-card-panel`, `ie-card-disclosure`.
  - Families: `ie-card-feature`, `ie-card-program`, `ie-card-bento`, `ie-card-stat`.
- **Hub / selection**
  - `ie-hub-shell`, `ie-hub-grid`, `ie-hub-rail`, `ie-hub-panel`.
  - Variants: `ie-hub--three-panel`, `ie-hub--horizontal-rail`, `ie-hub--portal`, `ie-hub--home`.
- **Forms**
  - Already `ie-form-section`, `ie-form-shell`, `ie-form-card`, `ie-form-grid*`, `ie-form-field*`, `ie-form-select*`, `ie-form-textarea`, `ie-form-intl`, `ie-form-success`, `ie-form-btn`.
- **Disclosure / legal**
  - `ie-disclosure-section`, `ie-disclosure-text`, `ie-disclosure-divider`.
- **Timeline / roadmap**
  - `ie-timeline-shell`, `ie-timeline-line`, `ie-timeline-step`, `ie-timeline-step-number`, `ie-timeline-step-label`, `ie-timeline-step-body`.
- **Gallery / slider**
  - `ie-gallery-shell`, `ie-gallery-swiper`, `ie-gallery-slide`, `ie-gallery-overlay`, `ie-gallery-pagination`, `ie-gallery-bullet`, `ie-gallery-bullet--active`.
- **Header / footer**
  - Existing header classes remain, with modifiers like `ie-header--no-shimmer`.
- **Utility**
  - `ie-utility-shell`, `ie-utility-badge`, `ie-utility-title`, `ie-utility-subtitle`.

Page-local classes **must not** use the `ie-` prefix to keep the separation clear.

---

## 4. Legacy → Canonical Mapping

This section groups **major legacy classes** under their **future canonical system**.

### 4.1 Button / CTA System

- `.btn-gold`, `.btn-outline`, `.btn-panel`
  → **Button System** → `ie-btn-primary`, `ie-btn-outline`, (optional) `ie-btn-utility`.
- `.service-btn`, `.gap-btn`, `.bespoke-btn`, `.enroll-btn`
  → **Button System + Form System** → `ie-btn-primary`/`ie-btn-form`.
- `.hero-form-cta`
  → **Button System + Hero System** → `ie-btn-hero` (built on `ie-btn-primary`).
- `.editorial-cta`, `.essence-cta`
  → **Button System** → `ie-btn-secondary` / `ie-btn-link` with editorial-specific wrappers.
- `.cta-button`
  → **Button System + Hub System** → `ie-btn-primary` for hub tiles.

### 4.2 Hero System

- `.hero-coming`, `.coming-title`, `.coming-sub`, `.coming-actions`
  → **Hero System (Utility variant)** → `ie-hero-shell ie-hero--utility`, `ie-utility-title`, `ie-utility-subtitle`.
- `.contact-hero`, `.hero-bg` (contact), `.hero-overlay`, `.contact-wrapper`, `.contact-card`
  → **Hero System (Advisory/Conversion variant)** → `ie-hero-shell ie-hero--advisory` + `ie-card-disclosure`/`ie-form-shell`.
- `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates`
  → **Hero System (Advisory variant)** → `ie-hero-shell ie-hero--advisory` plus estates-specific background modifier.
- `.hero-narrative`, `.hero-bg`, `.hero-overlay`, `.hero-content`
  → **Hero System (Hub variant)** → `ie-hero-shell ie-hero--hub`.
- `.hero-odyssey`, `.hero-culinary`, `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`
  → **Hero System + Gallery System** → `ie-hero-shell ie-hero--swiper` + `ie-gallery-*`.
- `.hero-staffing`, `.hero-split-container`, `.hero-split-bg`, `.hero-side`, `.hero-overlay-final`
  → **Hero System (Recruitment variants)** → `ie-hero--program`, `ie-hero--split`.

### 4.3 Card System

- `.glass-card`, `.hub-glass-card`, `.premium-card`
  → **Card System (Glass surface)** → `ie-card-glass`.
- `.disclosure-card`, `.disclosure-container`
  → **Card System + Disclosure System** → `ie-card-disclosure`, `ie-disclosure-section`.
- `.bento-card`, `.info-box`
  → **Card System (Bento)** → `ie-card-bento`.
- `.economic-chart-box`, `.economic-stat-box`
  → **Card System (Stat)** → `ie-card-stat`.
- `.feature-card`, `.category-card`
  → **Card System (Program/service features)** → `ie-card-feature` / `ie-card-program`.
- `.program-card`, `.location-card`
  → **Card System (Program cards)** → `ie-card-program` + `ie-gallery` if used in slider.

### 4.4 Hub / Selection System

- `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-kicker`, `.hub-title`, `.hub-sub`, `.hub-disclaimer`
  → **Hub System (three-panel)** → `ie-hub-shell ie-hub--three-panel`, `ie-hub-panel`, `ie-hero--hub`.
- `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`
  → **Hub System (horizontal rail)** → `ie-hub-rail`, `ie-hub-panel`.
- `.recruitment-portal`, `.portal-grid`, `.portal-card`, `.portal-overlay`, `.portal-card-inner`, `.portal-label`, `.portal-title`, `.portal-copy`, `.portal-list`, `.portal-cta`
  → **Hub System (portal variant)** → `ie-hub-shell ie-hub--portal`, `ie-hub-panel`.
- Home `portal-*` classes (desktop and mobile hero hub)
  → **Hub System (home-specific)** → `ie-hub-shell ie-hub--home` (while retaining some home-only classes).

### 4.5 Form / Contact System

- `.field`, `.input-label`, `.contact-intl`, `.contact-success`
  → **Form System** → `ie-form-field`, `ie-form-label`, `ie-form-intl`, `ie-form-success`.
- `.service-contact`, `.service-contact-shell`, `.service-contact-meta`, `.service-contact-card`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-btn`, `.service-success`
  → **Form System (Advisory shell)** → `ie-form-section`, `ie-form-shell`, `ie-form-card`, `ie-form-grid`, `ie-form-field*`, `ie-form-select*`, `ie-form-textarea`, `ie-form-intl`, `ie-form-success`, `ie-form-btn`.
- `.gap-contact*`, `.bespoke-contact*` families
  → **Form System (Program shell)** → same `ie-form-*` primitives with program-specific copy only.

### 4.6 Disclosure / Legal System

- `.legal-notice-text`, `.legal-notice`
  → **Disclosure System** → `ie-disclosure-text`.
- `.disclosure-card`, `.disclosure-container`, `.gold-divider`
  → **Disclosure + Card System** → `ie-card-disclosure`, `ie-disclosure-divider`.

### 4.7 Timeline / Roadmap System

- `.step-node`, `.timeline-line`
  → **Timeline System** → `ie-timeline-step`, `ie-timeline-line`.
- `.roadmap-step`, `.roadmap-number`
  → **Timeline System** → `ie-timeline-step`, `ie-timeline-step-number`.
- `.process-step`-style classes in `recruitment/employer/index.html`
  → **Timeline System** → `ie-timeline-step` (advisory/recruitment variant).

### 4.8 Gallery / Slider System

- `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`
  → **Gallery System + Hero System** → `ie-gallery-swiper`, `ie-gallery-slide`, `ie-gallery-overlay`, `ie-hero--swiper`.
- `.location-swiper`, `.location-card`, `.location-info`
  → **Gallery System (card gallery)** → `ie-gallery-shell`, `ie-gallery-slide`, optionally `ie-card-feature`.
- `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`
  → **Gallery System (controls)** → `ie-gallery-bullet`, `ie-gallery-bullet--active`.

### 4.9 Header / Footer Shell System

- Header shimmer overrides:
  - `#main-header.glass-header::after { display:none !important; }`
  - `.hub-grid .hub-panel::after { content:none !important; }`
  → **Header System** → `ie-header--no-shimmer` or similar modifier on the header root.

### 4.10 Utility / Status Page System

- `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.soon-badge`, `.pulse-dot`, `.coming-title`, `.coming-sub`, `.coming-divider`, `.coming-actions`
  → **Utility System + Hero System** → `ie-hero-shell ie-hero--utility`, `ie-utility-shell`, `ie-utility-badge`, `ie-utility-title`, `ie-utility-subtitle`.

---

## 5. Canonical Systems vs Template Usage

Template types (from STEP 2) and whether each system is **Required (R)** or **Optional (O)**.

### 5.1 Template × System Matrix

| Template Type | Foundations / Tokens | Button / CTA | Hero | Card | Hub / Selection | Form / Contact | Disclosure / Legal | Timeline / Roadmap | Gallery / Slider | Header / Footer Shell | Utility / Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Home** (`index.html`) | R | R | R (Home-specific) | R | R (Home hub) | O | O | O | O | R | O |
| **Hub** (`travel/`, `flavors/`, `recruitment/`) | R | R | R (Hub variant) | R (for tiles) | R | O | O | O | O | R | O |
| **Program / Service** (`travel/gapyear`, `flavors/for-your-business`, `flavors/aziende-italiane`) | R | R | R (Program variant) | R | O | R | O/R (if advisory style) | O | O/R (if hero slider or gallery) | R | O |
| **Advisory / Conversion** (`contact`, `estates`) | R | R | R (Advisory variant) | R | O | R | R | O | O | R | O |
| **Utility / “Coming Soon”** (`404`, `flavors/for-your-home`) | R | R | R (Utility variant) | O | O | O | O | O | O | R | R |

**Interpretation**

- **Foundations / Tokens** and **Header / Footer Shell** are **required for all templates**.
- **Button / CTA System** is effectively required everywhere; pages must use canonical `ie-btn-*`.
- **Hero System**: every template has at least one hero variant.
- **Hub / Selection System** is required for Hub and Home templates, optional elsewhere.
- **Form / Contact System** is required for Program and Advisory templates, optional for Home and Hub.
- **Utility / Status System** is required only for Utility template.

---

## 6. Deprecation Priorities

Ranked by **maintainability impact** and breadth of duplication (public site only, `portal/**` excluded).

1. **Per-page form shells and fields**
   - Target: `.service-*`, `.gap-*`, `.bespoke-*`, `.aziende-*` form classes, plus `.field`, `.input-label`, `.contact-intl`, `.contact-success`.
   - Impact: centralizes validation and intl-tel behavior; reduces major duplication across key money pages.
2. **Fragmented button/CTA classes**
   - Target: `.btn-gold`, `.btn-outline`, `.service-btn`, `.gap-btn`, `.bespoke-btn`, `.enroll-btn`, `.request-info-btn`, `.editorial-cta`, `.essence-cta`, `.cta-button`, `.btn-panel`.
   - Impact: eliminates CTA drift and ensures consistent focus states.
3. **Hero container families**
   - Target: `.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-gradient`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split-container`, `.business-hero`.
   - Impact: stabilizes hero behavior; simplifies future hero changes.
4. **Card surface aliases**
   - Target: `.glass-card`, `.hub-glass-card`, `.disclosure-card`, `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`, `.feature-card`, `.category-card`, `.program-card`, `.location-card`.
   - Impact: unifies surfaces and card families; easier to adjust glass/card look globally.
5. **Timeline / roadmap variants**
   - Target: `.step-node`, `.timeline-line`, `.roadmap-step`, `.roadmap-number`, `.process-step`.
   - Impact: stops creation of new, slightly different step systems; improves clarity for storytelling flows.
6. **Header behavior overrides**
   - Target: inline `!important` overrides of header shimmer and global effects (e.g. in `flavors/index.html`).
   - Impact: restores centralized control of header; avoids subtle per-page header bugs.
7. **Inline tokens/logo redefinitions**
   - Target: `index.html` inline `:root` block and duplicated logo/premium-card styles.
   - Impact: clarifies token source-of-truth; reduces risk of inconsistent branding when colors/radii change.

---

## 7. System Boundary Warnings

Common mistakes to avoid during migration and future development.

### 7.1 Turning a Template into a System

- **Mistake**: Encoding a **full Program page** as a single “system” with unique classes instead of composing:
  - Hero System (Program variant)
  - Card System (program cards)
  - Timeline System (if present)
  - Form / Contact System
- **Result**: Every new Program page copies the whole block and diverges.
- **Rule**: If multiple pages share a structure, it belongs to **systems + templates**, not a monolithic “page system”.

### 7.2 Keeping Semantic Aliases Forever

- **Mistake**: Keeping `.service-btn`, `.gap-btn`, `.bespoke-btn` as “semantic wrappers” on top of canonical `ie-btn-*` indefinitely.
- **Result**: Future contributors re-style `.service-btn` without realizing it should behave like any other primary CTA.
- **Rule**: Once mapped, remove legacy class names from markup. Semantic meaning should come from context and copy, not separate class families.

### 7.3 Creating Too Many Variants

- **Mistake**: Adding new `ie-btn-*`, `ie-card-*`, or `ie-hero--*` variants for small tweaks that could be handled:
  - With existing variants.
  - With local layout utilities inside a section.
- **Result**: Variant explosion; developers stop knowing which to use.
- **Rule**: New variants require a clear, recurring use case across **multiple pages or templates**, not just one.

### 7.4 Allowing Page-Local Styles to Replace Canonical Systems

- **Mistake**: For a new Travel-like page, copying `.services-horizontal` and tweaking it **locally** instead of:
  - Extending the Hub / Selection System (`ie-hub-rail`).
- **Result**: Drift returns immediately after refactor.
- **Rule**: If a layout matches an existing system’s responsibilities (hero, hub, card family, form shell, timeline), it must be implemented via that system’s class set, not page-only CSS.

### 7.5 Reintroducing Tokens in Page `<style>` Blocks

- **Mistake**: Adding `:root { --brand-gold: ... }` or a “special glass shadow” to a page’s `<style>` during a campaign.
- **Result**: Hidden override of global brand decisions; inconsistent rendering.
- **Rule**: No **brand tokens** or **core radii/shadows** in page-local CSS. If a campaign needs new tokens, add them once in the Foundations / Token System and wire them through primitives/systems.

### 7.6 Tailwind-Only System Definitions

- **Mistake**: Defining a new hero/hub/form purely as a long string of Tailwind utilities on markup instead of using or extending named `ie-*` classes.
- **Result**: Unnamed patterns that are hard to find, reason about, or change globally.
- **Rule**: Tailwind is for **local composition**, not for defining global systems. If a Tailwind combination is reused, wrap it in a named `ie-*` class in `site.css`.

### 7.7 Header/Footer Ad-Hoc Overrides

- **Mistake**: Disabling shimmer or changing header transparency via `!important` selectors in page-specific `<style>` blocks.
- **Result**: Header behavior becomes page-dependent; hard to debug.
- **Rule**: Introduce **small, named header/footer modifiers** (e.g. `ie-header--no-shimmer`) in the Header / Footer Shell System and apply them via markup.

---

## 8. Summary

- The public site now has **11 canonical UI systems**, each with **clear ownership** in `assets/css/site.css` and a **canonical `ie-*` naming scheme**.
- A concrete **Legacy → Canonical Mapping** specifies how high-duplication classes (hero shells, buttons, cards, forms, hubs, timelines) migrate into those systems and which legacy names must be deprecated.
- A **Template × System matrix** clarifies which systems are required or optional for Home, Hub, Program, Advisory, and Utility templates.
- The **Deprecation Priorities** and **System Boundary Warnings** are intended to guide the next migration steps so that future work extends these canonical systems instead of reintroducing duplication.

