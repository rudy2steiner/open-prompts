import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { requireAdminSession } from '~/lib/auth/session';
import { listUsers, getAdminUserStats } from '~/lib/users/admin-user-record';
import { normalizeTrendDays } from '~/lib/users/admin-user-trend';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const trendDays = normalizeTrendDays(url.searchParams.get('trendDays'));

  try {
    const result = await listUsers(db, { q, limit, offset });

    let userStats: Awaited<ReturnType<typeof getAdminUserStats>> = {
      totalUsers: 0,
      activeToday: 0,
      newToday: 0,
      trendDays,
      usersDailyTrend: [],
    };
    try {
      userStats = await getAdminUserStats(db, trendDays);
    } catch (statsErr) {
      console.error('[admin/users GET] stats failed', statsErr);
    }

    return NextResponse.json({ ...result, stats: userStats });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'List failed';
    console.error('[admin/users GET]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
