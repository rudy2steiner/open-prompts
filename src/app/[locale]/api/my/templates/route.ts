import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { requireAuthSession } from '~/lib/auth/session';
import { parseTemplateBody } from '~/lib/prompts/parse-template-body';
import {
  insertUserTemplate,
  listTemplates,
  parseReviewStatus,
  parseVisibility,
} from '~/lib/prompts/template-record';
import { checkXSourceDuplicate } from '~/lib/x-import/x-source-duplicate';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? undefined;
  const status = parseReviewStatus(url.searchParams.get('status') ?? '') ?? undefined;
  const visibility = parseVisibility(url.searchParams.get('visibility') ?? '') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  try {
    const result = await listTemplates(db, {
      userId: session.user.id,
      q,
      status,
      visibility,
      limit,
      offset,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'List failed';
    console.error('[my/templates GET]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

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
  try {
    const duplicate = await checkXSourceDuplicate(db, v.sourceUrl);
    if (duplicate) {
      return NextResponse.json({ error: 'duplicate_x_source', duplicate }, { status: 409 });
    }
    const item = await insertUserTemplate(db, session.user.id, {
      title: v.title,
      description: v.description,
      prompt: v.prompt,
      modelLabel: v.modelLabel,
      tags: v.tags,
      images: v.images,
      visibility: v.visibility,
      sourceUrl: v.sourceUrl,
      authorHandle: v.authorHandle,
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Create failed';
    console.error('[my/templates POST]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
