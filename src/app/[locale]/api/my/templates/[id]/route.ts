import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { isAdminEmail, requireAuthSession } from '~/lib/auth/session';
import { parseTemplateBody } from '~/lib/prompts/parse-template-body';
import {
  deleteUserTemplate,
  getTemplateById,
  updateUserTemplate,
} from '~/lib/prompts/template-record';
import { checkXSourceDuplicate } from '~/lib/x-import/x-source-duplicate';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const item = await getTemplateById(db, id);
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = isAdminEmail(session.user.email);
  if (!isAdmin && item.submittedBy !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseTemplateBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const v = parsed.value;
  const isAdmin = isAdminEmail(session.user.email);
  try {
    const duplicate = await checkXSourceDuplicate(db, v.sourceUrl, id);
    if (duplicate) {
      return NextResponse.json({ error: 'duplicate_x_source', duplicate }, { status: 409 });
    }
    const item = await updateUserTemplate(
      db,
      id,
      session.user.id,
      {
        title: v.title,
        description: v.description,
        prompt: v.prompt,
        modelLabel: v.modelLabel,
        tags: v.tags,
        images: v.images,
        visibility: v.visibility,
        sourceUrl: v.sourceUrl,
        authorHandle: v.authorHandle,
      },
      isAdmin,
    );
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Update failed';
    console.error('[my/templates PATCH]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const { id: raw } = await params;
  const id = parseId(raw);
  if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const isAdmin = isAdminEmail(session.user.email);
  const ok = await deleteUserTemplate(db, id, session.user.id, isAdmin);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
