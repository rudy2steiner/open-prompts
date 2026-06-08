## ADDED Requirements

### Requirement: Global metadata base and defaults

The application SHALL set `metadataBase` from the configured site URL and provide site-wide default Open Graph and Twitter metadata in the locale layout.

#### Scenario: Production site URL resolves metadata

- **WHEN** `NEXT_PUBLIC_SITE_URL` is set to a valid HTTPS origin
- **THEN** the root locale layout exports `metadataBase` equal to that origin
- **AND** child pages inherit default `openGraph.siteName` and a default OG image at `/og-default.png`

#### Scenario: Development fallback

- **WHEN** `NEXT_PUBLIC_SITE_URL` is unset and `NODE_ENV` is development
- **THEN** metadata helpers use `http://localhost:3000` as the site URL without throwing

#### Scenario: Canonical is never undefined

- **WHEN** any public page HTML is rendered with JavaScript disabled
- **THEN** the document includes a `<link rel="canonical">` with a valid absolute HTTPS (or localhost) URL
- **AND** the canonical value is not the string `undefined`

### Requirement: Per-page generateMetadata for public routes

Every public page SHALL define server-side `generateMetadata` using shared SEO helpers instead of the client `HeadInfo` component.

#### Scenario: Home landing metadata

- **WHEN** a crawler or browser requests `/` (en) or `/{locale}` (zh, ja)
- **THEN** the HTML `<head>` includes title, description, and keywords from `OpenPrompts.homePage.seo` translations
- **AND** Open Graph and Twitter tags match the same title and description
- **AND** no `HeadInfo` component is rendered

#### Scenario: Gallery metadata

- **WHEN** a crawler or browser requests `/gallery` (en) or `/{locale}/gallery` (zh, ja)
- **THEN** the HTML `<head>` includes title, description, and keywords from `OpenPrompts.galleryPage.seo` translations
- **AND** no `HeadInfo` component is rendered

#### Scenario: Legal pages metadata

- **WHEN** a user requests `/privacy-policy` or `/terms-of-service` (per locale)
- **THEN** each page serves localized title and description via `generateMetadata` in its `page.tsx`
- **AND** title and description reference Open Prompts (not legacy SoraWebui branding)
- **AND** description is non-empty
- **AND** `HeadInfo` is not used on those pages

### Requirement: Canonical and hreflang alternates

Public pages SHALL expose canonical URLs and `hreflang` alternates for en, zh, and ja via Next.js `metadata.alternates`.

#### Scenario: English canonical at root

- **WHEN** the active locale is `en` and the page path is the home landing
- **THEN** the canonical URL is `{siteUrl}/` without a locale prefix

#### Scenario: Gallery canonical

- **WHEN** the active locale is `en` and the page path is `/gallery`
- **THEN** the canonical URL is `{siteUrl}/gallery`

#### Scenario: Localized canonical and alternates

- **WHEN** the active locale is `zh` or `ja`
- **THEN** the canonical URL is `{siteUrl}/{locale}{path}`
- **AND** alternates include `en`, `zh`, `ja`, and `x-default` (pointing to the English URL) for the same logical page

### Requirement: Keyword-rich title tags

Home and gallery title tags SHALL include high-intent model keywords per the keyword strategy in `design.md`.

#### Scenario: English home title matches landing mockup

- **WHEN** `generateMetadata` runs for `/` with locale `en`
- **THEN** the title is `Free GPT Image 2 Prompts Gallery — Community AI Prompts | Open Prompts`
- **AND** the meta description mentions 997+ (or live count) curated GPT Image 2 prompts and supported models

#### Scenario: English gallery title includes model names

- **WHEN** `generateMetadata` runs for `/gallery` with locale `en`
- **THEN** the title includes references to GPT Image 2, Midjourney, and DALL·E
- **AND** the title is distinct from the home page title

### Requirement: HeadInfo deprecation

The legacy `HeadInfo` client component SHALL be removed after all consumers migrate to `generateMetadata`.

#### Scenario: No HeadInfo imports remain

- **WHEN** the SEO migration is complete
- **THEN** `src/components/HeadInfo.tsx` is deleted
- **AND** no file in `src/` imports `HeadInfo`

### Requirement: Account pages noindex

Authenticated account routes SHALL not be indexed by search engines.

#### Scenario: Account metadata robots

- **WHEN** a crawler requests any `/account` route
- **THEN** the page metadata includes `robots` with `index: false` and `follow: false`
