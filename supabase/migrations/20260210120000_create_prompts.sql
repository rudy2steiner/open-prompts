-- Prompt catalog (matches PromptGalleryItem in src/data/promptGallery.ts)
-- id = bigint surrogate PK (efficient joins / storage); slug = stable string id for URLs (?template=…).
-- Table name uses p_ prefix (project convention).
create table if not exists public.p_prompts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  description text not null default '',
  prompt text not null default '',
  template_id text,
  model text not null default 'GPT Image 2',
  tags text[] not null default '{}',
  source_url text,
  author_handle text,
  images text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists p_prompts_model_idx on public.p_prompts (model);
create index if not exists p_prompts_sort_idx on public.p_prompts (sort_order, created_at);
create index if not exists p_prompts_tags_gin on public.p_prompts using gin (tags);

alter table public.p_prompts enable row level security;

create policy "p_prompts_select_public"
  on public.p_prompts
  for select
  to anon, authenticated
  using (true);

-- Writes: service role / dashboard / seed
--
-- Upgrade note: if `p_prompts` already existed with `id text`, drop it or migrate manually
-- before applying this version (identity PK cannot be merged from old text PK in-place trivially).
