-- Owner + visibility on p_prompts (no foreign key on submitted_by).
-- Run block-by-block via scripts/apply-owner-visibility-migration.sql if the dashboard times out.

-- BLOCK 1: columns
alter table public.p_prompts
  add column if not exists submitted_by uuid;

alter table public.p_prompts
  add column if not exists visibility text;

-- BLOCK 2: backfill + default (+ optional NOT NULL)
update public.p_prompts
set visibility = 'public'
where visibility is null;

alter table public.p_prompts
  alter column visibility set default 'public';

alter table public.p_prompts
  alter column visibility set not null;

-- BLOCK 3: drop FK if an older script added one (safe no-op otherwise)
alter table public.p_prompts
  drop constraint if exists p_prompts_submitted_by_fkey;

-- BLOCK 4: check + indexes
alter table public.p_prompts
  drop constraint if exists p_prompts_visibility_chk;

alter table public.p_prompts
  add constraint p_prompts_visibility_chk
  check (visibility in ('draft', 'private', 'public'));

create index if not exists p_prompts_submitted_by_idx on public.p_prompts (submitted_by);
create index if not exists p_prompts_visibility_idx on public.p_prompts (visibility);

comment on column public.p_prompts.submitted_by is 'Owner user id (logical ref to p_users.id; no FK).';
comment on column public.p_prompts.visibility is 'draft | private | public (gallery when approved).';

-- BLOCK 5: RLS
drop policy if exists "p_prompts_select_public" on public.p_prompts;
drop policy if exists "p_prompts_select_approved" on public.p_prompts;

create policy "p_prompts_select_approved"
  on public.p_prompts
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and (submitted_by is null or visibility = 'public')
  );
