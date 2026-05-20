-- Owner + visibility migration (no foreign key on submitted_by)
--
-- BEFORE YOU RUN:
--   1. Stop `npm run dev` (stops count(*) on p_prompts that blocks ALTER)
--   2. Direct connection port 5432, not pooler 6543
--   3. Run ONE block at a time
--
-- If you already added p_prompts_submitted_by_fkey earlier, BLOCK 3 removes it.

set statement_timeout = '300s';
set lock_timeout = '180s';

-- ========== BLOCK 1 — columns ==========
alter table public.p_prompts
  add column if not exists submitted_by uuid;

alter table public.p_prompts
  add column if not exists visibility text;

-- ========== BLOCK 2 — backfill + default (+ NOT NULL; stop dev first) ==========
update public.p_prompts
set visibility = 'public'
where visibility is null;

alter table public.p_prompts
  alter column visibility set default 'public';

alter table public.p_prompts
  alter column visibility set not null;

-- ========== BLOCK 3 — remove FK if present (skip adding any FK) ==========
alter table public.p_prompts
  drop constraint if exists p_prompts_submitted_by_fkey;

-- ========== BLOCK 4 — check + indexes ==========
alter table public.p_prompts
  drop constraint if exists p_prompts_visibility_chk;

alter table public.p_prompts
  add constraint p_prompts_visibility_chk
  check (visibility in ('draft', 'private', 'public'));

create index if not exists p_prompts_submitted_by_idx on public.p_prompts (submitted_by);
create index if not exists p_prompts_visibility_idx on public.p_prompts (visibility);

-- ========== BLOCK 5 — RLS ==========
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

-- ========== Verify ==========
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'p_prompts'
  and column_name in ('submitted_by', 'visibility', 'status');

select conname
from pg_constraint
where conrelid = 'public.p_prompts'::regclass
  and conname like '%submitted_by%';
