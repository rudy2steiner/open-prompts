import { sql, type SQLWrapper } from 'drizzle-orm';

/** SQLite LIKE 不默认识别反斜杠转义；显式转义保留搜索中的字面量 %。 */
export function ilike(column: SQLWrapper, pattern: string) {
  return sql`lower(${column}) like lower(${pattern}) escape ${String.fromCharCode(92)}`;
}
export function isUniqueConstraintError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const e = current as { message?: string; code?: string; cause?: unknown };
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/i.test(e.message ?? '')) return true;
    current = e.cause;
  }
  return false;
}
