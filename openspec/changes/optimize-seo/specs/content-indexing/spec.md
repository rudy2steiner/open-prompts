## Scope

**Phase 2 only** — follow-on change `optimize-seo-content-indexing`. Not implemented in `optimize-seo` Phase 1.

Addresses external audit findings:

- ~997 prompts not individually crawlable
- Category/model filters use query params only (`?model=`, `?category=`)
- Competitors index 10,000+ prompt pages; open-prompts.com has ~0

## ADDED Requirements

### Requirement: Per-prompt SSR pages

Each approved gallery prompt SHALL have a dedicated server-rendered page at `/prompt/[slug]`.

#### Scenario: Prompt page is indexable

- **WHEN** a crawler requests `/prompt/{slug}` for an approved prompt
- **THEN** the HTML includes a unique `<title>` containing the prompt name and primary model
- **AND** a unique meta description
- **AND** the full prompt text in visible `<p>` or `<pre>` tags in the initial HTML
- **AND** preview images include descriptive `alt` text

#### Scenario: Prompt page canonical

- **WHEN** a prompt page is rendered for locale `en`
- **THEN** the canonical URL is `{siteUrl}/prompt/{slug}` without locale prefix

### Requirement: Indexable category and model landing pages

Category and model filters SHALL have path-based landing pages in addition to gallery query params.

#### Scenario: Category landing page

- **WHEN** a crawler requests `/category/{slug}` (e.g. `cinematic-portrait`)
- **THEN** the page includes a unique title, description, and server-rendered list of prompts in that category
- **AND** links to individual `/prompt/{slug}` pages

#### Scenario: Model landing page

- **WHEN** a crawler requests `/model/{slug}` (e.g. `gpt-image-2`)
- **THEN** the page includes a unique title, description, and server-rendered list of prompts for that model

#### Scenario: Home browse cards use path routes

- **WHEN** Phase 2 ships
- **THEN** home browse-by-model and browse-by-category cards link to `/model/{slug}` and `/category/{slug}` (not only `?model=` / `?category=`)

### Requirement: Prompt-level structured data

Prompt and category pages SHALL include JSON-LD beyond the home-page `@graph`.

#### Scenario: ImageObject on prompt page

- **WHEN** a prompt page is rendered
- **THEN** JSON-LD includes an `ImageObject` with `name`, `description`, and `contentUrl` when an image exists

#### Scenario: BreadcrumbList on category and prompt pages

- **WHEN** a category or prompt page is rendered
- **THEN** JSON-LD includes a `BreadcrumbList` with Home → Gallery → Category/Prompt hierarchy

### Requirement: Dynamic sitemap

The sitemap SHALL include all prompt, category, and model landing URLs.

#### Scenario: Sitemap scales with catalog

- **WHEN** a crawler requests `/sitemap.xml` after Phase 2 deploy
- **THEN** the sitemap includes URLs for all approved prompts plus category and model landing pages across locales
- **AND** the total URL count is proportional to catalog size (~997+ prompts)

### Requirement: Slug stability

Prompt slugs SHALL be stable across deploys to avoid broken indexes.

#### Scenario: Slug does not change on title edit

- **WHEN** a prompt title is updated in the admin UI
- **THEN** the public `/prompt/{slug}` URL remains unchanged unless an explicit slug redirect is created
