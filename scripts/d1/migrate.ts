/** 私有快照迁移：npx tsx scripts/d1/migrate.ts <snapshot.json> [--remote] [--replace] [--verify-only] */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { openScriptDb } from './client';

const TABLES = ['p_users', 'p_prompts', 'p_accounts', 'p_verification_tokens'] as const;
type Column = { table_name: string; column_name: string; data_type: string };
type Snapshot = { columns: Column[]; tables: Record<string, Record<string, unknown>[]> };
function value(input: unknown, type: string): string | number | null {
  if (input === null || input === undefined) return null;
  if (type === 'ARRAY') return JSON.stringify(input);
  if (type.startsWith('timestamp')) {
    const millis = Date.parse(String(input));
    if (!Number.isFinite(millis)) throw new Error('Invalid source timestamp');
    return millis;
  }
  if (type === 'bigint' || type === 'integer') {
    const n = Number(input);
    if (!Number.isSafeInteger(n)) throw new Error('Unsafe integer in source');
    return n;
  }
  return String(input);
}
const quote = (id: string) => {
  if (!/^[a-z_]+$/.test(id)) throw new Error('Invalid SQL identifier');
  return `"${id}"`;
};
const digest = (rows: unknown[][]) => createHash('sha256').update(rows.map(row => JSON.stringify(row)).sort().join('\n')).digest('hex');

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) throw new Error('Pass a private snapshot JSON path');
  const snapshot = JSON.parse(await readFile(file, 'utf8')) as Snapshot;
  for (const table of TABLES) if (!Array.isArray(snapshot.tables[table])) throw new Error(`Missing ${table}`);
  const client = await openScriptDb();
  const binding = client.binding;
  try {
    if (!process.argv.includes('--verify-only')) {
      const counts = await Promise.all(TABLES.map(table => binding.prepare(`SELECT COUNT(*) AS n FROM ${quote(table)}`).first('n')));
      if (counts.some(n => Number(n) > 0)) {
        if (!process.argv.includes('--replace')) throw new Error('Target is not empty; use --replace only after freezing writes');
        await binding.batch(['p_accounts', 'p_verification_tokens', 'p_prompts', 'p_users'].map(table => binding.prepare(`DELETE FROM ${quote(table)}`)));
      }
      for (const table of TABLES) {
        const columns = snapshot.columns.filter(c => c.table_name === table);
        const statement = `INSERT INTO ${quote(table)} (${columns.map(c => quote(c.column_name)).join(',')}) VALUES (${columns.map(() => '?').join(',')})`;
        const rows = snapshot.tables[table];
        for (let offset = 0; offset < rows.length; offset += 25) {
          await binding.batch(rows.slice(offset, offset + 25).map(row => binding.prepare(statement).bind(...columns.map(c => value(row[c.column_name], c.data_type)))));
        }
        console.log(`${table}: imported ${rows.length}`);
      }
    }
    const report: { table: string; rows: number; sha256: string }[] = [];
    for (const table of TABLES) {
      const columns = snapshot.columns.filter(c => c.table_name === table);
      const expected = snapshot.tables[table].map(row => columns.map(c => value(row[c.column_name], c.data_type)));
      const result = await binding.prepare(`SELECT ${columns.map(c => quote(c.column_name)).join(',')} FROM ${quote(table)}`).all();
      const actual = result.results.map((row: Record<string, unknown>) => columns.map(c => row[c.column_name]));
      const sourceHash = digest(expected), targetHash = digest(actual);
      if (actual.length !== expected.length || sourceHash !== targetHash) throw new Error(`Data mismatch: ${table}`);
      report.push({ table, rows: actual.length, sha256: targetHash });
    }
    const foreignKeys = await binding.prepare('PRAGMA foreign_key_check').all();
    if (foreignKeys.results.length) throw new Error('Foreign key integrity failure');
    await writeFile(`${file}.${process.argv.includes('--remote') ? 'remote' : 'local'}-verification.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), tables: report }, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ verified: true, tables: report }));
  } finally { await client.dispose(); }
}
main().catch(error => {
  // 驱动错误可能包含绑定的凭据，终端只报告阶段失败，不输出原始异常对象。
  console.error(error instanceof Error && /^(Data mismatch|Missing |Target |Pass |Foreign key)/.test(error.message) ? error.message : 'D1 migration failed; inspect connectivity/schema without logging private row values.');
  process.exitCode = 1;
});
