export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { bootstrapAdminIfConfigured } = await import('./src/lib/auth/bootstrap-admin');
  await bootstrapAdminIfConfigured();
}
