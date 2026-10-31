import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { getAuthSession } from '~/lib/auth/session';
import { getPromptGallery } from '~/lib/prompts/get-prompt-gallery';
import { insertSubmittedPrompt, parseSubmitPromptBody } from '~/lib/prompts/submit-prompt';
import { checkXSourceDuplicate } from '~/lib/x-import/x-source-duplicate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prompts = await getPromptGallery();
    return NextResponse.json({ prompts, source: 'ok' });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseSubmitPromptBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const session = await getAuthSession();
    if (parsed.value.visibility === 'private' && !session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required for private templates' }, { status: 401 });
    }
    const duplicate = await checkXSourceDuplicate(db, parsed.value.sourceUrl);
    if (duplicate) {
      return NextResponse.json({ error: 'duplicate_x_source', duplicate }, { status: 409 });
    }
    const row = await insertSubmittedPrompt(db, parsed.value, session?.user?.id ?? null);
    return NextResponse.json({ ok: true, id: row.id, slug: row.slug });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Insert failed';
    console.error('[prompts POST]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
