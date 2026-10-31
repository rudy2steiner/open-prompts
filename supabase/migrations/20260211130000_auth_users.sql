-- App users + OAuth linkage (used by NextAuth callbacks + credentials). Tables use p_ prefix.
create table if not exists public.p_users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null unique,
  email_verified timestamptz,
  image text,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.p_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.p_users (id) on delete cascade,
  type text not null default 'oauth',
  provider text not null,
  provider_account_id text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique (provider, provider_account_id)
);

create index if not exists p_accounts_user_id_idx on public.p_accounts (user_id);

create table if not exists public.p_verification_tokens (
  identifier text not null,
  token text not null,
  expires timestamptz not null,
  primary key (identifier, token)
);
