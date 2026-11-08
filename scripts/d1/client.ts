import { getPlatformProxy } from 'wrangler';
import { drizzle } from 'drizzle-orm/d1';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as schema from '../../src/db/schema';

type D1ScriptEnvironment = {
  D1_DATABASE_ID?: string;
  D1_DATABASE_NAME?: string;
  [key: string]: string | undefined;
};

export function scriptD1Config(remote: boolean, environment: D1ScriptEnvironment = process.env) {
  const databaseId = environment.D1_DATABASE_ID?.trim();
  if (remote && !databaseId) {
    throw new Error('Remote D1 access requires D1_DATABASE_ID in the private environment.');
  }
  return {
    binding: 'DB',
    database_name: environment.D1_DATABASE_NAME?.trim() || 'open-prompts',
    database_id: databaseId || 'local',
    remote,
  };
}

export function d1EnvironmentFromWrangler(source: string): D1ScriptEnvironment {
  const config = JSON.parse(source.replace(/^\s*\/\/.*$/gm, '')) as {
    d1_databases?: Array<{ binding?: string; database_id?: string; database_name?: string }>;
  };
  const binding = config.d1_databases?.find(item => item.binding === 'DB');
  return {
    D1_DATABASE_ID: binding?.database_id,
    D1_DATABASE_NAME: binding?.database_name,
  };
}

async function localD1Environment(): Promise<D1ScriptEnvironment> {
  try {
    return d1EnvironmentFromWrangler(await readFile('wrangler.jsonc', 'utf8'));
  } catch {
    return {};
  }
}

/** 默认只操作本地库；远程写入必须显式传 --remote。 */
export async function openScriptDb(remote = process.argv.includes('--remote')) {
  const directory = await mkdtemp(join(tmpdir(), 'open-prompts-d1-'));
  const configPath = join(directory, 'wrangler.json');
  // 数据工具只绑定 D1，不依赖构建产物，也不加载应用 secrets。
  const environment = remote ? process.env : { ...await localD1Environment(), ...process.env };
  await writeFile(configPath, JSON.stringify({ name: 'open-prompts-migration', compatibility_date: '2025-03-01',
    d1_databases: [scriptD1Config(remote, environment)],
  }));
  const proxy = await getPlatformProxy<{ DB: Parameters<typeof drizzle>[0] }>({
    configPath, remoteBindings: remote, envFiles: [], persist: { path: resolve('.wrangler/state/v3') },
  });
  return { binding: proxy.env.DB, db: drizzle(proxy.env.DB, { schema }), async dispose() {
    await proxy.dispose();
    if (directory) await rm(directory, { recursive: true, force: true });
  } };
}
