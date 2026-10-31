import { and, eq, isNull, lt, or } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { users } from '~/db/schema';

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Mark user active for today (at most one write per UTC day). */
export async function touchUserActivity(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const dayStart = startOfUtcDay();
  try {
    await db
      .update(users)
      .set({ lastActiveAt: new Date() })
      .where(
        and(
          eq(users.id, userId),
          or(isNull(users.lastActiveAt), lt(users.lastActiveAt, dayStart)),
        ),
      );
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[touchUserActivity]', e);
    }
  }
}

export { startOfUtcDay };
