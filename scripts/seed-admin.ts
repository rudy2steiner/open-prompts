/**
 * Upsert admin user for credentials login (needs DATABASE_URL + ADMIN_EMAIL + ADMIN_PASSWORD).
 * Usage: npm run seed:admin
 */
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';

config({ path: '.env.local' });
config({ path: '.env' });

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const url = process.env.DATABASE_URL?.trim();
if (!url) fail('DATABASE_URL is required');

const rawEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!rawEmail) fail('ADMIN_EMAIL is required');
const email = rawEmail;

const password = process.env.ADMIN_PASSWORD ?? '';
if (password.length < 8) fail('ADMIN_PASSWORD is required (min 8 characters)');

const name = process.env.ADMIN_NAME?.trim() || 'Admin';

const sql = postgres(url, { max: 1, prepare: false });
const db = drizzle(sql, { schema });

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
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
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
