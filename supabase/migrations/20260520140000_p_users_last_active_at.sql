-- Track last authenticated activity for admin DAU metrics (UTC calendar day).
alter table p_users
  add column if not exists last_active_at timestamptz;

create index if not exists p_users_last_active_at_idx on p_users (last_active_at desc);
