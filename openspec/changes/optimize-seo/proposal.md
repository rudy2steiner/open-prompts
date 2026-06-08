## Why

### External audit finding (May 2026)

`site:open-prompts.com` returned **zero Google results**. Competitors index 10,000+ pages. Root causes: broken canonical, no sitemap, thin crawl surface (~997 prompts on one CSR gallery page), fragmented metadata.

### Landing page gap

Current `/` implementation diverges from the **approved HTML mockup** (May 2026):

- Generic H1 (`Explore. Reuse. Create.`) vs mockup's `Free GPT Image 2 Prompts Gallery`
- 3 features / 5 FAQs vs mockup's **6 features / 6 FAQs**
- No model bar, no browser mockup, no featured testimonial
- Browse-by-model/category card grids not in mockup
- ~3% keyword density vs mockup's GPT Image 2-focused copy (~5–7%)
- Title/meta not matching mockup `<head>`

The mockup communicates the core differentiator (X.com daily sync + on-site GPT Image 2 generation) — critical for both SEO and conversion.

This change has two phases:

- **Phase 1a** — Fix indexing pipeline (canonical, sitemap, robots, JSON-LD, HeadInfo removal)
- **Phase 1b** — Landing page redesign per reference mockup (`design.md` §Landing page reference)
- **Phase 2** (separate change) — Per-prompt SSR pages

## What Changes

### Already implemented (baseline — to be refactored in 1b)

- **`/` landing** — `PageComponent` hero + `HomeSeoSections` (partial mockup alignment)
- **`/gallery`** — Full gallery UI; metadata on `gallery/page.tsx`
- **Nav** — Home tab; gallery at `/gallery`
- **i18n** — `homePage.seoContent` in en/zh/ja (pre-mockup copy)

### Phase 1a — indexing pipeline (remaining)

- `src/lib/seo/metadata.ts`, `json-ld.ts`
- `metadataBase` + `buildPageMetadata()` — fixes `canonical: undefined`
- `sitemap.ts`, `robots.ts`
- `WebSite` + `SearchAction` + `ItemList` + `FAQPage` `@graph`
- Privacy/terms migration; delete `HeadInfo.tsx`
- `public/og-default.png`
- Post-deploy GSC sitemap submit

### Phase 1b — landing mockup (remaining)

- **Metadata:** `homePage.seo` title/description per mockup `<head>`
- **Hero:** Eyebrow, H1, lead, CTAs, stats; **5** floating cards from gallery data
- **Model bar:** "Works with" pills linking to `/gallery?model=…`
- **Features:** 6 cards with GPT Image 2-focused copy
- **How it works:** 4 steps + decorative browser mockup (2-column)
- **Testimonials:** Featured quote + 3 star cards with @handles
- **FAQ:** 6 items, sidebar layout, `<details>` accordion (no JS)
- **CTA:** Centered section per mockup
- **Remove:** Browse-by-model/category card grids; separate SEO hero H2 block
- **Footer:** Add "GPT Image 2 Gallery" / "DALL·E 3 Gallery" SEO links
- **Styles:** Playfair Display + DM Sans, gold accent `#e8c87a`, mockup animations
- **i18n:** Rewrite en copy from mockup; zh/ja parity

### Phase 2 — `optimize-seo-content-indexing`

- `/prompt/[slug]`, `/category/[slug]`, `/model/[slug]`
- Dynamic sitemap; prompt-level structured data
- Browser mockup URL becomes real

## Capabilities

### Phase 1

- `site-metadata` — Metadata API, canonical/hreflang, mockup title tags
- `seo-discovery` — Sitemap, robots, JSON-LD `@graph`
- `home-seo-content` — **Redesign** per landing mockup (was "mostly done"; now requires refactor)

### Phase 2 (separate)

- `content-indexing` — Per-prompt SSR, dynamic sitemap

## Impact

| Area | Files |
|------|-------|
| Landing hero | `src/app/[locale]/PageComponent.tsx` |
| SEO sections | `src/components/open-prompts/HomeSeoSections.tsx` |
| Styles | `src/app/[locale]/landing-page.css` |
| Fonts | `layout.tsx` or page-level `next/font` |
| Footer | `OpenPromptsSiteFooter.tsx` |
| i18n | `messages/{en,zh,ja}.json` — `homePage.*` |
| SEO infra | `src/lib/seo/*`, `sitemap.ts`, `robots.ts` |
| Reference | `openspec/changes/optimize-seo/references/landing-page.html` |

## Non-Goals

- Per-prompt URLs in Phase 1 (browser mockup decorative)
- Site-wide typography change on gallery/app pages
- Nav items "Models" / "Docs" (no routes)
- Blog / resource section

## Success metrics

| Metric | Before | After Phase 1a+1b |
|--------|--------|-------------------|
| Canonical | `undefined` | Valid absolute URL |
| `/sitemap.xml` | Error | 21 locale URLs |
| Home title | Generic | Mockup GPT Image 2 pattern |
| SSR marketing sections | Partial | Full mockup inventory |
| `site:` results | 0 | Home + gallery indexed (2–4 wks post-GSC) |
