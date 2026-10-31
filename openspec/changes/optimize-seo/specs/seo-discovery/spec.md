## ADDED Requirements

### Requirement: XML sitemap

The application SHALL serve a sitemap at `/sitemap.xml` listing all public locale routes.

#### Scenario: Sitemap includes core public pages

- **WHEN** a crawler requests `/sitemap.xml`
- **THEN** the response is valid XML with URLs for home (`/`), gallery (`/gallery`), submit, create, login, privacy-policy, and terms-of-service
- **AND** each logical page appears for locales `en` (unprefixed), `zh`, and `ja` where applicable

#### Scenario: Sitemap uses absolute URLs

- **WHEN** the sitemap is generated
- **THEN** every `<loc>` value is an absolute URL prefixed with the configured site origin

#### Scenario: Sitemap is reachable in production

- **WHEN** a crawler requests `https://open-prompts.com/sitemap.xml` after Phase 1 deploy
- **THEN** the response is HTTP 200 with valid XML (not an error page)

### Requirement: Robots.txt

The application SHALL serve `/robots.txt` with crawl rules for public content.

#### Scenario: Public allow and private disallow

- **WHEN** a crawler requests `/robots.txt`
- **THEN** the file allows crawling of `/`
- **AND** disallows `/api/` and `/account/`
- **AND** references the sitemap URL `{siteUrl}/sitemap.xml`

#### Scenario: Robots references sitemap

- **WHEN** a crawler requests `/robots.txt`
- **THEN** a `Sitemap:` directive is present with the absolute sitemap URL

### Requirement: Home JSON-LD structured data

The home landing page SHALL include JSON-LD describing the site, curated prompts, and FAQs in a single `@graph`.

#### Scenario: WebSite with SearchAction on home

- **WHEN** the home landing HTML is rendered
- **THEN** a `<script type="application/ld+json">` block is present in the document
- **AND** it contains a `WebSite` entity with name "Open Prompts" and the site URL
- **AND** the `WebSite` includes a `SearchAction` `potentialAction` targeting the gallery

#### Scenario: ItemList on home

- **WHEN** the home landing HTML is rendered
- **THEN** the JSON-LD `@graph` contains an `ItemList` with up to 20 list items derived from approved gallery prompts
- **AND** each item includes at minimum a `name` field

#### Scenario: FAQPage on home

- **WHEN** the home landing HTML is rendered
- **THEN** the JSON-LD `@graph` includes a `FAQPage` entity matching the visible FAQ section
- **AND** there is only one FAQ JSON-LD block (no duplicate standalone script in `HomeSeoSections`)

#### Scenario: JSON-LD is server-rendered

- **WHEN** JavaScript is disabled in the browser
- **THEN** the JSON-LD script is still present in the initial HTML response

### Requirement: Localized SEO copy parity

SEO title, description, and keywords for home, gallery, and migrated pages SHALL be defined in en, zh, and ja message files.

#### Scenario: Three-locale home and gallery SEO strings

- **WHEN** `generateMetadata` runs for locale `en`, `zh`, or `ja` on home or gallery
- **THEN** each locale returns non-empty title and description from its respective `messages/{locale}.json` entry

### Requirement: Post-deploy search console submission

After Phase 1 deploy, the sitemap SHALL be submitted to Google Search Console manually.

#### Scenario: Sitemap submitted to GSC

- **WHEN** Phase 1 is deployed to production with `NEXT_PUBLIC_SITE_URL` set
- **THEN** the operator submits `{siteUrl}/sitemap.xml` in Google Search Console
- **AND** URL Inspection is used to request indexing for `/` and `/gallery`
