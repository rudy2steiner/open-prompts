import { and, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '~/db/client';
import { accounts, prompts, users } from '~/db/schema';
import { getAdminEmails } from '~/lib/auth/session';
import { startOfUtcDay } from '~/lib/users/touch-user-activity';
import {
  type AdminDailyTrendPoint,
  type AdminUserTrendRange,
  type DailyCountPoint,
  normalizeTrendDays,
} from '~/lib/users/admin-user-trend';

export type { AdminDailyTrendPoint, AdminUserTrendRange, DailyCountPoint };
export { normalizeTrendDays, ADMIN_USER_TREND_RANGES, ADMIN_USER_TREND_DAYS_MAX } from '~/lib/users/admin-user-trend';

export type AdminUserStats = {
  totalUsers: number;
  activeToday: number;
  newToday: number;
  trendDays: number;
  usersDailyTrend: DailyCountPoint[];
};

export type AdminUserSummary = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
  isEnvAdmin: boolean;
  providers: string[];
};

export type AdminUserDetail = AdminUserSummary & {
  templateCount: number;
};

function isEnvAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return getAdminEmails().includes(normalized);
}

function rowToSummary(row: typeof users.$inferSelect): Omit<AdminUserSummary, 'providers'> {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    image: row.image,
    createdAt: row.createdAt.toISOString(),
    isEnvAdmin: isEnvAdminEmail(row.email),
  };
}

export type ListUsersOpts = {
  q?: string;
  limit?: number;
  offset?: number;
};

export async function listUsers(db: Db, opts: ListUsersOpts) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  const conditions: SQL[] = [];
  if (opts.q?.trim()) {
    const pattern = `%${opts.q.trim().replace(/%/g, '\\%')}%`;
    conditions.push(or(ilike(users.email, pattern), ilike(users.name, pattern)) as SQL);
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db.select({ n: count() }).from(users).where(where);
  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = rows.map((r) => r.id);
  const providersByUser = new Map<string, string[]>();
  if (userIds.length) {
    const accountRows = await db
      .select({ userId: accounts.userId, provider: accounts.provider })
      .from(accounts)
      .where(inArray(accounts.userId, userIds));
    for (const ar of accountRows) {
      const list = providersByUser.get(ar.userId) ?? [];
      if (!list.includes(ar.provider)) list.push(ar.provider);
      providersByUser.set(ar.userId, list);
    }
  }

  const items = rows.map((row) => ({
    ...rowToSummary(row),
    providers: providersByUser.get(row.id) ?? [],
  }));
  const total = Number(totalRow?.n ?? 0);

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  };
}

export async function getUserById(db: Db, id: string): Promise<AdminUserDetail | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) return null;

  const providerRows = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(eq(accounts.userId, id));

  const providers = Array.from(new Set(providerRows.map((r) => r.provider)));

  const [templateRow] = await db
    .select({ n: count() })
    .from(prompts)
    .where(eq(prompts.submittedBy, id));

  return {
    ...rowToSummary(row),
    providers,
    templateCount: Number(templateRow?.n ?? 0),
  };
}

export async function countTemplatesByUser(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(prompts)
    .where(eq(prompts.submittedBy, userId));
  return Number(row?.n ?? 0);
}

/** Platform-wide user counts for admin monitor (UTC calendar day). */
export async function getAdminUserStats(
  db: Db,
  trendDays: AdminUserTrendRange = 30,
): Promise<AdminUserStats> {
  const dayStart = startOfUtcDay();

  const [totalRow, activeToday, newRow, usersDailyTrend] = await Promise.all([
    db.select({ n: count() }).from(users),
    countActiveToday(db, dayStart),
    db
      .select({ n: count() })
      .from(users)
      .where(gte(users.createdAt, dayStart)),
    getUserDailyTrend(db, trendDays),
  ]);

  return {
    totalUsers: Number(totalRow[0]?.n ?? 0),
    activeToday,
    newToday: Number(newRow[0]?.n ?? 0),
    trendDays,
    usersDailyTrend,
  };
}

async function countActiveToday(db: Db, dayStart: Date): Promise<number> {
  try {
    const [activeRow] = await db
      .select({ n: count() })
      .from(users)
      .where(gte(users.lastActiveAt, dayStart));
    return Number(activeRow?.n ?? 0);
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[getAdminUserStats] activeToday query failed', e);
    }
    return 0;
  }
}

function utcDateStrings(days: number): string[] {
  const start = startOfUtcDay();
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const utcDayExprUsers = sql<string>`to_char(${users.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
const utcDayExprPrompts = sql<string>`to_char(${prompts.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;

async function getUserDailyTrend(db: Db, days: number): Promise<DailyCountPoint[]> {
  const dates = utcDateStrings(days);
  const rangeStart = new Date(`${dates[0]}T00:00:00.000Z`);

  const userRows = await db
    .select({ day: utcDayExprUsers, n: count() })
    .from(users)
    .where(gte(users.createdAt, rangeStart))
    .groupBy(utcDayExprUsers);

  const userMap = new Map(userRows.map((r) => [r.day, Number(r.n)]));

  return dates.map((date) => ({
    date,
    count: userMap.get(date) ?? 0,
  }));
}

/** Daily new prompt counts for moderation panel (UTC calendar days). */
export async function getPromptDailyTrend(db: Db, days: number): Promise<DailyCountPoint[]> {
  const dates = utcDateStrings(days);
  const rangeStart = new Date(`${dates[0]}T00:00:00.000Z`);

  const promptRows = await db
    .select({ day: utcDayExprPrompts, n: count() })
    .from(prompts)
    .where(gte(prompts.createdAt, rangeStart))
    .groupBy(utcDayExprPrompts);

  const promptMap = new Map(promptRows.map((r) => [r.day, Number(r.n)]));

  return dates.map((date) => ({
    date,
    count: promptMap.get(date) ?? 0,
  }));
}
