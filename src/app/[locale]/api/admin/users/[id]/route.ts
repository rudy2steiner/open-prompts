import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { requireAdminSession } from '~/lib/auth/session';
import { getUserById } from '~/lib/users/admin-user-record';

export const dynamic = 'force-dynamic';

function parseUserId(raw: string): string | null {
  const id = raw.trim();
  if (!id || id.length > 64) return null;
  return id;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id: raw } = await params;
  const id = parseUserId(raw);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const item = await getUserById(db, id);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Load failed';
    console.error('[admin/users GET id]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
