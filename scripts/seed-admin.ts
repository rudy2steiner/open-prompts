/**
 * Upsert admin user for credentials login (D1 + ADMIN_EMAIL + ADMIN_PASSWORD，--remote 操作正式库).
 * Usage: npm run seed:admin
 */
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { openScriptDb } from './d1/client';
import * as schema from '../src/db/schema';
import { getAdminEmails } from '../src/lib/auth/session';

config({ path: '.env.local' });
config({ path: '.env' });

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}


const emails = getAdminEmails();
if (emails.length === 0) fail('ADMIN_EMAIL is required');

const password = process.env.ADMIN_PASSWORD ?? '';
if (password.length < 8) fail('ADMIN_PASSWORD is required (min 8 characters)');

const name = process.env.ADMIN_NAME?.trim() || 'Admin';


async function main() {
  const client = await openScriptDb();
  const db = client.db;
  try {
  const passwordHash = await bcrypt.hash(password, 12);

  for (const email of emails) {
    const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

    if (existing) {
      await db
        .update(schema.users)
        .set({
          name,
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.email, email));
      console.log(`Updated admin user: ${email}`);
    } else {
      await db.insert(schema.users).values({
        email,
        name,
        passwordHash,
        emailVerified: new Date(),
      });
      console.log(`Created admin user: ${email}`);
    }
  }

  } finally { await client.dispose(); }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
