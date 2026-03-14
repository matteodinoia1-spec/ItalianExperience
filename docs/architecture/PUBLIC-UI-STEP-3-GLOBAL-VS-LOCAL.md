## Public UI – Global vs Local Responsibility Matrix (Static Site, `portal/**` Excluded)

This document defines **what must be global vs what may remain local** in the **public-site UI** (static HTML under `/ItalianExperience`, excluding `portal/**`).  
It is grounded in the duplication analysis (`PUBLIC-UI-STEP-1`) and layered architecture (`PUBLIC-UI-STEP-2`).

The goal is to let a developer quickly decide:

- **what belongs in shared CSS**
- **what belongs in reusable markup patterns / templates**
- **what can remain page-local**
- **what must never again be defined page-local**

Throughout, “Global” means **Layer 0–2** in `PUBLIC-UI-STEP-2` and **primarily implemented in `assets/css/site.css` + shared partials**.  
“Template-level” means **Layer 3** (page templates such as Home, Hub, Program, Advisory/Conversion, Utility).  
“Page-local” means **Layer 4** (individual page composition and truly unique art direction).

---

## Responsibility Matrix by Area

### 1. Tokens / Design Variables

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Tokens / design variables (colors, radii, spacing, glass) | **Yes** – all core tokens | **Only via modifiers referencing global tokens** (e.g. template-specific aliases) | **No**, except for narrowly scoped experimental tokens that never leave one page | **Global CSS tokens in `assets/css/site.css` (Layer 0); optional later `foundations.css`** | `:root { --brand-gold, --brand-obsidian, --radius-premium, --ice-* }` currently duplicated between `assets/css/site.css` and `index.html`; section spacing tokens `--ie-space-section-y`, header tokens `--ie-header-*` | **Never define or override brand tokens in page `<style>` again.** If you need a new design token, add it once in the foundations block of `site.css` and reference it from primitives/systems. Page-local values must not look or behave like global tokens. |

**Never page-local again**

- Root color tokens, radii, shadows, timing, and spacing tokens currently in `:root` of `assets/css/site.css` and `index.html`.
- Any “glass” surface token equivalents (`--ice-*`, `premium-card` shadows).

**Allowed local**

- A **page-only experimental token** that is clearly *not* part of the global visual language (e.g. a one-off temporary gradient variable for an experiment), and **used only inside that page**. If it becomes reusable, it must be upstreamed to Layer 0.

---

### 2. Base Typography

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Base typography (fonts, base sizes, smoothing) | **Yes** | **Yes**, for template-specific heading scales built on top of global rules | **No** for base body/heading defaults; **Yes** for rare, art-directed headings | **Global in `assets/css/site.css` (Layer 0) with template modifiers in Layer 2–3** | `body` / `html` typography in `assets/css/site.css`; `.brand-font`; various `text-sm`, `text-lg` Tailwind utilities; hero typography via `.ie-hero-title`, `.ie-hero-lead`, `.ie-hero-copy` | **Body font, base size, smoothing, and link defaults must never be redefined in page `<style>`.** Template-specific typography (e.g. advisory hero headline weight) should be system/template modifiers, not page-only rules unless truly experimental. |

**Never page-local again**

- Base `html, body` font, size, and smoothing currently duplicated in `index.html` and `assets/css/site.css`.
- Core hero heading/eyebrow/lead styles (`.ie-hero-eyebrow`, `.ie-hero-title`, `.ie-hero-lead`, `.ie-hero-copy`).

**Allowed local**

- A single page-specific display headline treatment (e.g. an unusually large, art-directed title on `index.html`) **if it does not reflect a repeatable pattern**.

---

### 3. Logo / Brand Mechanics

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Logo / brand mechanics (pure logo, tricolore, wordmark behavior) | **Yes** | **Yes**, for contextual sizing/placement (e.g. header vs hero) | **No** for base shape/color behavior | **Global in `assets/css/site.css` and header partial (Layers 0–2)** | `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore`, `.tricolore-line` defined in `assets/css/site.css` and duplicated inline in `index.html`; header shell in `partials/header.html` | **All logo drawing, colors, and core behavior live in shared CSS.** Pages may only change layout/scale via modifiers (e.g. hero-sized logo) and must not redefine `pure-logo` geometry or base colors. |

**Never page-local again**

- Any redefinition of `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore` in inline `<style>` blocks (as in `index.html` today).

**Allowed local**

- Very minor **positioning tweaks relative to local content** (e.g. special offset in the `index.html` hero), provided the underlying logo classes and tokens are untouched.

---

### 4. Content Containers

Content containers are section wrappers, layout shells, and basic grids that hold content.

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Content containers (section shells, grids, basic wrappers) | **Yes**, for reusable shells and section wrappers | **Yes**, for template-specific shells (Hub, Program, Advisory) | **Yes**, for truly one-off compositions | **Global wrappers in `assets/css/site.css` (Layer 1–2); template markup patterns in HTML; page-local wrappers only for unique layouts** | `.ie-section-core`, `.ie-section-dense`, `.ie-form-section` in `assets/css/site.css`; `.services-horizontal` and `.service-panel` in `travel/index.html`; `.hub-grid` / `.hub-panel` in `flavors/index.html`; `.portal-grid` / `.portal-card` in `recruitment/index.html` | Containers that repeat across pages (hero content, form shells, hub rails) must be global systems. Page-local containers are only for **non-reusable art direction**. |

**Never page-local again**

- Generic section wrappers like “core advisory section”, “standard disclosure section”, “horizontal service rail” currently implemented as `.services-horizontal`, `.hub-grid`, `.portal-grid`, `.disclosure-container`.

**Allowed local**

- A container that **only appears once** and is **tightly coupled to a unique story**, such as the complex `flavors/aziende-italiane/index.html` map/advisory section shell (`.advisory-section`, `.export-map-wrapper`) if confirmed to be non-reusable.

---

### 5. Section Spacing

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Section spacing (vertical rhythm between blocks) | **Yes**, via tokens + a small set of classes | **Yes**, templates can choose which spacing tier(s) they use | **Yes**, for isolated “heroic” sections that intentionally break the rhythm | **Global tokens and spacing utilities in `assets/css/site.css` (Layer 0–1)** | `--ie-space-section-y`, `--ie-space-section-y-mobile`, `.ie-section-core`, `.ie-section-dense`; per-page Tailwind spacing (e.g. `py-24`, `py-32`) in `travel/index.html`, `flavors/index.html`, `contact/index.html` | **Vertical rhythm is a global concern.** Use named spacing tiers instead of scattering Tailwind `py-*` utilities for major sections. |

**Never page-local again**

- Reimplementation of generic section spacing with arbitrary `py-24`, `py-28`, `py-32` across pages where `.ie-section-core` / `.ie-section-dense` could apply.

**Allowed local**

- Sections that are intentionally off-scale, such as a full-viewport immersive gallery or unique narrative block, may use local spacing utilities, but they must not become a de-facto pattern without being promoted to a global spacing tier.

---

### 6. Hero Layout

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Hero layout (viewport behavior, content alignment, background containers) | **Yes**, via `.ie-hero-*` primitives and hero systems | **Yes**, hero variants per template (Hub, Program, Advisory, Utility, Home) | **Yes**, for home-only hero/hub system and rare one-off hero experiments | **Global hero primitives and variants in `assets/css/site.css` (Layer 1–2); templates select variants; pages only set content + allowed modifiers** | `.ie-hero-shell`, `.ie-hero-bg-layer`, `.ie-hero-overlay-layer`, `.ie-hero-content-layer`, `.ie-hero-lockup` defined in `assets/css/site.css`; page-defined hero containers like `.hero-coming` (`404.html`), `.contact-hero` (`contact/index.html`), `.estates-hero` (`estates/index.html`), `.hero-narrative` (`travel/index.html`), `.hero-odyssey` / `.hero-culinary` (`travel/gapyear` / `travel/culinary`), `.hero-staffing` (`recruitment/employer`), `.hero-split-container` (`recruitment/candidate`), `.business-hero` (`flavors/for-your-business`) | **All shared hero layout responsibilities (full-height, overlay stacks, lockup alignment, scroll indicator) are non-negotiably global.** Local heroes may only specialize imagery, copy, and allowed layout modifiers. |

**Never page-local again**

- Hero shells that duplicate `.ie-hero-*` responsibilities: `.hero-coming`, `.contact-hero`, `.estates-hero`, `.hero-narrative`, `.hero-odyssey`, `.hero-culinary`, `.hero-staffing`, `.hero-split`, `.business-hero`.
- Scroll affordance structures (`.explore-indicator`, `.scroll-track`, `.scroll-dot`) implemented in page `<style>` instead of using the shared version.

**Allowed local**

- **Home-only** hero/hub layout in `index.html` (`.hero-container-root`, `.hero-portal-wrapper`, `.portal-card`) as a documented **Home Template system**, still built on global tokens and hero typography.
- A **single experimental hero** on a campaign/utility page, provided it does not get copied to a second page without promotion into the hero system.

---

### 7. Hero Typography

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Hero typography (eyebrow, title, lead, supporting copy) | **Yes** | **Yes**, templates may select scale/density variants | **Yes**, for rare, art-directed hero titles | **Global hero text styles in `assets/css/site.css` (Layer 1–2)** | `.ie-hero-eyebrow`, `.ie-hero-title`, `.ie-hero-title-compact`, `.ie-hero-lead`, `.ie-hero-copy` used across `404.html`, `contact/index.html`, `estates/index.html`, `flavors/index.html`, `travel/*`, `recruitment/*` | Hero text roles are global. Templates and pages should only choose which role(s) to use, not redefine fonts/weights per page. |

**Never page-local again**

- Redefining hero headings/eyebrows via one-off classes when `.ie-hero-*` roles apply.

**Allowed local**

- A single hero that uses a **totally different typographic flavor** (e.g. script or display font for a campaign) as an explicit exception. If reused, it must be turned into a global hero variant.

---

### 8. Hero Background Imagery

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Hero background imagery (photos, illustrations, videos, their URLs) | **No** | **Yes**, for archetypal imagery per template type (optional) | **Yes**, typically page-local | **Background URLs and specific art direction live at page/template level; behavior (cover, position, overlay) is global** | Background image rules inside `.hero-bg`, `.hero-bg-estates`, `.hero-bg` in Travel/Flavors/Recruitment heroes; Swiper background slides in `travel/gapyear/index.html` | Global CSS defines how background images behave (cover, alignment, responsiveness). Actual image URLs and which image is chosen are page/template responsibilities. |

**Never page-local again**

- Global background behavior (cover, attachment, base overlay layering) implemented differently per page; these belong in the hero system.

**Allowed local**

- Specific images, hero background combinations, and per-page crops (e.g. Gap Year program hero photo vs Culinary hero photo).

---

### 9. Hero Overlays / Gradients

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Hero overlays / gradients | **Yes**, base overlay behavior and opacity tiers | **Yes**, specific overlay palettes per template (Travel, Flavors, Recruitment, Advisory) | **Yes**, for single-page, illustrative overlays | **Global overlay layers in `assets/css/site.css` (Layer 1–2) with template modifiers** | `.ie-hero-overlay-layer`, `.ie-hero-overlay-soft` in `assets/css/site.css`; page-specific overlays like `.hero-gradient` in `estates/index.html`, `.hub-gradient` in `flavors/index.html`, `.hero-overlay` variations across heroes | Overlay *mechanics* (layer positioning, blending, base opacity tiers) are global. Overlay *colors* may be template-level; highly unique overlays can be local but must not redefine the mechanics. |

**Never page-local again**

- Multiple copies of the same kind of dark gradient overlay reimplemented per page (e.g. `.hero-overlay`, `.hero-gradient`, `.hub-gradient`) instead of reusing shared overlay tokens.

**Allowed local**

- A unique gradient/artistic overlay tied to a specific illustration (e.g. an Unesco-themed gradient on `flavors/aziende-italiane/index.html`) so long as the base overlay layer behavior is still shared.

---

### 10. Buttons / CTAs

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Buttons / CTAs (visual style and interaction) | **Yes** | **Yes**, templates can define which variants they use and positioning patterns | **Yes**, for text/content, and very rare unique visual experiments | **Global button primitives in `assets/css/site.css` (Layer 1–2) – e.g. `.ie-btn-*` – with template usage guidelines** | Scattered CTA classes: `.btn-gold`, `.btn-outline` (`404.html`, `flavors/for-your-home`); `.hero-form-cta`; `.service-btn`, `.bespoke-btn`, `.gap-btn`, `.enroll-btn` (Travel program pages); `.editorial-cta`, `.essence-cta` (`index.html`); `.cta-button` (`recruitment/index.html`); `.btn-panel` (`travel/index.html`) | **All recurring CTA visuals (color, radius, focus ring, hover) must be canonicalized.** New pages choose among existing button variants instead of defining new ones. |

**Never page-local again**

- Visual button primitives defined entirely in page `<style>` (e.g. `.btn-gold`, `.btn-outline`, `.service-btn`, `.gap-btn`, `.bespoke-btn`, `.enroll-btn`, `.request-info-btn`) when they share the same base look.
- Form submit buttons that do not use the shared button system.

**Allowed local**

- A **single** unusual CTA (e.g. a ghost button with icon-only treatment) used on exactly one campaign/utility page; if re-used once, it must be added as a global variant.

---

### 11. Card Surfaces

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Card surfaces (glass, solid, disclosure, panel) | **Yes** | **Yes**, templates can commit to families (e.g. “premium cards” on Home) | **Yes**, for one-off art-directed cards | **Global card primitives in `assets/css/site.css` (Layer 1–2)** | `.premium-card`, `.ie-card`, `.ie-card-glass`, `.ie-card-solid`, `.ie-card-panel`, `.ie-card-panel-thick` in `assets/css/site.css`; `.glass-card` and `.disclosure-card` in `estates/index.html`; `.hub-glass-card` in `flavors/index.html`; `.bento-card`, `.info-box`, `.economic-chart-box` in `recruitment/employer`; `.feature-card`, `.category-card` in `flavors/for-your-business`; `.glass-card`, `.info-badge`, `.roadmap-step` in `flavors/aziende-italiane` | **Surface appearance (radii, borders, blur, background, elevation) must come from shared primitives.** Page-local classes may layer semantics or slight composition tweaks, not redefine surfaces. |

**Never page-local again**

- Recreating glass card visuals via `.glass-card`, `.hub-glass-card`, `.feature-card` etc. when the existing `premium-card` / `.ie-card-*` primitives can be used.

**Allowed local**

- A uniquely art-directed card with radically different styling (e.g. a “quote on image” card on Home) that is not intended to generalize. If a second page wants it, it becomes a global card variant.

---

### 12. Card Families / Repeated Card Patterns

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Card families / repeated card patterns (feature grids, timelines, disclosure decks) | **Yes** | **Yes**, templates decide which families appear | **Yes**, for truly unique one-off decks | **Global card systems in `assets/css/site.css` (Layer 2) with documented markup patterns** | Program cards in `travel/gapyear/index.html` (`.program-card`, `.location-card`), service cards in `flavors/for-your-business` (`.feature-card`, `.category-card`), bento/timeline cards in recruitment pages (`.bento-card`, `.step-node`, `.timeline-line`), disclosure cards (`.disclosure-card`) in `estates/index.html` | Whenever a card family appears in more than one place or is structurally re-usable, it must be defined as a global system. Page-local decks are limited to narrative one-offs. |

**Never page-local again**

- Timelines/roadmaps (`.step-node`, `.timeline-line`, `.roadmap-step`) defined separately per page.
- Shared disclosure card layouts defined per page.

**Allowed local**

- A single bespoke collection (e.g. a unique gallery of estates with unusual layering) that clearly does not map to any other page.

---

### 13. Forms / Fields

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Forms / fields (inputs, labels, validation, intl-tel) | **Yes** | **Yes**, templates may choose which form shell variant (Program, Advisory, Recruitment) | **No** for field primitives; **Yes** for one-off formless interactions | **Global `ie-form-*` primitives and shells in `assets/css/site.css` (Layer 1–2)** | `ie-form-*` system in `assets/css/site.css`; duplicated field/shell classes: `.field`, `.service-field`, `.gap-field`, `.bespoke-field`, `.service-intl`, `.gap-intl`, `.service-select`, `.service-textarea`, `.service-success` etc. in `contact/index.html`, `estates/index.html`, `travel/gapyear/index.html`, `flavors/for-your-business/index.html`, `flavors/aziende-italiane/index.html` | Field look/feel, label behavior, error states, and intl-tel styling must come from `ie-form-*`. New forms re-use shells and adjust only copy and minimal layout choices. |

**Never page-local again**

- Per-page field styling classes (`.service-field`, `.gap-field`, `.bespoke-field`) that duplicate `ie-form-field`.
- Per-page success and validation styles (`.service-success`, `.gap-success`, `.contact-success`) that could be `ie-form-success`.

**Allowed local**

- A totally different interaction that is not a standard form (e.g. a simple email capture embedded in a hero) may use its own light-weight styling, but if it becomes a pattern it must be integrated into `ie-form-*`.

---

### 14. Form Shells

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Form shells (layout, card, meta, headline pattern around fields) | **Yes** | **Yes**, shell variants per template (Program, Advisory, Recruitment) | **Yes**, for a single extremely custom form section | **Shared shells in `assets/css/site.css` (Layer 2) built from `ie-form-*`** | `.ie-form-section`, `.ie-form-shell`, `.ie-form-meta`, `.ie-form-card`, `.ie-form-grid*` in `assets/css/site.css`; per-page shells: `.service-contact-shell` (Estates, Flavors Advisory), `.gap-contact-shell`, `.bespoke-contact-shell`, `.service-contact-shell` in multiple pages | When a shell appears in multiple pages (contact for different services), it must be expressed as a shared shell variant instead of copied with new prefixes. |

**Never page-local again**

- Re-defining the same “card with meta and form” layout as `.service-contact-shell`, `.gap-contact-shell`, `.bespoke-contact-shell`, `.service-contact-shell` across pages.

**Allowed local**

- A **single** bespoke, marketing-style form wrapper tied to a campaign landing page, as long as the underlying fields still use `ie-form-*`.

---

### 15. Disclosure / Legal Text

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Disclosure / legal text (paragraph style, cards, dividers) | **Yes** | **Yes**, templates decide which disclosure variant they use | **Yes**, for text content and rare extra emphasis | **Shared legal text styles and disclosure cards in `assets/css/site.css` (Layer 1–2)** | `.legal-notice-text` and `.disclosure-card` in `estates/index.html`; `.legal-notice-text` and `.disclosure-container` in `flavors/index.html`; `.legal-notice` in `recruitment/employer/index.html` | Legal text **visual style** is global. Copy is page/template-specific. Developers should not create new per-page disclosure styles if the global style suffices. |

**Never page-local again**

- `legal-notice` / `legal-notice-text` style blocks duplicated and tweaked per page.

**Allowed local**

- A page may choose to **add a single, extra callout** (e.g. bold border on a particularly important warning), but only via established modifiers if they recur.

---

### 16. Timeline / Roadmap Patterns

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Timeline / roadmap patterns (steps, numbered flows) | **Yes** | **Yes**, templates choose which timeline variant to include | **Yes**, for one-off sequences not intended to repeat | **Global timeline/roadmap system in `assets/css/site.css` (Layer 2)** | `.step-node`, `.timeline-line` in `recruitment/candidate/index.html`; `.roadmap-step`, `.roadmap-number` in `flavors/aziende-italiane/index.html`; process steps in `recruitment/employer/index.html` | Whenever a “multi-step path” pattern appears, it must use a shared timeline system. Only purely narrative, never-to-recur flows should be local. |

**Never page-local again**

- Multiple distinct step/timeline classes across pages that do the same job (`.step-node`, `.roadmap-step`, `.process-step`).

**Allowed local**

- A one-off, narrative-only step sequence that uses purely typographic emphasis and no shared structural styling.

---

### 17. Hub / Selection Systems

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Hub / selection systems (multi-panel navigation, portal tiles) | **Yes** | **Yes**, templates (Hub, Home) select hub variants | **Yes**, for a single experimental hub if deliberately isolated | **Global hub systems in `assets/css/site.css` (Layer 2) and documented templates** | Flavors hub: `.hero--flavors.hub-grid`, `.hub-panel`, `.hub-bg`, `.hub-gradient`, `.hub-content`, `.hub-glass-card`, `.hub-kicker`, `.hub-title`; Travel hub: `.services-horizontal`, `.service-panel`, `.panel-bg`, `.panel-content`, `.btn-panel`; Recruitment hub: `.recruitment-portal`, `.portal-grid`, `.portal-card`, `.portal-overlay`; Home hero/portal: `.hero-portal-wrapper`, `.portal-card` | Hubs are core navigation UX. Variants belong in shared systems and templates, not per-page ad-hoc layouts. |

**Never page-local again**

- Copy-packing new hub variants by cloning `.services-horizontal` or `.hub-grid` into other pages instead of using a shared hub system.

**Allowed local**

- A **Home-only portal interaction** (e.g. the current home hero/portal) may remain isolated but must be labeled and treated as the canonical Home hub, not cloned elsewhere.

---

### 18. Galleries / Sliders

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Galleries / sliders (Swiper hero, image carousels) | **Yes**, for base slider mechanics and hero carousel system | **Yes**, templates decide where sliders appear | **Yes**, for content and very unusual slider layouts | **Global gallery/slider systems in `assets/css/site.css` (Layer 2)** | Swiper hero in `travel/gapyear/index.html` / `travel/culinary/index.html` / `travel/bespoke/index.html`: `.hero-swiper`, `.hero-slide`, `.hero-overlay-content`, `.swiper-pagination-bullet`, `.swiper-pagination-bullet-active`; Gap Year atmospheres gallery: `.atmospheres-section`, `.location-swiper`, `.location-card`, `.location-info` | Base slider mechanics and controls must be shared; per-page slides and imagery stay local. If a gallery structure is reused (like atmospheres cards), it should be systemized. |

**Never page-local again**

- Duplicated Swiper styling blocks for bullets, arrows, and slide overlays across program pages.

**Allowed local**

- A one-off, fully custom gallery that is clearly experimental and not reused anywhere else.

---

### 19. Header / Footer

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Header / footer shells and baseline behavior | **Yes** | **Yes**, templates can slightly adjust header/footer sizing/spacing | **No** for structure; **Yes** for local content within footer slots | **Global partials `partials/header.html` / `partials/footer.html` + CSS in `assets/css/site.css` (Layer 1–2)** | `partials/header.html` and `partials/footer.html` injected via `assets/js/bootstrap.js`; header styles such as `.glass-header`, `.header-main-row`, `.nav-container-desktop`, `.nav-container-mobile` in `assets/css/site.css`; header overrides in `flavors/index.html` that disable shimmer | Header/footer shells are global. Templates may only influence optional sections and theme (e.g. dark/light), not reimplement the structure. |

**Never page-local again**

- Overriding global header effects via inline `!important` rules on `#main-header.glass-header::after` as done in `flavors/index.html`. Instead, introduce a global utility or modifier (e.g. `.ie-no-header-shimmer`) and apply it via markup.

**Allowed local**

- Per-page footer content blocks inside slots (e.g. page-specific contact details), but styled via global footer primitives.

---

### 20. Header Behavior Overrides

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Header behavior overrides (shimmer, transparency, sticky behavior) | **Yes** | **Yes**, templates may pick header behavior variant | **No** for core behaviors; **Yes** for single-page experiments that do not reoccur | **Small, named global utilities in `assets/css/site.css` (Layer 1–2) applied via markup** | Inline overrides in `flavors/index.html` that disable shimmer: `#main-header.glass-header::after { display:none !important; }`, `.hub-grid .hub-panel::after { content:none !important; }` | If a header effect must change (e.g. no shimmer on utility pages), introduce a **global modifier class**; never hide header behavior with per-page `!important` rules. |

**Never page-local again**

- Any repeated override of header shimmer, transparency, or stickiness via raw selectors.

**Allowed local**

- A single-page “campaign” header treatment, with the clear understanding that reuse would require promotion to a global modifier.

---

### 21. Page-Specific Art Direction

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| Page-specific art direction (unique layouts, illustrations, map treatments) | **No** | **Sometimes**, if later generalized | **Yes** | **Page-local (Layer 4) with minimal, clearly scoped CSS** | Home hero/portal art direction in `index.html` (`.portal-wrapper`, `.portal-pillar`, `.pillar-bg`, `.hero-glass-card` as home-only version, `.editorial-grid`, `.quote-box`); map/advisory art direction in `flavors/aziende-italiane/index.html` (`.advisory-section`, `.glow-bg`, `.export-map-wrapper`, `.hub-point`, `.unesco-text`, `.gold-line-long`) | Unique storytelling layouts live at page-level, but must still sit on top of global tokens and primitives wherever possible. If another page wants the same pattern, it must be refactored into a system/template. |

**Never page-local again**

- Core layout or typography that is intended across multiple templates masquerading as “art direction” (e.g. using a “special” card style on many pages instead of creating a proper card system).

**Allowed local**

- Unique map illustration behavior, Unesco-specific gradient text, or a one-off editorial layout that is confirmed to be **intentionally non-reusable**.

---

### 22. One-Off Experimental Sections

| Area | Must Be Global? | May Be Template-Level? | May Be Page-Local? | Recommended Ownership | Examples from Repo | Notes / Rules |
| --- | --- | --- | --- | --- | --- | --- |
| One-off experimental sections | **No** | **No**, unless they become stable patterns | **Yes** | **Page-local (Layer 4) with strict constraints** | Experimental-looking sections on Home; potentially future marketing experiments or seasonally themed blocks added to individual pages | Experiments are allowed to stay local as long as they **do not reintroduce tokens, primitives, or systems** and **are not copy-pasted**. Once an experiment appears or is desired on a second page, it must be promoted into a shared system or template. |

**Never page-local again**

- Experiments that silently become de-facto patterns via copy-paste instead of being elevated to global systems.

**Allowed local**

- Truly temporary or campaign-only sections with explicitly limited lifespan or scope.

---

## Non-Negotiable Global Responsibilities

These concerns **must always stay centralized** for the public site (excluding `portal/**`). They **must not be redefined in page-local CSS** once refactored.

- **Brand tokens and foundations**
  - `:root` variables for colors, radii, shadows, timing, spacing, header clearance, and base typography as defined in `assets/css/site.css`.
  - No per-page overrides of `--brand-gold`, `--brand-obsidian`, `--radius-premium`, `--ice-*`, `--ie-space-section-y*`, `--ie-header-*`.
- **Base typography**
  - `html`, `body` font stacks, base sizes, and smoothing.
  - Global link and text defaults.
- **Logo and brand mechanics**
  - `.pure-logo`, `.font-it`, `.font-ex`, `.letter`, `.tricolore` / `.tricolore-line` implementations.
  - Logo layout within the header shell.
- **Hero behavior and structure**
  - `.ie-hero-shell`, `.ie-hero-bg-layer`, `.ie-hero-overlay-layer`, `.ie-hero-content-layer`, `.ie-hero-lockup`, `.ie-hero-*` text roles.
  - All hero overlay mechanics and scroll indicators (`.explore-indicator`, `.scroll-track`, `.scroll-dot`).
- **Shared button appearance**
  - Visual primitives for buttons and CTAs (future `.ie-btn-*` family) including hover, active, and focus behavior.
  - Legacy button classes (e.g. `.btn-gold`, `.btn-outline`, `.hero-form-cta`, `.service-btn`, `.gap-btn`, `.enroll-btn`, `.request-info-btn`) must be mapped to canonical primitives and then removed.
- **Shared form fields and shells**
  - All input, label, select, textarea, and intl-tel styling via `ie-form-*`.
  - Shared form shells (`ie-form-section`, `ie-form-shell`, `ie-form-card`, etc.) that appear across Program/Advisory/Recruitment pages.
- **Card surfaces and core card families**
  - `premium-card` and `.ie-card-*` families; shared disclosure card styles.
  - Basic glass/solid/panel/disclosure elevations and radii.
- **Section spacing tiers**
  - Vertical rhythm defined via `--ie-space-section-y*` and `.ie-section-*` classes.
  - No per-page redefinition of generic section gaps via ad-hoc `py-*` sequences.
- **Timeline / roadmap patterns**
  - Shared step/timeline visuals used in Recruitment and Advisory pages (`.step-node`, `.timeline-line`, `.roadmap-step`, `.roadmap-number` once unified).
- **Header and footer shells and behavior**
  - Structure of `partials/header.html` / `partials/footer.html` and base glass header behavior.
  - Global utilities for header behavior modifiers (e.g. shimmer/no shimmer), rather than ad-hoc per-page overrides.

---

## Allowed Local Exceptions

Local exceptions are **intentionally narrow** and must not be used to sneak global responsibilities back into pages.

- **Background image URLs and per-page imagery**
  - Exact images used in heroes, cards, and galleries (e.g. hero photos, map illustrations, product imagery).
  - Background-image rules should lean on shared hero/card mechanics; only the URL and maybe one-off cropping remain local.
- **Truly unique art direction**
  - Home-only hero/portal interactions in `index.html` (desktop and mobile) may keep specialized layout classes (`.portal-wrapper`, `.portal-pillar`, `.portal-card`, `.hero-glass-card` as home variant), as long as:
    - They rely on global tokens.
    - They do not get copy-pasted to other pages without a refactor into shared systems.
  - Map illustration styling and Unesco-specific treatments in `flavors/aziende-italiane/index.html` (`.advisory-section`, `.glow-bg`, `.export-map-wrapper`, `.hub-point`, `.unesco-text`).
- **Campaign or experiment-only sections**
  - Temporary blocks or microsite-style experiments that:
    - Are explicitly intended for a **single page** and possibly a **limited time**.
    - Do not redefine tokens, primitives, hero systems, or button/form primitives.
    - Are clearly documented in comments as “experiment-only”.
- **Minor intra-section adjustments**
  - Small spacing or alignment tweaks inside a system section (e.g. Tailwind `mt-4`, `gap-3` within a card grid) that do not change the system’s external contract.
  - These remain acceptable as long as they do not approximate a repeatable pattern (if they do, they must be moved into the system).

If any local exception is **desired on a second page**, that is the trigger to **promote it** to a shared system or template rule.

---

## Decision Rules for Future Contributors

This section is a **practical rulebook**. Use it when deciding **where a new style or layout belongs**.

### 1. Duplication and Promotion

- **If a pattern appears twice, escalate it upward.**
  - Two pages using the same hero behavior or card layout means it should be implemented in **shared CSS** (`assets/css/site.css`) as a system or primitive.
  - Example: If the “coming soon” hero in `404.html` and `flavors/for-your-home/index.html` share `.hero-coming` behavior, that hero becomes a global utility/hero variant, not two local blocks.
- **If you copy and paste HTML/CSS from one page to another, stop.**
  - Before pasting, ask: “Does this belong in Layer 1–2 (primitives/systems) or Layer 3 (template) instead?”

### 2. Token and Primitive Rules

- **If a style controls brand color, radius, shadow, or base typography, it belongs to tokens/primitives, not pages.**
  - Do not declare `:root` variables or `.premium-card`-style surfaces in page `<style>` blocks.
- **If a button or input “looks like” existing primitives, use or extend those primitives.**
  - Do not create new `.btn-*` or `.field-*` classes whose only difference is a small tweak in color or radius.

### 3. Global vs Template vs Page-Local Logic

- **If a page-local class controls global spacing, migrate it.**
  - Any class that adjusts main section spacing, hero clearance from header, or baseline typography across sections must move into shared CSS, not stay on a single page.
- **If a class is tied to a template type (Home, Hub, Program, Advisory, Utility), define it at template/system level.**
  - Example: Program page hero and contact sections belong to the Program Template and its systems (`assets/css/site.css` + shared markup), not per-program local CSS.
- **If a component is semantic-only on a page (e.g. `.advisory-highlight`), it may stay local, but its visual tokens must be shared.**

### 4. Hero and Layout Rules

- **If a hero fills the viewport, start from `.ie-hero-shell`.**
  - New heroes must use global hero primitives; rolling a new hero shell is only allowed for explicitly experimental, one-off use.
- **If you create a new overlay or gradient that looks like existing ones, generalize it.**
  - Define it as a new overlay variant or token, not as a private per-page selector.

### 5. Buttons and CTAs

- **If a CTA differs only visually (same role, same type of action), do not create a new class.**
  - Use an existing `.ie-btn-*` variant or add a **modifier** to the global system if the difference is intentional and reusable.
- **Text and destination can change; primitives should not.**
  - Copy, icons, and URLs are page responsibilities. Color, radius, borders, and focus styles are global.

### 6. Forms and Fields

- **If you find yourself naming a new `.something-field` or `.something-select`, stop.**
  - Use `ie-form-field`, `ie-form-select`, etc. and only adjust layout within the grid.
- **If a new page needs a familiar contact form, adopt an existing shell.**
  - Reuse the “Program contact”, “Advisory contact”, or “Recruitment contact” shells instead of building a new one.

### 7. Header, Footer, and Shared Shells

- **If you need a header behavior change on multiple pages, create a modifier, not overrides.**
  - Example: Instead of writing `#main-header.glass-header::after { display:none !important; }` in `flavors/index.html`, define `.ie-no-header-shimmer` in `site.css` and apply it via markup.
- **Never modify header/footer structure directly in page HTML.**
  - Use the partials (`partials/header.html`, `partials/footer.html`) and global CSS.

### 8. Experiments and Local Exceptions

- **If an experiment is meant for one page, you may keep it local, but you must:**
  - Avoid redefining tokens, primitives, or systems.
  - Document it as “experiment-only” in a comment.
  - Keep its CSS small and well-scoped.
- **If anyone wants to reuse an experiment, promote it.**
  - Refactor the shared visual/behavioral aspects into Layer 1–2 and update both pages to use the new system.

### 9. Tailwind Usage

- **Use Tailwind for local adjustment, not systems.**
  - `mt-4`, `gap-6`, `text-sm` inside sections are fine.
  - Large blocks of Tailwind-only layout for heroes, hubs, or forms are not; those belong in named CSS selectors in `assets/css/site.css`.
- **If a Tailwind utility combination appears in two places, consider a named class.**
  - Wrap the utilities in a single named class in `site.css` for reuse.

---

By following this responsibility matrix, non-negotiable global list, and decision rules, contributors can **safely evolve the public-site UI** while avoiding the hero/button/card/form duplication and drift documented in `PUBLIC-UI-STEP-1`, and staying aligned with the layered model defined in `PUBLIC-UI-STEP-2`.

