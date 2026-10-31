/** 从原 PostgreSQL 只读导出四张业务表，输出只能放在工作区外。 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { parse } from 'dotenv';
import postgres from 'postgres';
import { createHash } from 'node:crypto';

async function main() {
  const output = process.argv[2];
  if (!output || resolve(output).startsWith(`${process.cwd()}/`)) throw new Error('Pass a private output path outside the worktree');
  const env = parse(await readFile('.env.production'));
  const url = process.env.SOURCE_DATABASE_URL || env.DATABASE_URL;
  if (!url) throw new Error('Source configuration missing');
  const db = postgres(url, { max: 1, prepare: false, connect_timeout: 8 });
  try {
    const snapshot = await db.begin('isolation level repeatable read read only', async tx => {
      await tx`set local statement_timeout = '30s'`;
      const names = ['p_users', 'p_prompts', 'p_accounts', 'p_verification_tokens'];
      const columns = await tx`select table_name,column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name in ${tx(names)} order by table_name,ordinal_position`;
      const tables: Record<string, unknown[]> = {};
      for (const table of names) tables[table] = (await tx`select row_to_json(t) as row from ${tx(table)} t`).map(r => r.row);
      return { exportedAt: new Date().toISOString(), columns, tables };
    });
    await mkdir(dirname(resolve(output)), { recursive: true, mode: 0o700 });
    const content = JSON.stringify(snapshot);
    await writeFile(output, content, { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ exportedAt: snapshot.exportedAt, sha256: createHash('sha256').update(content).digest('hex'), rows: Object.fromEntries(Object.entries(snapshot.tables).map(([table, rows]) => [table, rows.length])) }));
  } finally { await db.end({ timeout: 2 }); }
}
main().catch(() => { console.error('Private source export failed; no credentials or rows logged.'); process.exitCode = 1; });
