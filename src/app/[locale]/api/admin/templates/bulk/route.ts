import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { requireAdminSession } from '~/lib/auth/session';
import { adminBulkSetReviewStatus, parseReviewStatus } from '~/lib/prompts/template-record';

export const dynamic = 'force-dynamic';

const MAX_BULK = 100;

function parseIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.floor(n));
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  let body: { ids?: unknown; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids = parseIds(body.ids);
  if (!ids.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
  if (ids.length > MAX_BULK) {
    return NextResponse.json({ error: `At most ${MAX_BULK} ids per request` }, { status: 400 });
  }

  const status = parseReviewStatus(body.status);
  if (!status || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 });
  }

  try {
    const updated = await adminBulkSetReviewStatus(db, ids, status);
    return NextResponse.json({ ok: true, updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bulk update failed';
    console.error('[admin/templates/bulk PATCH]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
