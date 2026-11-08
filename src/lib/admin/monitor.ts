import { getCloudflareContext } from '@opennextjs/cloudflare';

export const ADMIN_PAGE_SIZE = 20;
export type AdminTab = 'users' | 'generations' | 'events';

export type AdminUserRow = {
  ownerId: string;
  email: string | null;
  name: string | null;
  purchasedBalance: number;
  monthlyBalance: number;
  spent: number;
  createdAt: number;
};

export type AdminGenerationRow = {
  id: string;
  email: string | null;
  model: string;
  credits: number;
  status: string;
  createdAt: number;
};

export type AdminEventRow = {
  id: string;
  email: string | null;
  subject: string;
  price: string;
  locale: string;
  page: string;
  createdAt: number;
};

export type AdminSummary = { users: number; spent: number; generations: number; events: number };
export type AdminPage<T> = { items: T[]; page: number; hasNext: boolean };

type D1 = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results?: T[] }>;
      first<T>(): Promise<T | null>;
    };
  };
};

function database(): D1 | null {
  try {
    const binding = (getCloudflareContext().env as { DB?: D1 }).DB;
    return binding ?? null;
  } catch {
    return null;
  }
}

export function normalizeAdminPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function adminTab(value: string | undefined): AdminTab {
  return value === 'generations' || value === 'events' ? value : 'users';
}

function pageResult<T>(rows: T[], page: number): AdminPage<T> {
  return { items: rows.slice(0, ADMIN_PAGE_SIZE), page, hasNext: rows.length > ADMIN_PAGE_SIZE };
}

const emptySummary: AdminSummary = { users: 0, spent: 0, generations: 0, events: 0 };

export async function loadAdminSummary(): Promise<AdminSummary> {
  const db = database();
  if (!db) return emptySummary;
  const row = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM p_users) + (SELECT COUNT(*) FROM p_credit_accounts ca WHERE NOT EXISTS (SELECT 1 FROM p_users u WHERE u.id = ca.owner_id)) AS users,
      (SELECT COALESCE(SUM(CASE WHEN kind = 'reserve' THEN -amount WHEN kind = 'refund' THEN -amount ELSE 0 END), 0) FROM p_credit_transactions) AS spent,
      (SELECT COUNT(*) FROM p_generations) AS generations,
      (SELECT COUNT(*) FROM p_analytics_events WHERE event_name = 'Pricing Plan Click') AS events
  `).bind().first<AdminSummary>();
  return {
    users: Number(row?.users ?? 0),
    spent: Number(row?.spent ?? 0),
    generations: Number(row?.generations ?? 0),
    events: Number(row?.events ?? 0),
  };
}

export async function listAdminUsers(page: number): Promise<AdminPage<AdminUserRow>> {
  const db = database();
  if (!db) return { items: [], page, hasNext: false };
  const { results = [] } = await db.prepare(`
    SELECT owner.owner_id AS ownerId, u.email AS email, u.name AS name,
      COALESCE(ca.purchased_balance, 0) AS purchasedBalance,
      COALESCE(ca.monthly_balance, 0) AS monthlyBalance,
      COALESCE(spent.spent, 0) AS spent,
      owner.created_at AS createdAt
    FROM (
      SELECT id AS owner_id, created_at FROM p_users
      UNION ALL
      SELECT ca.owner_id, ca.created_at FROM p_credit_accounts ca
      WHERE NOT EXISTS (SELECT 1 FROM p_users u WHERE u.id = ca.owner_id)
    ) owner
    LEFT JOIN p_users u ON u.id = owner.owner_id
    LEFT JOIN p_credit_accounts ca ON ca.owner_id = owner.owner_id
    LEFT JOIN (
      SELECT owner_id, SUM(CASE WHEN kind = 'reserve' THEN -amount WHEN kind = 'refund' THEN -amount ELSE 0 END) AS spent
      FROM p_credit_transactions GROUP BY owner_id
    ) spent ON spent.owner_id = owner.owner_id
    ORDER BY owner.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(ADMIN_PAGE_SIZE + 1, (page - 1) * ADMIN_PAGE_SIZE).all<AdminUserRow>();
  return pageResult(results, page);
}

export async function listAdminGenerations(page: number): Promise<AdminPage<AdminGenerationRow>> {
  const db = database();
  if (!db) return { items: [], page, hasNext: false };
  const { results = [] } = await db.prepare(`
    SELECT g.id AS id, u.email AS email, g.model AS model, g.credits AS credits, g.status AS status, g.created_at AS createdAt
    FROM p_generations g
    LEFT JOIN p_users u ON u.id = g.owner_id
    ORDER BY g.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(ADMIN_PAGE_SIZE + 1, (page - 1) * ADMIN_PAGE_SIZE).all<AdminGenerationRow>();
  return pageResult(results, page);
}

export async function listAdminEvents(page: number): Promise<AdminPage<AdminEventRow>> {
  const db = database();
  if (!db) return { items: [], page, hasNext: false };
  const { results = [] } = await db.prepare(`
    SELECT e.id AS id, u.email AS email, e.subject AS subject, e.locale AS locale, e.page AS page, e.created_at AS createdAt,
      COALESCE(json_extract(e.properties_json, '$.price'), '') AS price
    FROM p_analytics_events e
    LEFT JOIN p_users u ON u.id = e.owner_id
    WHERE e.event_name = 'Pricing Plan Click'
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(ADMIN_PAGE_SIZE + 1, (page - 1) * ADMIN_PAGE_SIZE).all<AdminEventRow>();
  return pageResult(results, page);
}
