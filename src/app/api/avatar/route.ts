import { NextRequest, NextResponse } from 'next/server';

/** Legacy proxy — app now uses initials avatars in `UserAvatar`. */
const DICEBEAR_VERSION = '10.x';
const DEFAULT_AVATAR_STYLE = 'glass';
const AVATAR_RENDER_SIZE = 128;

/**
 * Inlined copy of `public/default-user-avatar.svg`. Inlined (rather than read from
 * disk at runtime) because Cloudflare Workers have no runtime filesystem.
 */
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="bg" x1="8" y1="6" x2="72" y2="74" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff7ed"/>
      <stop offset="0.45" stop-color="#fde8c8"/>
      <stop offset="1" stop-color="#f5d0a0"/>
    </linearGradient>
    <linearGradient id="hair" x1="28" y1="18" x2="52" y2="36" gradientUnits="userSpaceOnUse">
      <stop stop-color="#3f3f46"/>
      <stop offset="1" stop-color="#27272a"/>
    </linearGradient>
    <linearGradient id="skin" x1="34" y1="24" x2="46" y2="44" gradientUnits="userSpaceOnUse">
      <stop stop-color="#ffd8bf"/>
      <stop offset="1" stop-color="#f4b892"/>
    </linearGradient>
    <linearGradient id="shirt" x1="18" y1="48" x2="62" y2="72" gradientUnits="userSpaceOnUse">
      <stop stop-color="#c96a1a"/>
      <stop offset="1" stop-color="#a85516"/>
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="40" fill="url(#bg)"/>
  <circle cx="40" cy="40" r="39" stroke="#fff" stroke-width="1.2" opacity="0.55"/>
  <ellipse cx="40" cy="54" rx="22" ry="16" fill="url(#shirt)"/>
  <circle cx="40" cy="31" r="15" fill="url(#skin)"/>
  <path
    d="M25 28c2-8 10-13 15-13s13 5 15 13c-4-3-9-5-15-5s-11 2-15 5z"
    fill="url(#hair)"
  />
  <circle cx="34" cy="31" r="1.6" fill="#3f3f46"/>
  <circle cx="46" cy="31" r="1.6" fill="#3f3f46"/>
  <path d="M36 37c2 2 6 2 8 0" stroke="#c96a1a" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

function localFallback(): NextResponse {
  return new NextResponse(DEFAULT_AVATAR_SVG, {
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
  });
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${DEFAULT_AVATAR_STYLE}/png?${q.toString()}`;
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
