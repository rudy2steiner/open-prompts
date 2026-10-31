export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { bootstrapAdminIfConfigured } = await import('./src/lib/auth/bootstrap-admin');
  await bootstrapAdminIfConfigured();

  if (process.env.NODE_ENV === 'development') {
    const { getOAuthProviderFlags } = await import('./src/lib/auth/oauth-providers');
    const flags = getOAuthProviderFlags();
    if (!flags.github && !flags.google) {
      console.info(
        '[auth] GitHub/Google OAuth disabled — set GITHUB_* and GOOGLE_* in .env.local (see .env.example)',
      );
    }
  }
}
