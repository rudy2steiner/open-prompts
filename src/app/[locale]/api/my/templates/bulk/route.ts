import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { requireAuthSession } from '~/lib/auth/session';
import { bulkDeleteUserTemplates } from '~/lib/prompts/template-record';

export const dynamic = 'force-dynamic';

const MAX_BULK = 100;

function parseIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.floor(n));
}

export async function DELETE(req: Request) {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  let body: { ids?: unknown };
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

  try {
    const deleted = await bulkDeleteUserTemplates(db, ids, session.user.id);
    return NextResponse.json({ ok: true, deleted });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bulk delete failed';
    console.error('[my/templates/bulk DELETE]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
