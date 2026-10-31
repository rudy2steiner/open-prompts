import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { requireAdminSession } from '~/lib/auth/session';
import {
  countPendingReview,
  listTemplatesForAdmin,
  parseReviewStatus,
  parseVisibility,
} from '~/lib/prompts/template-record';
import { getPromptDailyTrend } from '~/lib/users/admin-user-record';
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
  const status = parseReviewStatus(url.searchParams.get('status') ?? '') ?? undefined;
  const visibility = parseVisibility(url.searchParams.get('visibility') ?? '') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const trendDays = normalizeTrendDays(url.searchParams.get('trendDays'));

  try {
    const [result, pendingCount] = await Promise.all([
      listTemplatesForAdmin(db, { q, status, visibility, limit, offset }),
      countPendingReview(db),
    ]);
    let promptsDailyTrend: Awaited<ReturnType<typeof getPromptDailyTrend>> = [];
    try {
      promptsDailyTrend = await getPromptDailyTrend(db, trendDays);
    } catch (trendErr) {
      console.error('[admin/templates GET:trend]', trendErr);
    }
    return NextResponse.json({ ...result, pendingCount, trendDays, promptsDailyTrend });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'List failed';
    console.error('[admin/templates GET]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
