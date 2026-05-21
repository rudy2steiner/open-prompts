import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { users } from '~/db/schema';
import { getAdminEmails } from '~/lib/auth/session';

/**
 * Creates the credentials admin user once if `ADMIN_EMAIL` + `ADMIN_PASSWORD` are set
 * and no row exists for that email. Does not overwrite an existing user (use `npm run seed:admin`).
 */
export async function bootstrapAdminIfConfigured(): Promise<void> {
  const emails = getAdminEmails();
  const password = process.env.ADMIN_PASSWORD;
  if (emails.length === 0 || !password) return;
  if (password.length < 8) {
    console.warn('[bootstrap-admin] ADMIN_PASSWORD must be at least 8 characters; skipped.');
    return;
  }

  const db = getDb();
  if (!db) {
    console.warn('[bootstrap-admin] DATABASE_URL not set; skipped.');
    return;
  }

  const name = process.env.ADMIN_NAME?.trim() || 'Admin';
  const passwordHash = await bcrypt.hash(password, 12);

  for (const email of emails) {
    const [existing] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      if (existing.passwordHash) continue;
      await db
        .update(users)
        .set({ name, passwordHash, emailVerified: new Date(), updatedAt: new Date() })
        .where(eq(users.email, email));
      console.info('[bootstrap-admin] Set password for existing user without credentials:', email);
      continue;
    }

    await db.insert(users).values({
      email,
      name,
      passwordHash,
      emailVerified: new Date(),
    });
    console.info('[bootstrap-admin] Created admin user:', email);
  }
}
