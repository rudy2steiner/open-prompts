import { getServerSession } from 'next-auth';
import { authOptions } from '~/lib/auth/auth-options';

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin || !email) return false;
  return email.toLowerCase().trim() === admin;
}

export async function requireAuthSession() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  return session;
}
