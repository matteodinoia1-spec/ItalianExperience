## Public UI – Template Mapping (Step 5)

**Scope**: Static public site under `/ItalianExperience` (excluding `portal/**`).  
**Inputs**: `PUBLIC-UI-STEP-1–4`, `assets/css/site.css`, public HTML routes discovered via `docs/architecture/WEBSITE-FILE-MAP.md` and repo scan.
**Goal**: For each public route, map its **target template**, **hero variant**, **canonical systems**, **local exceptions**, **normalization targets**, and whether it is a **baseline**, **strong reference**, **acceptable**, or **outlier**.

Template types and canonical systems come from Steps 2–4:

- **Template types**: Home, Hub, Program / Service, Advisory / Conversion, Utility / Status.
- **Canonical systems** (public site): Foundations / Tokens, Button / CTA, Hero, Card, Hub / Selection, Form / Contact, Disclosure / Legal, Timeline / Roadmap, Gallery / Slider, Header / Footer Shell, Utility / Status.

Status labels:

- **Baseline**: Best current reference for a template (post-cleanup).
- **Strong Reference**: Very good example that still needs normalization.
- **Acceptable**: Structurally OK, but with notable duplication / drift.
- **Outlier**: Significantly diverges from the template contract and/or duplicates many systems locally.

---

## 1. Route-by-Route Mapping (Public Site)

Legend for systems:

- **Foundations** = Foundations / Token System  
- **Buttons** = Button / CTA System  
- **Hero** = Hero System  
- **Cards** = Card System  
- **Hub** = Hub / Selection System  
- **Forms** = Form / Contact System  
- **Disclosure** = Disclosure / Legal System  
- **Timeline** = Timeline / Roadmap System  
- **Gallery** = Gallery / Slider System  
- **Header** = Header / Footer Shell System  
- **Utility** = Utility / Status Page System

### 1.1 `index.html`

- **Route**: `/ItalianExperience/` → `index.html`
- **Current Purpose**: Home / brand landing with portal-style hero and editorial storytelling.
- **Target Template Type**: **Home**
- **Target Hero Variant**: **Home-specific hero** built on hero primitives (effectively `ie-hero--home` on top of `ie-hero-*` typography and spacing).
- **Required Canonical Systems**:
  - Foundations
  - Buttons (for editorial CTAs and any hero CTAs)
  - Hero (typographic roles, scroll affordance)
  - Cards (premium / glass surfaces for portal cards and editorial blocks)
  - Hub (Home hub variant for the portal tiles)
  - Header
- **Optional Canonical Systems**:
  - Forms (none today, but allowed)
  - Disclosure (for any future legal strip)
  - Gallery (for future hero/gallery experiments)
  - Timeline (unlikely)
  - Utility (not applicable today)
- **Allowed Local Exceptions**:
  - Home-only hero / portal layout classes (e.g. `portal-wrapper`, `portal-pillar`, `portal-card`, editorial layout) as a **documented Home-only art direction system**.
  - One-off editorial grid / quote box art direction, as long as surfaces + tokens come from shared systems.
- **Normalization Targets**:
  - Move all **tokens and logo mechanics** from inline `<style>` into the Foundations / Token System in `site.css`.
  - Ensure home hero uses **hero primitives** (`ie-hero-*` text roles, scroll indicator) even if container layout remains home-specific.
  - Map button-like classes (e.g. `.editorial-cta`, `.essence-cta`) onto **Buttons** (`ie-btn-*`) and treat remaining classes as wrappers.
  - Align card radii/shadows to `premium-card` / `ie-card-*` tokens.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - Inline `:root` tokens and duplicated `.brand-font`, `.premium-card`, `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore*`.
  - `.editorial-cta`, `.essence-cta` → map to `ie-btn-secondary` / `ie-btn-link`.
  - Any home hero behavior that replicates hero shells instead of building on shared hero primitives.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Outlier (Home-specific baseline candidate)**
- **Priority Notes**:
  - **High priority** for token normalization (Step 4 deprecation priorities #7).
  - Treat as the **only** page allowed to keep a custom hero/hub system, but only after it is re-based on Foundations, Buttons, Cards, and Hero primitives.

---

### 1.2 `404.html`

- **Route**: `/ItalianExperience/404.html`
- **Current Purpose**: Utility / error page; 404 and “coming soon” style hero used as visual reference.
- **Target Template Type**: **Utility / Status**
- **Target Hero Variant**: `ie-hero--utility` (Utility hero variant).
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Utility
  - Header
- **Optional Canonical Systems**:
  - Cards (for any supporting content)
  - Forms (unlikely)
  - Disclosure (if legal copy is added)
- **Allowed Local Exceptions**:
  - Specific 404 copy and imagery.
  - Minor spacing tweaks inside the hero, as long as the **hero shell** logic is shared with the Utility system.
- **Normalization Targets**:
  - Turn the existing `.hero-coming` block into the **canonical Utility hero system** in `site.css`, parameterized via modifiers.
  - Map `.btn-gold` / `.btn-outline` to `ie-btn-primary` / `ie-btn-outline`.
  - Ensure scroll affordance and hero overlay use hero primitives instead of local reimplementation.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.hero-content`, `.soon-badge`, `.pulse-dot`, `.coming-title`, `.coming-sub`, `.coming-divider`, `.coming-actions` → mapped into `ie-hero--utility` + Utility system classes.
  - `.btn-gold`, `.btn-outline` → `ie-btn-*`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Baseline** for **Utility / Status** template once normalized.
- **Priority Notes**:
  - **Early win**: Utility hero + button migration also unblocks `flavors/for-your-home`.

---

### 1.3 `contact/index.html`

- **Route**: `/ItalianExperience/contact/` → `contact/index.html`
- **Current Purpose**: Global contact / advisory conversion page.
- **Target Template Type**: **Advisory / Conversion**
- **Target Hero Variant**: `ie-hero--advisory` (conversion-focused hero).
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (contact card + meta)
  - Forms (Advisory contact shell)
  - Header
- **Optional Canonical Systems**:
  - Disclosure (if legal notice is added)
  - Timeline (for process explanation, if needed)
- **Allowed Local Exceptions**:
  - Contact-specific background imagery and micro art direction for hero.
  - Page-specific copy / meta layout inside the contact card, if it does not create a new card family.
- **Normalization Targets**:
  - Migrate `.contact-hero`, `.hero-bg`, `.hero-overlay` onto `ie-hero-shell` + `ie-hero--advisory`.
  - Replace legacy field and shell classes (`.field`, `.input-label`, `.contact-intl`, `.contact-success`) with `ie-form-*`.
  - Map any custom CTAs onto `ie-btn-*`.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.contact-hero`, `.contact-wrapper`, `.contact-card`, `.contact-meta`, `.contact-footnote` → hero + card + disclosure systems.
  - `.field`, `.input-label`, `.contact-intl`, `.contact-success` → `ie-form-*`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Strong Reference** for Advisory / Conversion (structure is solid; forms and hero need normalization).
- **Priority Notes**:
  - **High priority** because it is a key conversion page and a strong candidate for the **Advisory template baseline** alongside `estates/index.html`.

---

### 1.4 `estates/index.html`

- **Route**: `/ItalianExperience/estates/` → `estates/index.html`
- **Current Purpose**: Heritage estates advisory page (high-touch advisory / conversion).
- **Target Template Type**: **Advisory / Conversion**
- **Target Hero Variant**: `ie-hero--advisory`.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (glass + disclosure)
  - Forms (Advisory contact shell)
  - Disclosure
  - Header
- **Optional Canonical Systems**:
  - Timeline (if we later add a “process” section)
  - Gallery (for estate imagery, if systemized)
- **Allowed Local Exceptions**:
  - Estates-specific imagery and gradient background modifier.
  - Any truly unique layout for showcasing specific properties, if not reused.
- **Normalization Targets**:
  - Migrate `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates` to hero primitives + `ie-hero--advisory` + a small estates-specific background modifier.
  - Replace `.service-contact*` form classes with `ie-form-*` and shared Advisory form shell.
  - Convert `.glass-card`, `.disclosure-card`, `.legal-notice-text`, `.gold-divider` to `ie-card-*` and `ie-disclosure-*`.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.estates-hero`, `.hero-bg-estates`, `.hero-gradient`, `.hero-content-estates`.
  - `.service-contact`, `.service-contact-shell`, `.service-contact-meta`, `.service-contact-card`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-btn`, `.service-success`.
  - `.glass-card`, `.disclosure-card`, `.legal-notice-text`, `.gold-divider`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Baseline** for **Advisory / Conversion** template (post-normalization).
- **Priority Notes**:
  - **High priority**: normalizing Estates will crystallize Advisory hero, disclosure, and form shells for other advisory-like pages (Flavors advisory, Contact).

---

### 1.5 `flavors/index.html`

- **Route**: `/ItalianExperience/flavors/` → `flavors/index.html`
- **Current Purpose**: Flavors hub; three-panel hero hub navigating to Flavors subroutes.
- **Target Template Type**: **Hub**
- **Target Hero Variant**: `ie-hero--hub` (three-panel hub hero variant).
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (glass hub panels)
  - Hub (three-panel variant)
  - Disclosure (legal notice / bilingual block)
  - Header
- **Optional Canonical Systems**:
  - Forms (none today)
  - Timeline, Gallery (if added later)
- **Allowed Local Exceptions**:
  - Bilingual split content layout for Italian/English narrative (`split-content`) if it remains unique.
  - Flavors-specific background and gradients, provided overlay mechanics are shared.
- **Normalization Targets**:
  - Promote `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`, `.hub-sub`, `.hub-disclaimer` into the **Hub / Selection system** and **Hero system** (`ie-hero--hub`).
  - Normalize `.disclosure-container`, `.legal-notice-text` to Disclosure system.
  - Replace header shimmer overrides via a global modifier (e.g. `ie-header--no-shimmer`) instead of inline `!important`.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero--flavors.hub-grid`, `.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`, `.hub-sub`, `.hub-disclaimer`, `.disclosure-container`, `.legal-notice-text`, `.lang-divider`.
  - Header overrides: `#main-header.glass-header::after { display:none !important; }`, `.hub-grid .hub-panel::after { content:none !important; }`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Strong Reference** for **Hub** template (excellent example of three-panel hub, but with header overrides and inline hero/container duplication).
- **Priority Notes**:
  - **High priority** for hub normalization; once travel and recruitment hubs also map to the Hub system, hub duplication across the site drops significantly.

---

### 1.6 `flavors/for-your-home/index.html`

- **Route**: `/ItalianExperience/flavors/for-your-home/` → `flavors/for-your-home/index.html`
- **Current Purpose**: Flavors subpage currently acting as a **“coming soon”** utility page.
- **Target Template Type**: **Utility / Status** (sharing Utility hero with 404).
- **Target Hero Variant**: `ie-hero--utility`.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Utility
  - Header
- **Optional Canonical Systems**:
  - Cards (if more content is ever added)
  - Forms (if it becomes a conversion page later)
- **Allowed Local Exceptions**:
  - Flavors-specific copy and background image.
- **Normalization Targets**:
  - Reuse the **canonical Utility hero** created from `404.html` (same `ie-hero--utility` markup and CSS).
  - Remove duplicated `.hero-coming` / `.btn-gold` CSS; use shared Utility + Button systems.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - All `404`-style hero and button classes re-declared in this page: `.hero-coming`, `.hero-bg`, `.hero-overlay`, `.soon-badge`, `.btn-gold`, `.btn-outline`, `.coming-*`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Acceptable** (once Utility hero is centralized, this becomes a thin, content-only variant of the Utility template).
- **Priority Notes**:
  - **Fast follow** after 404 normalization; minimal additional work once the Utility system exists.

---

### 1.7 `flavors/for-your-business/index.html`

- **Route**: `/ItalianExperience/flavors/for-your-business/` → `flavors/for-your-business/index.html`
- **Current Purpose**: Business-focused Flavors service/advisory page with hero, feature cards, product categories, and a contact form.
- **Target Template Type**: **Program / Service** (advisory-flavored program page).
- **Target Hero Variant**: `ie-hero--program` (single-program hero) or `ie-hero--advisory` depending on final taxonomy; structurally, it behaves like a Program / Advisory hero.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (feature + category cards)
  - Forms (Program/Advisory contact shell)
  - Disclosure (if legal notes present)
  - Header
- **Optional Canonical Systems**:
  - Timeline (for process narrative, if desired)
  - Hub (if this page later lists subprograms)
- **Allowed Local Exceptions**:
  - Category-specific iconography and labels.
  - Minor art direction for business imagery, as long as surfaces use `ie-card-*`.
- **Normalization Targets**:
  - Move `.business-hero`, `.hero-bg`, `.hero-overlay`, `.hero-content` into `ie-hero-shell` + `ie-hero--program` / `ie-hero--advisory`.
  - Map `.feature-card`, `.category-card`, `.category-overlay`, `.category-line` to `ie-card-feature` / `ie-card-program`.
  - Replace `.service-contact*` form classes with `ie-form-*` plus Program/Advisory shell.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.business-hero`, `.hero-bg`, `.hero-overlay`, `.hero-content`.
  - `.feature-card`, `.category-card`, `.category-img`, `.category-overlay`, `.category-line`.
  - `.service-contact`, `.service-contact-shell`, `.service-contact-meta`, `.service-contact-card`, `.service-label`, `.service-field`, `.service-intl`, `.service-select`, `.service-textarea`, `.service-btn`, `.service-success`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Acceptable** Program / Service page (good structure but heavy duplication of Forms and Cards).
- **Priority Notes**:
  - **Medium-high priority** because it shares a lot of structure with `flavors/aziende-italiane` and Estates; normalizing one helps the others.

---

### 1.8 `flavors/aziende-italiane/index.html`

- **Route**: `/ItalianExperience/flavors/aziende-italiane/` → `flavors/aziende-italiane/index.html`
- **Current Purpose**: Complex advisory/service page targeting Italian companies, with split hero, map-based narrative, info badges, roadmap steps, and a contact form.
- **Target Template Type**: **Program / Service (Advisory-heavy)**.
- **Target Hero Variant**: `ie-hero--advisory` with optional `ie-hero--split` modifier.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (glass, info badges, disclosure-like sections)
  - Forms (Advisory contact shell)
  - Timeline (roadmap steps)
  - Disclosure (if legal text present)
  - Header
- **Optional Canonical Systems**:
  - Gallery (if map aspects become a gallery-like system)
- **Allowed Local Exceptions**:
  - Map-specific art direction: `.advisory-section`, `.glow-bg`, `.export-map-wrapper`, `.route-line`, `.hub-point`, `.unesco-text`, `.gold-line-long` can remain **page-local** as long as they do not get copied elsewhere.
- **Normalization Targets**:
  - Map hero layout (split image/content) onto `ie-hero-shell` + `ie-hero--advisory`/`ie-hero--split` using hero primitives.
  - Convert `.glass-card`, `.info-badge`, `.roadmap-step`, `.roadmap-number` to Card + Timeline systems (`ie-card-*`, `ie-timeline-*`).
  - Replace duplicated `service-*` form shell with `ie-form-*` and Advisory form shell shared with Estates and Business Flavors.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-split`, `.hero-image`, `.hero-content`.
  - `.advisory-section`, `.glow-bg`, `.export-map-wrapper`, `.info-badge`, `.route-line`, `.hub-point`, `.unesco-text`, `.gold-line-long`, `.glass-card`, `.roadmap-step`, `.roadmap-number`.
  - `.service-contact*` form classes (same pattern as other service pages).
- **Baseline / Strong Reference / Acceptable / Outlier**: **Outlier** (heavy unique layout + duplicated systems; also a key candidate to exercise Timeline and Advisory systems).
- **Priority Notes**:
  - **High priority outlier**: normalizing this page will pressure-test the **Timeline**, **Cards**, **Hero split**, and **Forms** systems together.

---

### 1.9 `recruitment/index.html`

- **Route**: `/ItalianExperience/recruitment/` → `recruitment/index.html`
- **Current Purpose**: Recruitment hub / portal landing, linking to employer and candidate flows.
- **Target Template Type**: **Hub**
- **Target Hero Variant**: `ie-hero--hub` or a **portal-style hub** variant (`ie-hub--portal`) building on hero primitives.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (portal tiles)
  - Hub (portal variant)
  - Header
- **Optional Canonical Systems**:
  - Forms (if hub collects leads in future)
  - Disclosure (if legal notice is added)
- **Allowed Local Exceptions**:
  - Recruitment-specific iconography and interior tile layout details.
- **Normalization Targets**:
  - Normalize `.recruitment-portal`, `.portal-grid`, `.portal-card`, `.portal-overlay`, `.portal-card-inner`, `.portal-label`, `.portal-title`, `.portal-copy`, `.portal-list`, `.portal-cta` into the **Hub system** as the `ie-hub--portal` variant.
  - Map `.cta-button` (and any other portal CTAs) to `ie-btn-*`.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.recruitment-portal`, `.recruitment-portal-bg`, `.recruitment-portal-inner`, `.portal-grid`, `.portal-card`, `.portal-overlay`, `.portal-card-inner`, `.portal-label`, `.portal-title`, `.portal-copy`, `.portal-list`, `.portal-cta`, `.cta-button`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Strong Reference** for **Hub** (portal-style; complements Travel and Flavors hubs).
- **Priority Notes**:
  - **Medium priority** hub; after Travel hub is normalized, this hub should align to the same Hub system.

---

### 1.10 `recruitment/employer/index.html`

- **Route**: `/ItalianExperience/recruitment/employer/` → `recruitment/employer/index.html`
- **Current Purpose**: Recruitment employer program page with hero, bento/stat cards, process sections, legal notes, and employer-focused contact.
- **Target Template Type**: **Program / Service (Recruitment)**.
- **Target Hero Variant**: `ie-hero--program` (recruitment flavor) or `ie-hero--advisory` depending on final taxonomy.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (bento/stat cards)
  - Forms (Recruitment contact shell)
  - Disclosure
  - Timeline (for process steps / stats narrative if unified)
  - Header
- **Optional Canonical Systems**:
  - Gallery (if we later add galleries for employers)
- **Allowed Local Exceptions**:
  - Employer-specific data visualizations and copy within cards.
  - Unique chart layout details if not reused.
- **Normalization Targets**:
  - Normalize `.hero-staffing` hero container into `ie-hero-shell` + `ie-hero--program`.
  - Map `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box` to Card system (`ie-card-bento`, `ie-card-stat`) and unify `.legal-notice` into Disclosure system.
  - If `process-step` styles exist, map them to Timeline system (`ie-timeline-*`).
  - Ensure form shell uses `ie-form-*` where applicable (if present).
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-staffing`, `.hero-swiper`, `.hero-slide` (if present), `.hero-content` overrides.
  - `.bento-card`, `.info-box`, `.economic-chart-box`, `.economic-stat-box`, `.legal-notice`, any `.process-step`-like classes.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Strong Reference** for **Recruitment-flavored Program / Service** (excellent candidate for Cards + Disclosure + Timeline systems).
- **Priority Notes**:
  - **Medium-high priority** to prove out **Card** and **Timeline** systems on a non-Travel, non-Flavors page.

---

### 1.11 `recruitment/candidate/index.html`

- **Route**: `/ItalianExperience/recruitment/candidate/` → `recruitment/candidate/index.html`
- **Current Purpose**: Candidate-facing recruitment page with split hero, glass/timeline cards, and structured steps.
- **Target Template Type**: **Program / Service (Recruitment)**.
- **Target Hero Variant**: `ie-hero--split` (Recruitment split hero) built on `ie-hero-*`.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards
  - Timeline
  - Forms (Recruitment contact shell, if present)
  - Header
- **Optional Canonical Systems**:
  - Disclosure (if legal text included)
- **Allowed Local Exceptions**:
  - Italy/USA-specific imagery and any country flags/visuals.
  - Subtle unique styling of glass cards if still based on `premium-card`.
- **Normalization Targets**:
  - Map `.hero-split-container`, `.hero-split-bg`, `.hero-side`, `.hero-overlay-final` to `ie-hero-shell` + `ie-hero--split`.
  - Convert `.glass-card`, `.step-node`, `.timeline-line`, `.service-check*` into `ie-card-*` and `ie-timeline-*`.
  - Align any inputs / forms (if present) with `ie-form-*`.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-split-container`, `.hero-split-bg`, `.hero-side.side-italy`, `.hero-side.side-usa`, `.hero-overlay-final`.
  - `.glass-card`, `.step-node`, `.timeline-line`, `.service-checks`, `.service-check`, `.service-note`, `.service-file`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Outlier** (very strong candidate for **Timeline** and **Split hero** systems, but currently highly custom).
- **Priority Notes**:
  - **High value outlier** for verifying the **Timeline** and **Split hero** variants; should follow after core Program pages are normalized.

---

### 1.12 `travel/index.html`

- **Route**: `/ItalianExperience/travel/` → `travel/index.html`
- **Current Purpose**: Travel hub landing, introducing Travel plus three main subprograms via horizontal service rail.
- **Target Template Type**: **Hub**
- **Target Hero Variant**: `ie-hero--hub` (narrative + horizontal rail).
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (service tiles)
  - Hub (horizontal rail variant)
  - Header
- **Optional Canonical Systems**:
  - Disclosure (if adding legal strips)
- **Allowed Local Exceptions**:
  - Travel-specific imagery and narrative copy.
- **Normalization Targets**:
  - Map `.hero-narrative`, `.hero-bg`, `.hero-overlay`, `.hero-content` to `ie-hero-shell` + `ie-hero--hub`.
  - Convert `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.gold-line`, `.btn-panel` into **Hub / Selection** + **Card** + **Buttons** systems.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-narrative`, `.hero-bg`, `.hero-overlay`, `.hero-content`.
  - `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.gold-line`, `.btn-panel`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Baseline** for **Hub** template (horizontal rail hub).
- **Priority Notes**:
  - **Very high priority** baseline for Hub; Travel hub + Flavors + Recruitment will collectively define the Hub system.

---

### 1.13 `travel/gapyear/index.html`

- **Route**: `/ItalianExperience/travel/gapyear/` → `travel/gapyear/index.html`
- **Current Purpose**: Gap Year program page with Swiper hero, program cards, atmospheres gallery, and contact form.
- **Target Template Type**: **Program / Service**
- **Target Hero Variant**: `ie-hero--swiper` (hero carousel).
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards (program + location cards)
  - Gallery (hero Swiper + atmospheres gallery)
  - Forms (Program contact shell)
  - Header
- **Optional Canonical Systems**:
  - Timeline (if later used for step narrative)
  - Disclosure (if legal content is added)
- **Allowed Local Exceptions**:
  - Program-specific iconography and colors in cards.
  - Some unique aspects of the atmospheres gallery, provided base gallery system is shared.
- **Normalization Targets**:
  - Map `.hero-odyssey`, `.hero-swiper`, `.hero-slide`, `.hero-overlay-content` to `ie-hero--swiper` + Gallery system (`ie-gallery-*`).
  - Convert `.program-card`, `.location-card`, `.location-info` to `ie-card-program` / `ie-card-feature`.
  - Map `.gap-contact*` form shells and `.gap-*` field classes to `ie-form-*`.
  - Normalize `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active` into Gallery system controls.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-odyssey`, `.hero-swiper`, `.hero-slide.hero-slide`, `.hero-overlay-content`.
  - `.program-card`, `.location-card`, `.location-info`, `.atmospheres-section`, `.location-swiper`.
  - `.gap-contact`, `.gap-contact-shell`, `.gap-contact-meta`, `.gap-contact-card`, `.gap-grid`, `.gap-label`, `.gap-field`, `.gap-intl`, `.gap-full`, `.gap-btn`, `.gap-success`.
  - `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Baseline** for **Program / Service** template (and for Gallery hero).
- **Priority Notes**:
  - **Top priority** for Program template and Gallery system; once normalized, Bespoke and Culinary can follow.

---

### 1.14 `travel/culinary/index.html`

- **Route**: `/ItalianExperience/travel/culinary/` → `travel/culinary/index.html`
- **Current Purpose**: Culinary travel program page, structurally very similar to Gap Year (Swiper hero, sections, contact).
- **Target Template Type**: **Program / Service**
- **Target Hero Variant**: `ie-hero--swiper`.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards
  - Gallery
  - Forms (Program contact shell)
  - Header
- **Optional Canonical Systems**:
  - Timeline, Disclosure (if added)
- **Allowed Local Exceptions**:
  - Culinary-specific imagery and card copy.
- **Normalization Targets**:
  - Reuse the **same Program template and Gallery system** as `travel/gapyear/index.html`.
  - Replace any `.hero-culinary`-specific hero shell behaviors with hero variant modifiers.
  - Align CTAs and forms with `ie-btn-*` and `ie-form-*`.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-culinary`, `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`.
  - Any duplicated `.program-card` / gallery classes (if present).
  - Program form shell classes (same pattern as Gap Year, if defined).
- **Baseline / Strong Reference / Acceptable / Outlier**: **Acceptable** Program / Service page (should be normalized to reuse Gap Year’s canonical patterns).
- **Priority Notes**:
  - **Medium priority**; follow immediately after Gap Year normalization to avoid further drift.

---

### 1.15 `travel/bespoke/index.html`

- **Route**: `/ItalianExperience/travel/bespoke/` → `travel/bespoke/index.html`
- **Current Purpose**: Bespoke travel program page with Swiper hero, custom sections, and contact form.
- **Target Template Type**: **Program / Service**
- **Target Hero Variant**: `ie-hero--swiper`.
- **Required Canonical Systems**:
  - Foundations
  - Buttons
  - Hero
  - Cards
  - Gallery
  - Forms (Program contact shell)
  - Header
- **Optional Canonical Systems**:
  - Timeline, Disclosure (if used)
- **Allowed Local Exceptions**:
  - Bespoke-specific imagery and any unique narrative section that doesn’t generalize.
- **Normalization Targets**:
  - Align hero and gallery structure with the same **Gallery / Slider** system as Gap Year and Culinary.
  - Normalize `.bespoke-contact*` form shell and fields into `ie-form-*`.
  - Map buttons and cards onto global Button and Card systems.
- **Legacy Classes / Patterns To Remove or Migrate**:
  - `.hero-odyssey` / `.hero-swiper` / `.hero-slide` / `.hero-overlay-content` (if parallel to Gap Year).
  - `.bespoke-contact`, `.bespoke-contact-shell`, `.bespoke-contact-meta`, `.bespoke-contact-card`, `.bespoke-grid`, `.bespoke-label`, `.bespoke-field`, `.bespoke-intl`, `.bespoke-full`, `.bespoke-btn`, `.bespoke-success`.
- **Baseline / Strong Reference / Acceptable / Outlier**: **Acceptable** Program / Service page (heavy reuse potential; should converge on the same Program template as Gap Year).
- **Priority Notes**:
  - **Medium priority**, packaged with Culinary as part of the Travel Program family normalization.

---

### 1.16 Additional Public Routes

Repo scan revealed additional HTML in `archive/website/assets-img-stage1/**`. These:

- Are **archive / staging artifacts**, not part of the current public route map.
- Should **not** be treated as active routes for template mapping.
- May still be useful as **historical references**, but are **out-of-scope** for normalization decisions and priorities in this step.

---

## 2. Template Baselines

For each template type, this section names:

- The **best current baseline page**.
- **Why** it is the best baseline.
- **What cleanup is required** before it becomes the canonical reference.

### 2.1 Home Template

- **Best Baseline**: `index.html`
- **Why**:
  - Only page implementing the full Home / brand landing with portal hero + hub + editorial storytelling.
  - Encodes many of the intended **brand signals**, card treatments, and editorial rhythm.
- **Cleanup Needed**:
  - Move all **tokens and logo mechanics** out of inline `<style>` into `site.css` Foundations.
  - Rebase home hero/hub layout on **Hero**, **Buttons**, **Cards**, and **Hub** systems (even if some layout remains home-only).
  - Normalize CTAs (`.editorial-cta`, `.essence-cta`) as `ie-btn-*` variants.

### 2.2 Hub Template

- **Best Baseline**: `travel/index.html`
- **Why**:
  - Cleanest example of a **hub with narrative hero + horizontal rail** of services.
  - Clear, three-service structure that generalizes well to other domains.
  - Less header override / shimmer hacking than Flavors hub.
- **Cleanup Needed**:
  - Extract `.hero-narrative` and `.services-horizontal` families into **Hero** and **Hub / Selection** systems.
  - Map hub tiles to **Cards** (`ie-card-*`) and CTAs to `ie-btn-*`.
  - Introduce a clear `ie-hub--horizontal-rail` variant.

- **Secondary Strong References**:
  - `flavors/index.html` (three-panel hub; best example of `ie-hub--three-panel`, but requires Header behavior normalization).
  - `recruitment/index.html` (portal-style hub; best reference for `ie-hub--portal` variant).

### 2.3 Program / Service Template

- **Best Baseline**: `travel/gapyear/index.html`
- **Why**:
  - Full expression of Program page: **Swiper hero**, **program cards**, **gallery** (atmospheres), and **Program contact** form.
  - Shares patterns with Culinary and Bespoke, making it ideal to centralize into a Program template.
- **Cleanup Needed**:
  - Consolidate hero and gallery into `ie-hero--swiper` + `ie-gallery-*` system.
  - Normalize `.program-card`, `.location-card` into **Card** system.
  - Replace `.gap-*` form shells and fields with `ie-form-*` primitives and Program form shell.

- **Secondary Strong References**:
  - `recruitment/employer/index.html` (Program-like; strong example of combining Cards, Disclosure, and potentially Timeline for an employer audience).

### 2.4 Advisory / Conversion Template

- **Best Baseline**: `estates/index.html`
- **Why**:
  - Clear combination of **Advisory hero**, **glass/disclosure cards**, **legal text**, and **Advisory contact form**.
  - Shares patterns with Flavors advisory pages and Contact.
- **Cleanup Needed**:
  - Map hero implementation onto `ie-hero--advisory` variant.
  - Normalize disclosure cards / text to `ie-card-disclosure` and `ie-disclosure-*`.
  - Replace `service-*` forms with `ie-form-*` primitives and Advisory form shells.

- **Secondary Strong References**:
  - `contact/index.html` (global contact; good reference once forms and hero are normalized).
  - `flavors/for-your-business/index.html` and `flavors/aziende-italiane/index.html` (advisory-flavored Program pages).

### 2.5 Utility / Status Template

- **Best Baseline**: `404.html`
- **Why**:
  - Clean, strongly defined **Utility hero** with clear CTAs and recognizable “status” feel.
  - Reused (almost verbatim) in `flavors/for-your-home/index.html`.
- **Cleanup Needed**:
  - Promote `.hero-coming` pattern to `ie-hero--utility` and the Utility / Status system.
  - Map `.btn-gold` / `.btn-outline` to `ie-btn-*`.

- **Secondary Strong References**:
  - `flavors/for-your-home/index.html` (shares the same Utility hero; becomes a content-only variant of the Utility template once normalized).

---

## 3. Outlier Pages and Why They Are Outliers

This section highlights pages that **significantly diverge** from their template contracts or heavily duplicate systems locally.

### 3.1 `index.html` (Home)

- **Outlier Reasons**:
  - Redefines **Foundations / Tokens** and **logo mechanics** inline instead of consuming them from `site.css`.
  - Implements a highly custom hero/hub system (desktop and mobile) with many local classes that overlap with Hero, Hub, Card, and Button responsibilities.
  - Heavily uses inline `<style>` for behaviors that should be global.
- **Normalization Focus**:
  - Treat as a **Home-only system**, but rebase everything onto shared **Foundations**, **Hero typography**, **Buttons**, **Cards**, and **Hub** primitives.
  - After rebasing, keep only the truly unique layout / interaction bits local.

### 3.2 `flavors/aziende-italiane/index.html`

- **Outlier Reasons**:
  - Complex page with **split hero**, **map-based narrative**, **info badges**, **roadmap steps**, and **contact form**, all styled via local classes.
  - Re-implements **Card**, **Timeline / Roadmap**, **Form**, and **Hero** responsibilities locally instead of using canonical systems.
  - Contains significant **page-only art direction** (map, Unesco gradient) mixed with system responsibilities.
- **Normalization Focus**:
  - Extract reusable patterns into **Hero (split variant)**, **Cards**, **Timeline**, and **Forms**.
  - Leave only map-specific and Unesco-specific styling as allowed local exceptions.

### 3.3 `recruitment/candidate/index.html`

- **Outlier Reasons**:
  - Strongly customized **split hero** layout and **timeline** / multi-step flow using local classes.
  - Re-implements glass cards and steps rather than using `premium-card` / `ie-card-*` and a shared Timeline system.
- **Normalization Focus**:
  - Convert the split hero to `ie-hero--split` and unify timeline visuals into `ie-timeline-*`.
  - Use `ie-card-*` for underlying surfaces.

### 3.4 Multi-page Hero / Form / Button Duplication

Across many routes (e.g. `contact/index.html`, `estates/index.html`, all Travel programs, Flavors advisory pages, Recruitment pages), we see:

- Hero containers (`.hero-*`) that mirror `ie-hero-*` behavior but with local names.
- Form shells and fields (`service-*`, `gap-*`, `bespoke-*`, `aziende-*`) that duplicate `ie-form-*`.
- Button classes (`.btn-gold`, `.service-btn`, `.gap-btn`, `.enroll-btn`, `.request-info-btn`, `.editorial-cta`, `.essence-cta`, `.cta-button`, `.btn-panel`) re-implement Button system behavior per page.

These are **systemic outliers**: not single pages, but families of pages that must be normalized early to stabilize the template contracts.

---

## 4. Template Normalization Rules

For each template type, this section defines:

- What **all pages of that template must share**.
- What **may vary**.
- What **must not vary anymore**.

### 4.1 Home Template

- **Must Share**:
  - **Foundations / Tokens** from `site.css` (no inline tokens).
  - **Hero typography roles** (`ie-hero-title`, `ie-hero-lead`, `ie-hero-copy`) and scroll affordance if present.
  - **Button primitives** (`ie-btn-*`) for CTAs.
  - **Card primitives** (`ie-card-*` / `premium-card`) for portal tiles and editorial blocks.
  - **Header / Footer Shell** from partials.
- **May Vary**:
  - Overall **hero/hub layout** and editorial sequencing (Home can remain more experimental).
  - Specific imagery and content mix (editorial vs proof vs product).
- **Must Not Vary**:
  - Token definitions (colors, radii, glass).
  - Button / CTA behavior (hover, focus).
  - Card surface tokens (glass vs solid).

### 4.2 Hub Template

- **Must Share**:
  - **Hero System** (`ie-hero-shell` + `ie-hero--hub`) for hero behavior, overlay, and typography.
  - **Hub / Selection System** (`ie-hub-*`), either `ie-hub--three-panel`, `ie-hub--horizontal-rail`, or `ie-hub--portal`.
  - **Card surfaces** for hub tiles (`ie-card-*`) and **Buttons** for tile CTAs.
  - **Header / Footer Shell**.
- **May Vary**:
  - Number of hub tiles and their content.
  - Whether the hub uses three panels, horizontal rail, or portal layout (as permitted variants).
  - Optional inclusion of **Disclosure** sections.
- **Must Not Vary**:
  - Re-implementation of hero containers or hub grids as page-only classes.
  - Creation of new hub layouts that are not encoded as `ie-hub--*` variants.

### 4.3 Program / Service Template

- **Must Share**:
  - **Program hero** variant (`ie-hero--program` or `ie-hero--swiper`) built on hero primitives.
  - **Card families** for program highlights (`ie-card-program`, `ie-card-feature`).
  - **Program contact form shell** built on `ie-form-*` with `ie-btn-*` CTAs.
  - **Header / Footer Shell**.
- **May Vary**:
  - Whether the hero uses **carousel** (`ie-hero--swiper`) or static background.
  - Presence of additional sections like **Gallery**, **Timeline**, or **Disclosure**, depending on program complexity.
  - Exact content, imagery, and section ordering, within the template’s allowed system set.
- **Must Not Vary**:
  - Basic form look/feel and field behavior.
  - Underlying card surfaces and spacing tiers.
  - Hero structural behavior (viewport interaction, overlay stack).

### 4.4 Advisory / Conversion Template

- **Must Share**:
  - **Advisory hero variant** (`ie-hero--advisory`) with consistent typography and container behavior.
  - **Advisory contact form shell** using `ie-form-*` fields and `ie-btn-*` CTAs.
  - **Disclosure / Legal System** for any disclaimers.
  - **Card system** for glass / disclosure cards.
  - **Header / Footer Shell**.
- **May Vary**:
  - Specific combination and order of narrative vs proof vs legal sections.
  - Use of additional **Timeline** or **Gallery** sections where advisory stories benefit from them.
- **Must Not Vary**:
  - Introducing new hero shells (`.contact-hero`, `.estates-hero`, etc.) instead of using `ie-hero--advisory`.
  - Creating new per-page disclosure styles or form shells.

### 4.5 Utility / Status Template

- **Must Share**:
  - **Utility hero** (`ie-hero--utility`) with badge/title/subtitle/CTA layout.
  - **Buttons** for CTAs using canonical Button system.
  - **Header / Footer Shell**.
- **May Vary**:
  - Specific messaging (404 vs coming soon vs maintenance).
  - Imagery and subtle layout tweaks within the hero, as long as the core structure remains.
- **Must Not Vary**:
  - Reimplementation of a separate **Utility hero** shell per page.
  - Creation of new button styles specific to Utility pages.

---

## 5. Recommended First Template Refactor Order

This is **not** the full migration plan; it is the recommended **order of template families** to normalize, based on impact and duplication.

1. **Program / Service Template (Travel programs first)**  
   - Start with `travel/gapyear/index.html` as the baseline, then normalize `travel/culinary/index.html` and `travel/bespoke/index.html`.  
   - This will consolidate **Hero (swiper)**, **Cards**, **Gallery**, **Forms**, and **Buttons**, and establish a strong pattern for other service-like pages.

2. **Advisory / Conversion Template (Estates, Contact, Flavors advisory)**  
   - Normalize `estates/index.html` as the Advisory baseline, then align `contact/index.html`, `flavors/for-your-business/index.html`, and `flavors/aziende-italiane/index.html`.  
   - This locks in **Advisory hero**, **Disclosure**, and **Advisory form shells**, and reduces a large amount of form and legal duplication.

3. **Hub Template (Travel hub, Flavors hub, Recruitment hub)**  
   - Use `travel/index.html` as the main Hub baseline, then normalize `flavors/index.html` and `recruitment/index.html` into Hub variants (`ie-hub--three-panel`, `ie-hub--portal`).  
   - This will stabilize hub navigation experiences and centralize **Hub / Selection**, **Cards**, and **Hero hub variants**.

4. **Utility / Status Template (404 + Flavors for-your-home)**  
   - Promote the `404.html` hero as the **Utility / Status system**, then refactor `flavors/for-your-home/index.html` to reuse it.  
   - This provides a low-effort, high-clarity cleanup, eliminating duplicated Utility hero and button styles.

5. **Home Template (index.html)**  
   - After Foundations and systems are stable, rebase `index.html` onto the canonical **Foundations**, **Hero typography**, **Buttons**, **Cards**, and **Hub** systems, keeping only truly unique Home art direction local.  
   - This final step prevents Home from reintroducing new tokens or ad-hoc systems that could conflict with the normalized template families above.

