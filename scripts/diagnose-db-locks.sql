-- Run in Supabase SQL Editor when you see: 55P03 lock timeout
-- Shows who is blocking p_prompts / p_users.

-- 1) Sessions touching our tables
select
  a.pid,
  a.usename,
  a.application_name,
  a.client_addr,
  a.state,
  a.wait_event_type,
  a.wait_event,
  now() - a.query_start as query_age,
  left(a.query, 120) as query_preview
from pg_stat_activity a
where a.datname = current_database()
  and a.pid <> pg_backend_pid()
  and (
    a.query ilike '%p_prompts%'
    or a.query ilike '%p_users%'
    or a.state in ('active', 'idle in transaction')
  )
order by a.query_start nulls last;

-- 2) Blocking chain (blocked session ← blocking session)
select
  blocked.pid as blocked_pid,
  left(blocked.query, 80) as blocked_query,
  blocking.pid as blocking_pid,
  left(blocking.query, 80) as blocking_query,
  now() - blocking.query_start as blocking_for
from pg_catalog.pg_locks blocked_locks
join pg_catalog.pg_stat_activity blocked
  on blocked.pid = blocked_locks.pid
join pg_catalog.pg_locks blocking_locks
  on blocking_locks.locktype = blocked_locks.locktype
  and blocking_locks.database is not distinct from blocked_locks.database
  and blocking_locks.relation is not distinct from blocked_locks.relation
  and blocking_locks.page is not distinct from blocked_locks.page
  and blocking_locks.tuple is not distinct from blocked_locks.tuple
  and blocking_locks.virtualxid is not distinct from blocked_locks.virtualxid
  and blocking_locks.transactionid is not distinct from blocked_locks.transactionid
  and blocking_locks.classid is not distinct from blocked_locks.classid
  and blocking_locks.objid is not distinct from blocked_locks.objid
  and blocking_locks.objsubid is not distinct from blocked_locks.objsubid
  and blocking_locks.pid <> blocked_locks.pid
join pg_catalog.pg_stat_activity blocking
  on blocking.pid = blocking_locks.pid
where not blocked_locks.granted;

-- 3) Locks on p_prompts specifically
select l.mode, l.granted, a.pid, a.state, left(a.query, 100) as query_preview
from pg_locks l
join pg_stat_activity a on a.pid = l.pid
where l.relation = 'public.p_prompts'::regclass;
