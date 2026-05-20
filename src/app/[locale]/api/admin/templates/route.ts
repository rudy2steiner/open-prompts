import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { isAdminEmail, requireAuthSession } from '~/lib/auth/session';
import {
  countPendingReview,
  listTemplatesForAdmin,
  parseReviewStatus,
  parseVisibility,
  type AdminListScope,
} from '~/lib/prompts/template-record';

function parseAdminScope(raw: string | null): AdminListScope {
  return raw === 'all' ? 'all' : 'user';
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? undefined;
  const status = parseReviewStatus(url.searchParams.get('status') ?? '') ?? undefined;
  const visibility = parseVisibility(url.searchParams.get('visibility') ?? '') ?? undefined;
  const scope = parseAdminScope(url.searchParams.get('scope'));
  const limit = Number(url.searchParams.get('limit') ?? 50);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  try {
    const [result, pendingCount] = await Promise.all([
      listTemplatesForAdmin(db, { q, status, visibility, scope, limit, offset }),
      countPendingReview(db),
    ]);
    return NextResponse.json({ ...result, pendingCount });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'List failed';
    console.error('[admin/templates GET]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
