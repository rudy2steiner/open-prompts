import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import path from 'path';

// drizzle-kit does not load .env.local automatically
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  throw new Error(
    'DATABASE_URL is empty. Set it in .env.local (Supabase pooler or direct Postgres URL), or export DATABASE_URL before running drizzle-kit.'
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
  strict: true,
});
