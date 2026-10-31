## ADDED Requirements

### Requirement: Landing page matches reference mockup structure

The home page (`/`) SHALL implement the section inventory defined in `design.md` §Landing page reference, rendered as server HTML.

#### Scenario: Full section stack present

- **WHEN** the home page HTML is rendered without JavaScript
- **THEN** the document includes in order: hero (eyebrow, H1, lead, CTAs, stats), 5 floating prompt cards, model bar, features (6), how-it-works (with browser mockup), testimonials (featured + 3), FAQ (sidebar + 6 items), and CTA
- **AND** browse-by-model and browse-by-category card grids are **not** present

#### Scenario: Hero H1 matches mockup intent

- **WHEN** locale is `en`
- **THEN** the primary H1 communicates "Free GPT Image 2 Prompts Gallery" with italic emphasis on "GPT Image 2"
- **AND** the eyebrow reads "Community · Daily Updates from X"

#### Scenario: Five hero preview cards

- **WHEN** the gallery has at least one prompt with an image
- **THEN** the hero visual shows up to 5 floating cards with prompt title and model label
- **AND** cards use real gallery data from `getPromptGallery()`

### Requirement: Model bar navigation

A "Works with" model bar SHALL appear below the hero with pill links to the gallery.

#### Scenario: Model pills are crawlable links

- **WHEN** the model bar is rendered
- **THEN** pills for All Models, GPT Image 2, DALL·E 3, Midjourney, and Stable Diffusion are `<a href>` elements
- **AND** each links to `/gallery` with the appropriate `model` query parameter (localized path)
- **AND** no JavaScript is required to follow the links

### Requirement: GPT Image 2 keyword focus (mockup-aligned)

English landing copy SHALL front-load "GPT Image 2" in metadata and body per the mockup keyword strategy in `design.md`.

#### Scenario: Title and meta description

- **WHEN** `generateMetadata` runs for `/` with locale `en`
- **THEN** title is `Free GPT Image 2 Prompts Gallery — Community AI Prompts | Open Prompts`
- **AND** description mentions curated GPT Image 2 prompts, community, and supported models

#### Scenario: Body density in seoContent

- **WHEN** SEO body strings under `homePage.seoContent` (features, how-it-works, FAQ answers) are concatenated for locale `en`
- **THEN** "GPT Image 2" phrase density is between **5% and 7%**
- **AND** testimonials contain at most one phrase mention per card

### Requirement: Features section (6 cards)

The features section SHALL present six feature cards with mockup titles and GPT Image 2-focused descriptions.

#### Scenario: Six feature cards

- **WHEN** `HomeSeoSections` renders features for locale `en`
- **THEN** exactly 6 cards are shown with titles matching the mockup inventory in `design.md`
- **AND** each card description is non-empty server HTML

### Requirement: How it works with browser mockup

The how-it-works section SHALL use a two-column layout with steps and a decorative browser mockup.

#### Scenario: Browser mockup is decorative

- **WHEN** the how-it-works section renders
- **THEN** a browser chrome mockup shows a sample GPT Image 2 prompt and generated result
- **AND** the URL bar displays `open-prompts.com/prompt/…` as text only (not a hyperlink) until Phase 2 ships

#### Scenario: Four steps

- **WHEN** locale is `en`
- **THEN** four numbered steps are present matching mockup titles (browse → copy → generate → share)

### Requirement: Testimonials with featured quote

The testimonials section SHALL include one featured full-width quote and three star-rated cards.

#### Scenario: Featured testimonial

- **WHEN** testimonials render for locale `en`
- **THEN** a featured block shows a long quote, @handle, role, and contributor tag
- **AND** three additional cards show 5-star display, quote, avatar, @handle, and role

### Requirement: FAQ sidebar layout (6 items)

The FAQ section SHALL use a two-column layout with sidebar copy and six accordion items.

#### Scenario: Six FAQ items

- **WHEN** FAQ renders for locale `en`
- **THEN** six questions are present matching the mockup list in `design.md`
- **AND** a sidebar includes "Everything you need to know" and a contact box with GitHub and X links

#### Scenario: Accordion without JavaScript

- **WHEN** FAQ items are rendered
- **THEN** each item uses `<details>/<summary>` (or equivalent SSR pattern)
- **AND** the first item is expanded by default via the `open` attribute

### Requirement: Centered CTA section

A call-to-action section SHALL close the marketing content before the footer.

#### Scenario: CTA content and actions

- **WHEN** the CTA section renders for locale `en`
- **THEN** it includes a title referencing GPT Image 2, a subtitle mentioning community size, primary link to gallery, secondary link to submit, and a footnote with prompt count and "Daily updates from X"

### Requirement: Landing typography

The landing page SHALL use Playfair Display for display headings and DM Sans for body text.

#### Scenario: Fonts loaded on landing

- **WHEN** `/` is rendered
- **THEN** hero H1, section titles, and stat numbers use a serif display face (Playfair Display)
- **AND** body copy uses DM Sans

### Requirement: Localized SEO content parity

All landing strings SHALL be defined in `messages/en.json`, `messages/zh.json`, and `messages/ja.json`.

#### Scenario: Three-locale landing strings

- **WHEN** the landing renders for `en`, `zh`, or `ja`
- **THEN** each section returns non-empty localized strings
- **AND** zh/ja translations convey equivalent meaning without literal English keyword stuffing

### Requirement: Gallery CSR limitation (unchanged)

Individual prompt bodies on `/gallery` remain client-rendered until Phase 2.

#### Scenario: Gallery not required on landing

- **WHEN** a crawler fetches `/` without JavaScript
- **THEN** individual prompt full text is not required on the landing page beyond hero card titles and SEO copy
