# Open Prompts

**Open Prompts** is an open-source platform for discovering, sharing, and reusing **AI image prompt templates**. Browse a curated gallery, open any template in a focused generation studio, and produce images with pluggable providers—without leaving one workflow.

Repository: [github.com/rudy2steiner/open-prompts](https://github.com/rudy2steiner/open-prompts)

Licensed under the [Apache License, Version 2.0](LICENSE).

**Languages:** English · [简体中文](./README.zh-CN.md) · [日本語](./README.ja-JP.md)

---

## Introduction

Most teams collect prompts in docs, threads, or spreadsheets. **Open Prompts** turns them into structured **templates** with preview images, tags, models, and visibility (public, private, or draft). Users can:

- Explore community and catalog prompts in a **gallery**
- **Generate** from a template in one click
- **Submit** new public prompts for review, or create **private** templates from the account dashboard
- Sign in with **GitHub**, **Google**, or **email** (admin credentials for operators)

The app is built with **Next.js**, **next-intl** (English, Chinese, Japanese), **NextAuth**, and **Postgres** (e.g. Supabase). Image generation is routed through server APIs with optional **Atlas Cloud** or **Replicate** backends, plus a **test mode** for development without paid API calls.

---

## Main features

| Area | What you get |
|------|----------------|
| **Gallery** | Search and filter templates by model and tags; open detail view and jump to Create with the prompt pre-filled. |
| **Create studio** | Template carousel, prompt editor, aspect ratio / quality / batch controls, provider selection, and session history (browser `localStorage`). |
| **Submit flow** | Single-page wizard to publish prompts to the gallery (public → review queue) or save **private** templates via `?visibility=private`. |
| **Account dashboard** | My templates, admin **review queue** (approve / reject), credits and subscription placeholders. |
| **Auth** | GitHub & Google OAuth; email/password for configured admin users; no public self-registration UI. |
| **Admin moderation** | Review queue over all templates; status and visibility aligned with gallery rules. |
| **X import** | Paste a public tweet URL on Submit to pre-fill title, description, prompt, and images. |
| **i18n** | Locale routes: `/` (en), `/zh`, `/ja` for main pages; shared site header and footer. |
| **Self-host** | Apache 2.0; env-driven providers and database; deploy to Vercel or any Node host. |

**Routes (English defaults)**

| Path | Purpose |
|------|---------|
| `/` | Prompt gallery |
| `/create` | Image generation studio |
| `/submit` | Submit or edit templates (`?edit=<id>`, `?visibility=private`) |
| `/login` | Sign in |
| `/account` | User dashboard & admin review |

---

## Get started (local)

### Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **npm** (or pnpm/yarn)
- **Postgres** database ([Supabase](https://supabase.com) works well)
- Optional: **Atlas Cloud** or **Replicate** API key for real generations

### 1. Clone and install

```bash
git clone https://github.com/rudy2steiner/open-prompts.git
cd open-prompts
npm install
```

### 2. Environment

```bash
cp .env.example .env.local
```

Fill at least:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (Supabase **Session pooler** on port **5432** is recommended for migrations and admin queries) |
| `NEXTAUTH_URL` | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | Same as `NEXTAUTH_URL` for local SEO links |

For sign-in and admin:

| Variable | Purpose |
|----------|---------|
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth app |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client |
| `ADMIN_EMAIL` | Comma-separated admin emails (must match login email exactly) |
| `ADMIN_PASSWORD` | Min 8 characters; synced to DB on boot / admin login |

For image generation (pick one or use test mode):

| Variable | Purpose |
|----------|---------|
| `DEFAULT_IMAGE_PROVIDER` | `atlascloud` or `replicate` |
| `ATLASCLOUD_API_KEY` | [Atlas Cloud](https://www.atlascloud.ai) API key |
| `REPLICATE_API_TOKEN` | [Replicate](https://replicate.com/account/api-tokens) token |
| `USE_TEST_MODE` | `true` to skip real API calls |
| `TEST_IMAGE_URL` | Image URL returned in test mode |

See [`.env.example`](.env.example) for credits limits and optional OpenAI settings.

### 3. Database

Apply migrations (Supabase SQL editor or `psql`), then seed prompts if needed:

```bash
# Optional: push schema via Drizzle
npm run db:push

# Seed gallery prompts from bundled dataset
npm run seed:prompts

# Ensure admin user password in DB (if login fails)
npm run seed:admin
```

Migration SQL also lives under `supabase/migrations/` and `scripts/apply-owner-visibility-migration.sql`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (default port **3000**).

- Gallery: `/`
- Create: `/create`
- Submit: `/submit`
- Login: `/login`
- Account: `/account`

### 5. Production build (optional)

```bash
npm run build
npm run start
```

---

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frudy2steiner%2Fopen-prompts&env=NEXTAUTH_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD&envDescription=Required%20secrets%20(minimum)&project-name=open-prompts)

### 1. Import the project

1. Push this repo to GitHub (or fork it).
2. In [Vercel](https://vercel.com) → **Add New Project** → import the repository.
3. Framework preset: **Next.js** (default). Build command: `npm run build`. Output: default.

### 2. Environment variables

In **Project → Settings → Environment Variables**, set the same keys as `.env.local` for **Production** (and Preview if you use OAuth there).

**Required for a working deploy**

| Variable | Example / notes |
|----------|-----------------|
| `DATABASE_URL` | Supabase pooler URI (port **5432**, user `postgres.<project-ref>`) |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (no trailing slash) |
| `NEXTAUTH_SECRET` | Strong random string |
| `NEXT_PUBLIC_SITE_URL` | Same as `NEXTAUTH_URL` |
| `ADMIN_EMAIL` | Your operator email(s), comma-separated |
| `ADMIN_PASSWORD` | Strong password; run `npm run seed:admin` locally against the same DB if login fails |

**OAuth (recommended)**

| Variable | Callback URL to register |
|----------|-------------------------|
| `GITHUB_ID` / `GITHUB_SECRET` | `https://your-app.vercel.app/api/auth/callback/github` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `https://your-app.vercel.app/api/auth/callback/google` |

**Image generation**

| Variable | Notes |
|----------|--------|
| `DEFAULT_IMAGE_PROVIDER` | `atlascloud` or `replicate` |
| `ATLASCLOUD_API_KEY` or `REPLICATE_API_TOKEN` | At least one for real generations |
| Or `USE_TEST_MODE=true` + `TEST_IMAGE_URL` | Demo without paid APIs |

Redeploy after changing env vars.

### 3. Database on Supabase

1. Create a Supabase project and copy the **Session mode** connection string (port **5432**).
2. Run migrations from `supabase/migrations/` in the SQL editor (in order).
3. From your machine (with `DATABASE_URL` pointing at that DB):

   ```bash
   npm run seed:prompts
   npm run seed:admin
   ```

### 4. Verify

- Open `https://your-app.vercel.app` — gallery should load templates.
- Sign in via GitHub/Google or admin email/password.
- Open `/account` as admin to use the review queue.

**Note:** `instrumentation.ts` bootstraps the admin user on server start when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set. For password resets, use `npm run seed:admin` against production `DATABASE_URL`.

---

## Providers

| Provider | Status | Configuration |
|----------|--------|----------------|
| **Atlas Cloud** | Supported | `ATLASCLOUD_API_KEY`, `ATLASCLOUD_BASE_URL` |
| **Replicate** | Supported | `REPLICATE_API_TOKEN`, `REPLICATE_MODEL` or `REPLICATE_VERSION` |
| **Test mode** | Dev / demo | `USE_TEST_MODE=true`, `TEST_IMAGE_URL` |

On the Create page, users can optionally override the API key in the browser (`localStorage`); prefer server-side keys in production.

---

## Project structure

```
src/app/[locale]/gallery/     # Public gallery
src/app/[locale]/create/      # Generation studio
src/app/[locale]/submit/      # Submit / edit templates
src/app/[locale]/account/     # Dashboard & admin
src/app/api/auth/             # NextAuth (not locale-prefixed)
src/lib/generation/           # Provider adapters
src/lib/prompts/              # Template CRUD & submit parsing
messages/                     # en / zh / ja copy
supabase/migrations/          # SQL migrations
```

---

## Tech stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [next-intl](https://next-intl-docs.vercel.app/) · [NextAuth.js](https://next-auth.js.org/)
- [Drizzle ORM](https://orm.drizzle.team/) + Postgres
- [Tailwind CSS](https://tailwindcss.com/) · [daisyUI](https://daisyui.com/)

---

## Contributing

Issues and pull requests are welcome. For large changes, open an issue first to discuss direction.

---

## Conclusion

**Open Prompts** is meant to be a practical hub for **reusable image prompts**: discover what works in the gallery, generate with your chosen model, and contribute templates back to the community—while keeping private drafts and a moderation path for public listings. Fork it, deploy on Vercel with Supabase, wire your preferred image API, and adapt the workflow to your team under Apache 2.0.

If this project helps your workflow, consider starring the repo and sharing feedback in [GitHub Issues](https://github.com/rudy2steiner/open-prompts/issues).
