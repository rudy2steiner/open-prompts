# Open Prompts

An open-source prompt gallery + template-based AI image generation workspace.

- Browse prompt templates in `/${locale}/gallery`
- Click “Generate” to jump into `/${locale}/create` and use that template
- Generate images via pluggable providers
- No database required for MVP; generation history is persisted in `localStorage`

## Languages

- English
- [简体中文](./README.zh-CN.md)
- [日本語](./README.ja-JP.md)

## Tech stack

- Next.js (App Router)
- Tailwind CSS + daisyUI
- `next-intl` (i18n)

## Get started (local)

### 1) Install

```bash
npm install
```

### 2) Configure env

Copy `.env.example` to `.env.local` and fill what you need:

```bash
cp .env.example .env.local
```

### 3) Run dev server

This project runs on port **3001** by default:

```bash
npm run dev
```

Open `http://localhost:3001/en`.

## Providers & API keys

Currently supported:

- **atlascloud**: Atlas Cloud image generation API (**supported**)
  - Sign up: `https://www.atlascloud.ai?ref=7METWL`
  - Dashboard: `https://www.atlascloud.ai/zh/console/dashboard?ref=7METWL`
  - Create API key: `https://www.atlascloud.ai/console/api-keys?ref=7METWL`
  - Docs: `https://atlascloud.ai/docs/api-keys?ref=7METWL`

Planned / WIP:

- **internal**: server-side provider (keys stay on the server)
  - OpenAI keys: `https://platform.openai.com/api-keys`

- **replicate**: Replicate image generation API
  - Get a Replicate API token: `https://replicate.com/account/api-tokens`
  - Docs: `https://replicate.com/docs/reference/http`

Environment variables are listed in `.env.example`.

### Client-side API key overrides (Create page modal)

When selecting a provider on the Create page, you can optionally enter an API key override (where available).

- Stored in your browser `localStorage` (per provider)
- Sent to `/api/generations` and used server-side for that request

Security note: anyone with access to your browser profile can read `localStorage`. Prefer server-side env keys for production.

## Test mode (no real API calls)

Set:

- `USE_TEST_MODE=true`
- `TEST_IMAGE_URL=<any image url>`

Then `/api/generations` will return mocked jobs and polling will always succeed with the `TEST_IMAGE_URL`.

## Project structure

- `src/app/[locale]/gallery/`: prompt gallery
- `src/app/[locale]/create/`: generator workspace
- `src/app/[locale]/api/generations/*`: create + poll generation jobs
- `src/lib/generation/providers/*`: provider adapters
- `src/components/prompt-gallery/*`: shared gallery UI components
- `messages/*`: i18n messages

## Contributing

Issues and PRs are welcome.
