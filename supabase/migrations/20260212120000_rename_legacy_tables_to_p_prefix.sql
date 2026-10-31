-- One-time upgrade: older installs used unprefixed table names. No-op if already on p_* names.

DO $$
BEGIN
  IF to_regclass('public.prompts') IS NOT NULL AND to_regclass('public.p_prompts') IS NULL THEN
    ALTER TABLE public.prompts RENAME TO p_prompts;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.verification_tokens') IS NOT NULL AND to_regclass('public.p_verification_tokens') IS NULL THEN
    ALTER TABLE public.verification_tokens RENAME TO p_verification_tokens;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.accounts') IS NOT NULL AND to_regclass('public.p_accounts') IS NULL THEN
    ALTER TABLE public.accounts RENAME TO p_accounts;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL AND to_regclass('public.p_users') IS NULL THEN
    ALTER TABLE public.users RENAME TO p_users;
  END IF;
END $$;
