import { NextResponse } from 'next/server';
import { getDb } from '~/db/client';
import { parseXStatusUrl } from '~/lib/x-import/parse-x-status-url';
import { findPromptByXStatusUrl } from '~/lib/x-import/x-source-duplicate';

export const dynamic = 'force-dynamic';

function parseExcludeId(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export async function GET(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  const url = new URL(req.url);
  const raw = url.searchParams.get('url')?.trim() ?? '';
  if (!raw) return NextResponse.json({ duplicate: null });

  if (!parseXStatusUrl(raw)) {
    return NextResponse.json({ duplicate: null, invalid: true });
  }

  const excludeId = parseExcludeId(url.searchParams.get('excludeId'));
  const duplicate = await findPromptByXStatusUrl(db, raw, { excludeId });
  return NextResponse.json({ duplicate });
}
