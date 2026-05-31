import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '~/lib/auth/auth-options';
import { touchUserActivity } from '~/lib/users/touch-user-activity';

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

/** Matches account page and JWT `session.user.isAdmin` semantics. */
export function isSessionAdmin(session: Session | null | undefined): boolean {
  if (!session?.user) return false;
  const email = session.user.email ?? '';
  return Boolean(session.user.isAdmin) || isAdminEmail(email);
}

export async function requireAdminSession() {
  const session = await requireAuthSession();
  if (!session || !isSessionAdmin(session)) return null;
  return session;
}

export async function requireAuthSession() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  void touchUserActivity(userId);
  return session;
}
