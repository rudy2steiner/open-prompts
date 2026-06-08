## 0. Prerequisite — SDD review

- [x] 0.1 Update `proposal.md`, `design.md`, and specs for `/` landing + `/gallery` split
- [x] 0.2 Document `HomeSeoSections` and GPT Image 2 density rule in design
- [x] 0.3 Incorporate external SEO audit findings (indexing pipeline, phase split)
- [x] 0.4 Document landing page HTML mockup in design.md §Landing page reference
- [x] 0.5 Confirm production canonical origin — `https://open-prompts.com` (apex; set via `NEXT_PUBLIC_SITE_URL`)
- [x] 0.6 Confirm `6,200+` members stat — hardcoded per mockup

---

## Parallel execution plan

See agent roster below. Wave 1 → 2 (parallel) → 3 (parallel) → 4 (integrate).

---

## Agent A — `seo-foundation` (Wave 1)

- [x] A.1 Create `src/lib/seo/metadata.ts`
- [x] A.2 Add `public/og-default.png` (1200×630)
- [x] A.3 Export `generateMetadata` from `src/app/[locale]/layout.tsx`

## Agent B — `seo-discovery` (Wave 2)

- [x] B.1 Add `src/app/sitemap.ts`
- [x] B.2 Add `src/app/robots.ts`
- [x] B.3 Delete `public/robots.txt`

## Agent C — `seo-legal` (Wave 2)

- [x] C.1 `privacy-policy/page.tsx` — `generateMetadata`; remove `HeadInfo`
- [x] C.2 `terms-of-service/page.tsx` — same
- [x] C.3 Fix `privacyPolicy` + `termsOfService` SEO strings (en/zh/ja)
- [x] C.4 Account `robots: { index: false, follow: false }`
- [x] C.5 Delete `src/components/HeadInfo.tsx`

## Agent D — `seo-routes` (Wave 2)

- [x] D.1 Gallery `buildPageMetadata`
- [x] D.2 Home `buildPageMetadata` (+ dynamic `{count}` in description)
- [x] D.3 Submit/login/create `buildPageMetadata`
- [x] D.4 Account `buildPageMetadata`

## Agent E — `i18n-landing` (Wave 2)

- [x] E.1 `homePage.seo` title/description (en/zh/ja)
- [x] E.2 Hero i18n keys
- [x] E.3 `homePage.seoContent` en (6 features, FAQ, etc.)
- [x] E.4 zh/ja parity
- [x] E.5 Keyword density ~5.7% (en)

## Agent F — `json-ld` (Wave 2)

- [x] F.1 `src/lib/seo/json-ld.ts`
- [x] F.2 `HomeJsonLd.tsx`
- [x] F.3 Wired in `page.tsx`

## Agent G — `landing-hero` (Wave 3)

- [x] G.1 Hero markup (H1, eyebrow, lead, CTAs)
- [x] G.2 Five floating cards
- [x] G.3 Stats row
- [x] G.4 Model bar with `<a>` pills

## Agent H — `landing-sections` (Wave 3)

- [x] H.1 Remove `seoContent.hero` block
- [x] H.2 Six feature cards
- [x] H.3 How-it-works + browser mockup
- [x] H.4 Featured testimonial + 3 cards
- [x] H.5 FAQ sidebar + 6 items
- [x] H.6 Centered CTA
- [x] H.7 Removed browse grids + inline FAQ JSON-LD

## Agent I — `landing-styles` (Wave 3)

- [x] I.1 Playfair + DM Sans (`landing-fonts.ts`)
- [x] I.2 Hero + model bar styles
- [x] I.3 Section styles (features, how, testi, FAQ, CTA)

## Agent J — `landing-footer` (Wave 3)

- [x] J.1 Footer SEO gallery links
- [x] J.2 Footer i18n (en/zh/ja)

## Agent K — `integrate-verify` (Wave 4)

- [x] K.1 Merge conflicts resolved
- [x] K.2 `npm run build` passes
- [ ] K.3 View source `/` — manual check post-deploy
- [ ] K.4 View source `/gallery` — manual check post-deploy
- [ ] K.5 Mockup sections SSR — manual check post-deploy
- [ ] K.6 `/sitemap.xml` + `/robots.txt` — manual check post-deploy
- [x] K.7 Browser mockup links to real `/prompt/…` (Phase 2 P2-E)
- [x] K.8 Task checkboxes updated

## Agent K — post-deploy ops (human)

- [ ] K.9 Set `NEXT_PUBLIC_SITE_URL=https://open-prompts.com` on Vercel
- [ ] K.10 Submit sitemap in Google Search Console
- [ ] K.11 Request indexing for `/` and `/gallery`
- [ ] K.12 Re-check `site:open-prompts.com` after 2–4 weeks

---

## Phase 2 — `optimize-seo-content-indexing` (separate change)

- [x] P2.1 Stable `slug` on prompt records (P2-A) — `from-db.ts` maps `row.slug` → `id`
- [x] P2.2 `/prompt/[slug]/page.tsx` SSR (P2-B)
- [x] P2.3 `/category/[slug]` + `/model/[slug]` (P2-C)
- [x] P2.4 Browser mockup URL → real link (P2-E)
- [x] P2.5 Dynamic sitemap + JSON-LD (P2-D)

---

## Quick dispatch (copy-paste prompts)

```
Agent A: metadata.ts, layout metadataBase, og-default.png
Agent B: sitemap.ts + robots.ts
Agent C: legal pages + HeadInfo removal
Agent D: route generateMetadata → buildPageMetadata
Agent E: messages homePage* / hero* only
Agent F: json-ld.ts + HomeJsonLd on page.tsx
Agent G: PageComponent.tsx (hero + model bar)
Agent H: HomeSeoSections.tsx (sections)
Agent I: landing-page.css + landing-fonts.ts
Agent J: OpenPromptsSiteFooter + footer i18n
Agent K: integrate + verify + build
```
