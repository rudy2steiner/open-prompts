import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as schema from '../../src/db/schema';

/** 默认只操作本地库；远程写入必须显式传 --remote。 */
export async function openScriptDb(remote = process.argv.includes('--remote')) {
  const directory = await mkdtemp(join(tmpdir(), 'open-prompts-d1-'));
  const configPath = join(directory, 'wrangler.json');
  // 数据工具只绑定 D1，不依赖构建产物，也不加载应用 secrets。
  await writeFile(configPath, JSON.stringify({ name: 'open-prompts-migration', compatibility_date: '2025-03-01',
    d1_databases: [{ binding: 'DB', database_name: 'open-prompts', database_id: '97a63f9c-b95c-4597-952c-0235b1425fde', remote }],
  }));
  const proxy = await getPlatformProxy<{ DB: Parameters<typeof drizzle>[0] }>({
    configPath, remoteBindings: remote, envFiles: [], persist: { path: resolve('.wrangler/state/v3') },
  });
  return { binding: proxy.env.DB, db: drizzle(proxy.env.DB, { schema }), async dispose() {
    await proxy.dispose();
    if (directory) await rm(directory, { recursive: true, force: true });
  } };
}
