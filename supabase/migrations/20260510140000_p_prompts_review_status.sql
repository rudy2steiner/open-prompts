-- Moderation / review workflow for prompt submissions.
-- Default `approved` keeps existing catalog rows visible without a backfill step.

alter table public.p_prompts
  add column if not exists status text not null default 'approved';

alter table public.p_prompts
  drop constraint if exists p_prompts_status_chk;

alter table public.p_prompts
  add constraint p_prompts_status_chk
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists p_prompts_status_idx on public.p_prompts (status);

comment on column public.p_prompts.status is 'Review state: pending (awaiting moderation), approved (visible in gallery), rejected.';

-- Public reads: approved catalog only (moderation queue not exposed to anon/authenticated).
drop policy if exists "p_prompts_select_public" on public.p_prompts;

create policy "p_prompts_select_approved"
  on public.p_prompts
  for select
  to anon, authenticated
  using (status = 'approved');
