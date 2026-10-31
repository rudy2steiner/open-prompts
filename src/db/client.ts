import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

export type Db = DrizzleD1Database<typeof schema>;

/** 每个请求复用 D1 binding，不再建立跨区域 PostgreSQL TCP 连接。 */
export function getDb(): Db | null {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;
  try {
    const { env } = getCloudflareContext();
    if ((env as unknown as { DB_MIGRATION_MODE?: string }).DB_MIGRATION_MODE === 'read-only') return null;
    const binding = (env as unknown as { DB?: Parameters<typeof drizzle>[0] }).DB;
    return binding ? drizzle(binding, { schema }) : null;
  } catch {
    // 普通 Node 进程无 binding；开发使用 next dev 的 Cloudflare 代理或 Worker 预览。
    return null;
  }
}
