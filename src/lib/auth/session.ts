import { getServerSession } from 'next-auth';
import { authOptions } from '~/lib/auth/auth-options';

export async function getAuthSession() {
  return getServerSession(authOptions);
}

/** Comma- or semicolon-separated list from `ADMIN_EMAIL`. */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL?.trim();
  if (!raw) return [];
  return raw
    .split(/[,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(normalized);
}

export async function requireAuthSession() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  return session;
}
