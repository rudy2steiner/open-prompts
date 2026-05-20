-- Fallback if BLOCK 2 `SET NOT NULL` keeps hitting lock timeout.
-- Leaves visibility nullable in DB; app treats null as 'public'.
-- Run BLOCK 1 from apply-owner-visibility-migration.sql first, then ONLY this file for step 2+.

set statement_timeout = '300s';
set lock_timeout = '180s';

update public.p_prompts
set visibility = 'public'
where visibility is null;

alter table public.p_prompts
  alter column visibility set default 'public';

-- Skip: alter column visibility set not null;

-- Then run BLOCK 3–5 from apply-owner-visibility-migration.sql
