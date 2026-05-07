## 1. Phase 1 — MVP (聚焦：提示词+封面流式展示 & 模版站内生图，无持久化)

### 1A. Prompt gallery (流式展示)

- [x] 1.1 Implement prompts data source for gallery (MVP can be local JSON; later can move to Supabase)
- [x] 1.2 Implement cover image loading strategy (lazy loading + skeleton + error fallback)
- [x] 1.3 Implement “流式/分页” gallery rendering (infinite scroll or pagination) with stable sorting
- [x] 1.4 Implement search + basic filters (model/tag) that update gallery results without full reload
- [x] 1.5 Implement prompt detail modal (open from card, show cover carousel if multiple, show prompt text, tags, source link)

### 1B. Template-based image generation (站内生图)

- [x] 1.6 Implement a local JSON template source (load templates/variable schemas from a repo JSON file)
- [x] 1.7 Define template variable schema + validation rules (name/type/required/default/enum/constraints)
- [x] 1.8 Implement deterministic template renderer (template + validated variables → rendered prompt + optional negative prompt)

- [x] 1.9 Define `ImageGenerationProvider` interface (create, poll/status, fetch results, optional cancel)
- [x] 1.10 Implement `atlascloud` provider adapter behind the interface
- [x] 1.11 Implement `replicate` provider adapter behind the interface
- [x] 1.12 Add provider registry + default selection rules (per-model mapping + feature flags)
- [x] 1.13 Add provider capability mapping (supported sizes/aspect ratios and parameter allowlist) per provider

- [x] 1.14 Implement Next.js route `POST /api/generations` (validate inputs, call provider, return provider job id + initial status; no persistence)
- [x] 1.15 Implement Next.js route `GET /api/generations/:providerJobId` (proxy provider polling, return status + results; no persistence)

- [x] 1.16 Refactor/port existing landing page HTML template into Next.js components + Tailwind, preserving current layout and modal interactions
- [x] 1.17 Add “立即生图” entry in prompt modal/detail and open generation panel/form (Tailwind UI)
- [x] 1.18 Render variable form from schema (defaults, enums, required validation; advanced params optional)
- [x] 1.19 Implement generate interaction state machine in UI (idle → queued/running → succeeded/failed) with polling
- [x] 1.20 Implement generated images panel (grid + lightbox) with download using provider URLs

## 2. Phase 2 — Iterations (逐步增强)

### 2A. Generation robustness & persistence

- [ ] 2.1 Add server-side retry endpoint and client retry UX
- [ ] 2.2 Add robust timeout/retry strategy (e.g., exponential backoff) and operator-friendly error logging
- [ ] 2.3 Add persistence for generation jobs/results in Supabase (tables + RLS + indexes)
- [ ] 2.4 Add optional R2 persistence for generated images (upload + signed download URLs)

### 2B. Auth, keys, quotas

- [ ] 2.5 Implement self-hosted API key storage (encryption at rest, masked display, revoke/update flow)
- [ ] 2.6 Implement subscription mode gating + quota checks (rate limit / daily limit / concurrent jobs)
- [ ] 2.7 Add basic abuse prevention (size limits, parameter allowlist, request validation)

### 2C. Pages

- [ ] 2.8 Refactor/port existing login page HTML template into Next.js + Tailwind and wire it to Supabase Auth (OAuth + email/password + reset)
- [ ] 2.9 Add “我的生成历史/任务” view (list + detail) and retry button for failed jobs

- [ ] 2.10 Refactor/port existing user center HTML template into Next.js + Tailwind and wire it to Supabase (profile, templates, favorites, generation history, credits/subscription views)
- [ ] 2.11 Refactor/port existing submit page HTML template into Next.js + Tailwind and wire it to submission API (wizard + live preview + image upload)

### 2D. Admin

- [ ] 2.12 Refactor/port existing admin console HTML template into Next.js + Tailwind and wire it to admin APIs (review queue, users, reports, revenue, audit log)
- [ ] 2.13 Add admin/moderator RBAC (Supabase Auth + DB roles/RLS) to protect admin routes and mutations

### 2E. Observability & quality

- [ ] 2.14 Add metrics/logging for job lifecycle (create, start, success, failure, duration) and provider errors
- [ ] 2.15 Add minimal UI empty/error states and copy improvements for gallery & generation flow
- [ ] 2.16 Add tests for renderer/validation and API authorization checks

