import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  postgresSql?: postgres.Sql;
  drizzleDb?: Db;
};

/**
 * Server-side Postgres via `DATABASE_URL` (Supabase pooler or direct).
 * `prepare: false` works with Supabase transaction pooler (port 6543).
 */
export function getDb(): Db | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;

  if (!globalForDb.postgresSql) {
    globalForDb.postgresSql = postgres(url, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
    });
  }
  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = drizzle(globalForDb.postgresSql, { schema });
  }
  return globalForDb.drizzleDb;
}
