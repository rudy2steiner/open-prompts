import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  AVATAR_BACKGROUNDS,
  AVATAR_RENDER_SIZE,
  DEFAULT_AVATAR_STYLE,
  DICEBEAR_VERSION,
} from '~/lib/auth/default-user-avatar';

async function localFallback(): Promise<NextResponse> {
  const filePath = path.join(process.cwd(), 'public', 'default-user-avatar.svg');
  const svg = await readFile(filePath, 'utf8');
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

function dicebearUpstreamUrl(seed: string): string {
  const q = new URLSearchParams({
    seed,
    size: String(AVATAR_RENDER_SIZE),
    radius: '50',
  });
  // DiceBear expects comma-separated hex list — URLSearchParams encodes commas and breaks validation.
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${DEFAULT_AVATAR_STYLE}/png?${q.toString()}&backgroundColor=${AVATAR_BACKGROUNDS}`;
}

export async function GET(req: NextRequest) {
  const seed = req.nextUrl.searchParams.get('seed')?.trim() || 'guest';

  try {
    const res = await fetch(dicebearUpstreamUrl(seed), { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!res.ok) return localFallback();
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return localFallback();
  }
}
