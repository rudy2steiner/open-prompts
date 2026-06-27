import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { cache } from 'react';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Server-side Postgres via `DATABASE_URL` (Supabase pooler or direct).
 * `prepare: false` works with the Supabase transaction pooler.
 *
 * Per-request, NOT a global singleton: on Cloudflare Workers a TCP connection opened
 * while handling one request must not be reused by another request — doing so stalls
 * the runtime (observed as multi-second hangs). React `cache()` gives us one client per
 * request (deduped across the multiple `getDb()` calls within a request) while ensuring
 * a fresh connection for each new request.
 */
export const getDb = cache((): Db | null => {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;

  const sql = postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });
  return drizzle(sql, { schema });
});
